#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import json
import math
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple
from urllib import error as urlerror
from urllib import request

try:
    import numpy as np
    import xarray as xr
except ImportError as exc:  # pragma: no cover - runtime guard
    raise SystemExit(
        "Missing python dependencies. Install: pip install copernicusmarine xarray netCDF4 numpy"
    ) from exc


STATION_ID = "constanta_marine"
SOURCE_LABEL = "Copernicus Marine"

LAT = 44.17
LON = 28.65
MIN_LAT = 43.7
MAX_LAT = 45.25
MIN_LON = 28.45
MAX_LON = 30.15
# Data extraction point can be slightly offshore to avoid coastal land-mask nulls.
# Marker/UI location remains Constanta (44.17, 28.65).
DATA_LAT = 44.12
DATA_LON = 28.78

# Copernicus Toolbox needs concrete dataset IDs (cmems_mod_*), not product IDs.
TEMP_DATASET_ID = "cmems_mod_blk_phy-temp_anfc_2.5km_PT1H-m"
CURRENT_DATASET_ID = "cmems_mod_blk_phy-cur_anfc_2.5km_PT1H-m"
SALINITY_DATASET_ID = "cmems_mod_blk_phy-sal_anfc_2.5km_PT1H-m"
WAVE_DATASET_ID = "cmems_mod_blk_wav_anfc_2.5km_PT1H-i"

TEMP_VARIABLES = ["thetao"]
CURRENT_VARIABLES = ["uo", "vo"]
SALINITY_VARIABLES = ["so"]
WAVE_VARIABLES = ["VHM0", "VMDR", "VTPK"]

GRID_MAX_POINTS = 950
GRID_MAX_VECTORS = 380


def _require_env(name: str) -> str:
    value = (os.getenv(name) or "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _require_any_env(*names: str) -> str:
    for name in names:
        value = (os.getenv(name) or "").strip()
        if value:
            return value
    joined = ", ".join(names)
    raise RuntimeError(f"Missing required environment variable. Provide one of: {joined}")


def _run_command(cmd: List[str]) -> None:
    print("Running:", " ".join(cmd))
    subprocess.run(cmd, check=True)


def _variable_flags(variables: Iterable[str]) -> List[str]:
    args: List[str] = []
    for variable in variables:
        args.extend(["--variable", variable])
    return args


def _iso_z(value: dt.datetime) -> str:
    return value.replace(microsecond=0, tzinfo=dt.timezone.utc).isoformat().replace("+00:00", "Z")


def _find_netcdf_file(folder: Path) -> Path:
    files = sorted(folder.glob("**/*.nc"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise RuntimeError(f"No NetCDF file generated in {folder}")
    return files[0]


def _detect_coord_name(dataset: xr.Dataset, candidates: Iterable[str]) -> Optional[str]:
    for name in candidates:
        if name in dataset.coords:
            return name
    for name in candidates:
        if name in dataset.dims:
            return name
    return None


def _detect_variable(dataset: xr.Dataset, preferred: str) -> Optional[str]:
    by_lower = {name.lower(): name for name in dataset.data_vars}
    return by_lower.get(preferred.lower())


def _normalize_time(value: np.datetime64) -> str:
    dt_value = np.datetime_as_string(value, unit="s")
    if dt_value.endswith("Z"):
        return dt_value
    return f"{dt_value}Z"


def _to_optional_float(raw: object) -> Optional[float]:
    if raw is None:
        return None
    try:
        arr = np.asarray(raw)
    except Exception:
        return None
    if arr.size == 0:
        return None
    try:
        value = float(arr.reshape(-1)[0])
    except Exception:
        return None
    if math.isnan(value):
        return None
    return value


def _as_ndarray_no_mask(values: object) -> np.ndarray:
    arr = np.asarray(values)
    if np.ma.isMaskedArray(arr):
        return arr.filled(np.nan)
    return arr


def _pick_nearest_valid_series(
    da: xr.DataArray,
    *,
    ds: xr.Dataset,
    lat_name: str,
    lon_name: str,
    time_name: str,
    variable_name: str,
) -> xr.DataArray:
    # Keep only time + spatial dimensions (drop scalar dims if any).
    base_dims = [d for d in da.dims if d != time_name]
    if not base_dims:
        return da

    stacked = da.stack(point=base_dims).transpose(time_name, "point")
    values = _as_ndarray_no_mask(stacked.values)
    if values.ndim != 2:
        return stacked

    valid_mask = np.isfinite(values)
    valid_point_indexes = np.where(np.any(valid_mask, axis=0))[0]
    if valid_point_indexes.size == 0:
        return stacked.isel(point=0)

    lat_points: Optional[np.ndarray] = None
    lon_points: Optional[np.ndarray] = None
    try:
        if lat_name in ds.coords and lon_name in ds.coords:
            lat_coord = ds[lat_name]
            lon_coord = ds[lon_name]
            if all(dim in base_dims for dim in lat_coord.dims) and all(dim in base_dims for dim in lon_coord.dims):
                lat_points = _as_ndarray_no_mask(lat_coord.stack(point=base_dims).values).reshape(-1)
                lon_points = _as_ndarray_no_mask(lon_coord.stack(point=base_dims).values).reshape(-1)
        elif lat_name in da.coords and lon_name in da.coords:
            lat_coord = da[lat_name]
            lon_coord = da[lon_name]
            if all(dim in base_dims for dim in lat_coord.dims) and all(dim in base_dims for dim in lon_coord.dims):
                lat_points = _as_ndarray_no_mask(lat_coord.stack(point=base_dims).values).reshape(-1)
                lon_points = _as_ndarray_no_mask(lon_coord.stack(point=base_dims).values).reshape(-1)
    except Exception:
        lat_points = None
        lon_points = None

    best_idx = None
    best_distance = float("inf")

    if lat_points is not None and lon_points is not None and len(lat_points) == len(lon_points):
        for idx in valid_point_indexes.tolist():
            lat_val = _to_optional_float(lat_points[idx])
            lon_val = _to_optional_float(lon_points[idx])
            if lat_val is None or lon_val is None:
                continue
            distance = (lat_val - DATA_LAT) ** 2 + (lon_val - DATA_LON) ** 2
            if distance < best_distance:
                best_distance = distance
                best_idx = idx

    if best_idx is None:
        # Fallback: closest valid index in stacked space.
        best_idx = int(valid_point_indexes[0])
        print(
            f"[marine-update] variable={variable_name} fallback to first valid marine point index={best_idx} "
            f"(no usable lat/lon coordinate mapping)"
        )
        return stacked.isel(point=best_idx)

    print(
        f"[marine-update] variable={variable_name} selected wet cell "
        f"lat={float(lat_points[best_idx]):.5f} lon={float(lon_points[best_idx]):.5f} "
        f"(target {DATA_LAT:.5f},{DATA_LON:.5f})"
    )
    return stacked.isel(point=best_idx)


def _extract_series(nc_path: Path, variables: Iterable[str]) -> Dict[str, Dict[str, Optional[float]]]:
    try:
        ds = xr.open_dataset(nc_path, engine="netcdf4")
    except Exception:
        ds = xr.open_dataset(nc_path)
    lat_name = _detect_coord_name(ds, ("latitude", "lat", "nav_lat"))
    lon_name = _detect_coord_name(ds, ("longitude", "lon", "nav_lon"))
    time_name = _detect_coord_name(ds, ("time", "valid_time"))

    if not lat_name or not lon_name or not time_name:
        raise RuntimeError(f"Could not detect coordinates in dataset: {nc_path}")

    result: Dict[str, Dict[str, Optional[float]]] = {}

    for var in variables:
        found_name = _detect_variable(ds, var)
        if not found_name:
            print(f"[marine-update] variable '{var}' not found in {nc_path.name}")
            result[var] = {}
            continue

        da = ds[found_name]
        for depth_name in ("depth", "depthu", "depthv", "deptht"):
            if depth_name in da.dims:
                da = da.isel({depth_name: 0})

        if time_name not in da.dims:
            result[var] = {}
            continue

        da = _pick_nearest_valid_series(
            da,
            ds=ds,
            lat_name=lat_name,
            lon_name=lon_name,
            time_name=time_name,
            variable_name=var,
        )
        timestamps = da[time_name].values
        values = da.values
        series: Dict[str, Optional[float]] = {}
        for idx, ts in enumerate(timestamps):
            key = _normalize_time(ts)
            series[key] = _to_optional_float(values[idx])
        result[var] = series

    ds.close()
    return result


def _open_dataset(path: Path) -> xr.Dataset:
    try:
        return xr.open_dataset(path, engine="netcdf4")
    except Exception:
        return xr.open_dataset(path)


def _to_lat_lon_mesh(ds: xr.Dataset, lat_name: str, lon_name: str) -> Tuple[np.ndarray, np.ndarray]:
    lat_raw = _as_ndarray_no_mask(ds[lat_name].values)
    lon_raw = _as_ndarray_no_mask(ds[lon_name].values)

    if lat_raw.ndim == 1 and lon_raw.ndim == 1:
        lat_2d, lon_2d = np.meshgrid(lat_raw, lon_raw, indexing="ij")
        return lat_2d.astype(float), lon_2d.astype(float)

    if lat_raw.ndim == 2 and lon_raw.ndim == 2:
        return lat_raw.astype(float), lon_raw.astype(float)

    raise RuntimeError(
        f"Unsupported coordinate layout for lat/lon: lat ndim={lat_raw.ndim}, lon ndim={lon_raw.ndim}"
    )


def _latest_2d_field(
    ds: xr.Dataset,
    *,
    var_name: str,
    lat_name: str,
    lon_name: str,
) -> Tuple[Optional[np.ndarray], Optional[str]]:
    found = _detect_variable(ds, var_name)
    if not found:
        return None, None

    da = ds[found]
    time_name = _detect_coord_name(ds, ("time", "valid_time"))

    # Keep only the surface layer where applicable.
    for depth_name in ("depth", "depthu", "depthv", "deptht"):
        if depth_name in da.dims:
            da = da.isel({depth_name: 0})

    timestamp: Optional[str] = None
    if time_name and time_name in da.dims and da.sizes.get(time_name, 0) > 0:
        da = da.isel({time_name: -1})
        try:
            timestamp = _normalize_time(da[time_name].values)
        except Exception:
            timestamp = None

    # Drop any remaining non-spatial dimensions defensively.
    for dim in list(da.dims):
        if dim not in (lat_name, lon_name):
            if da.sizes.get(dim, 0) > 0:
                da = da.isel({dim: 0})
            else:
                return None, timestamp

    values = _as_ndarray_no_mask(da.values)
    if values.ndim != 2:
        return None, timestamp

    return values.astype(float), timestamp


def _bbox_mask(lat_2d: np.ndarray, lon_2d: np.ndarray) -> np.ndarray:
    return (
        (lat_2d >= MIN_LAT)
        & (lat_2d <= MAX_LAT)
        & (lon_2d >= MIN_LON)
        & (lon_2d <= MAX_LON)
    )


def _sample_scalar_points(
    values_2d: np.ndarray,
    lat_2d: np.ndarray,
    lon_2d: np.ndarray,
    *,
    max_points: int = GRID_MAX_POINTS,
) -> List[Dict[str, float]]:
    if values_2d.shape != lat_2d.shape or values_2d.shape != lon_2d.shape:
        return []

    valid = np.isfinite(values_2d) & np.isfinite(lat_2d) & np.isfinite(lon_2d) & _bbox_mask(lat_2d, lon_2d)
    candidates = int(np.count_nonzero(valid))
    if candidates <= 0:
        return []

    stride = max(1, int(math.ceil(math.sqrt(candidates / max(1, max_points)))))
    ny, nx = values_2d.shape
    points: List[Dict[str, float]] = []

    for j in range(0, ny, stride):
        for i in range(0, nx, stride):
            if not valid[j, i]:
                continue
            v = float(values_2d[j, i])
            if not math.isfinite(v) or v > 1e20:
                continue
            points.append(
                {
                    "lat": round(float(lat_2d[j, i]), 5),
                    "lon": round(float(lon_2d[j, i]), 5),
                    "value": round(v, 4),
                }
            )
            if len(points) >= max_points:
                return points

    return points


def _sample_current_vectors(
    u_2d: np.ndarray,
    v_2d: np.ndarray,
    lat_2d: np.ndarray,
    lon_2d: np.ndarray,
    *,
    max_vectors: int = GRID_MAX_VECTORS,
) -> List[Dict[str, float]]:
    if u_2d.shape != v_2d.shape or u_2d.shape != lat_2d.shape or u_2d.shape != lon_2d.shape:
        return []

    speed = np.sqrt(u_2d * u_2d + v_2d * v_2d)
    valid = (
        np.isfinite(u_2d)
        & np.isfinite(v_2d)
        & np.isfinite(speed)
        & np.isfinite(lat_2d)
        & np.isfinite(lon_2d)
        & (speed >= 0.01)
        & _bbox_mask(lat_2d, lon_2d)
    )

    candidates = int(np.count_nonzero(valid))
    if candidates <= 0:
        return []

    stride = max(1, int(math.ceil(math.sqrt(candidates / max(1, max_vectors)))))
    ny, nx = speed.shape
    vectors: List[Dict[str, float]] = []

    for j in range(0, ny, stride):
        for i in range(0, nx, stride):
            if not valid[j, i]:
                continue
            u = float(u_2d[j, i])
            v = float(v_2d[j, i])
            s = float(speed[j, i])
            direction = _derive_current_direction(u, v)
            vectors.append(
                {
                    "lat": round(float(lat_2d[j, i]), 5),
                    "lon": round(float(lon_2d[j, i]), 5),
                    "u": round(u, 5),
                    "v": round(v, 5),
                    "speed": round(s, 5),
                    "direction": round(direction, 2),
                }
            )
            if len(vectors) >= max_vectors:
                return vectors

    return vectors


def _sample_wave_points(
    height_2d: np.ndarray,
    direction_2d: Optional[np.ndarray],
    period_2d: Optional[np.ndarray],
    lat_2d: np.ndarray,
    lon_2d: np.ndarray,
    *,
    max_points: int = GRID_MAX_POINTS,
) -> List[Dict[str, float]]:
    if height_2d.shape != lat_2d.shape or height_2d.shape != lon_2d.shape:
        return []
    if direction_2d is not None and direction_2d.shape != height_2d.shape:
        return []
    if period_2d is not None and period_2d.shape != height_2d.shape:
        return []

    valid = np.isfinite(height_2d) & np.isfinite(lat_2d) & np.isfinite(lon_2d) & _bbox_mask(lat_2d, lon_2d)
    if direction_2d is not None:
        valid = valid & np.isfinite(direction_2d)
    if period_2d is not None:
        valid = valid & np.isfinite(period_2d)

    candidates = int(np.count_nonzero(valid))
    if candidates <= 0:
        return []

    stride = max(1, int(math.ceil(math.sqrt(candidates / max(1, max_points)))))
    ny, nx = height_2d.shape
    points: List[Dict[str, float]] = []

    for j in range(0, ny, stride):
        for i in range(0, nx, stride):
            if not valid[j, i]:
                continue
            h = float(height_2d[j, i])
            if not math.isfinite(h) or h > 1e20:
                continue
            payload: Dict[str, float] = {
                "lat": round(float(lat_2d[j, i]), 5),
                "lon": round(float(lon_2d[j, i]), 5),
                "value": round(h, 4),
            }
            if direction_2d is not None:
                d = float(direction_2d[j, i])
                if math.isfinite(d):
                    payload["direction"] = round(d % 360.0, 2)
            if period_2d is not None:
                p = float(period_2d[j, i])
                if math.isfinite(p):
                    payload["period"] = round(p, 3)
            points.append(payload)
            if len(points) >= max_points:
                return points

    return points


def _extract_grid_snapshot(
    *,
    temp_nc: Path,
    cur_nc: Path,
    sal_nc: Path,
    wav_nc: Path,
) -> Dict[str, object]:
    temp_ds = _open_dataset(temp_nc)
    cur_ds = _open_dataset(cur_nc)
    sal_ds = _open_dataset(sal_nc)
    wav_ds = _open_dataset(wav_nc)

    try:
        temp_lat_name = _detect_coord_name(temp_ds, ("latitude", "lat", "nav_lat"))
        temp_lon_name = _detect_coord_name(temp_ds, ("longitude", "lon", "nav_lon"))
        cur_lat_name = _detect_coord_name(cur_ds, ("latitude", "lat", "nav_lat"))
        cur_lon_name = _detect_coord_name(cur_ds, ("longitude", "lon", "nav_lon"))
        sal_lat_name = _detect_coord_name(sal_ds, ("latitude", "lat", "nav_lat"))
        sal_lon_name = _detect_coord_name(sal_ds, ("longitude", "lon", "nav_lon"))
        wav_lat_name = _detect_coord_name(wav_ds, ("latitude", "lat", "nav_lat"))
        wav_lon_name = _detect_coord_name(wav_ds, ("longitude", "lon", "nav_lon"))

        if not temp_lat_name or not temp_lon_name:
            raise RuntimeError("Temperature dataset missing lat/lon coordinates.")
        if not cur_lat_name or not cur_lon_name:
            raise RuntimeError("Current dataset missing lat/lon coordinates.")
        if not sal_lat_name or not sal_lon_name:
            raise RuntimeError("Salinity dataset missing lat/lon coordinates.")
        if not wav_lat_name or not wav_lon_name:
            raise RuntimeError("Wave dataset missing lat/lon coordinates.")

        temp_lat_2d, temp_lon_2d = _to_lat_lon_mesh(temp_ds, temp_lat_name, temp_lon_name)
        cur_lat_2d, cur_lon_2d = _to_lat_lon_mesh(cur_ds, cur_lat_name, cur_lon_name)
        sal_lat_2d, sal_lon_2d = _to_lat_lon_mesh(sal_ds, sal_lat_name, sal_lon_name)
        wav_lat_2d, wav_lon_2d = _to_lat_lon_mesh(wav_ds, wav_lat_name, wav_lon_name)

        temp_values, temp_ts = _latest_2d_field(temp_ds, var_name="thetao", lat_name=temp_lat_name, lon_name=temp_lon_name)
        sal_values, sal_ts = _latest_2d_field(sal_ds, var_name="so", lat_name=sal_lat_name, lon_name=sal_lon_name)
        wave_values, wave_ts = _latest_2d_field(wav_ds, var_name="VHM0", lat_name=wav_lat_name, lon_name=wav_lon_name)
        wave_dir_values, wave_dir_ts = _latest_2d_field(wav_ds, var_name="VMDR", lat_name=wav_lat_name, lon_name=wav_lon_name)
        wave_period_values, wave_period_ts = _latest_2d_field(
            wav_ds, var_name="VTPK", lat_name=wav_lat_name, lon_name=wav_lon_name
        )
        u_values, u_ts = _latest_2d_field(cur_ds, var_name="uo", lat_name=cur_lat_name, lon_name=cur_lon_name)
        v_values, v_ts = _latest_2d_field(cur_ds, var_name="vo", lat_name=cur_lat_name, lon_name=cur_lon_name)

        temperature_points = (
            _sample_scalar_points(temp_values, temp_lat_2d, temp_lon_2d, max_points=GRID_MAX_POINTS)
            if temp_values is not None
            else []
        )
        salinity_points = (
            _sample_scalar_points(sal_values, sal_lat_2d, sal_lon_2d, max_points=GRID_MAX_POINTS)
            if sal_values is not None
            else []
        )
        wave_points = (
            _sample_wave_points(
                wave_values,
                wave_dir_values,
                wave_period_values,
                wav_lat_2d,
                wav_lon_2d,
                max_points=GRID_MAX_POINTS,
            )
            if wave_values is not None
            else []
        )
        current_vectors = (
            _sample_current_vectors(u_values, v_values, cur_lat_2d, cur_lon_2d, max_vectors=GRID_MAX_VECTORS)
            if (u_values is not None and v_values is not None)
            else []
        )

        all_timestamps = [ts for ts in (temp_ts, sal_ts, wave_ts, wave_dir_ts, wave_period_ts, u_ts, v_ts) if ts]
        snapshot_ts = max(all_timestamps) if all_timestamps else _iso_z(dt.datetime.now(tz=dt.timezone.utc))

        return {
            "station_id": STATION_ID,
            "timestamp": snapshot_ts,
            "bbox": {
                "minLat": MIN_LAT,
                "maxLat": MAX_LAT,
                "minLon": MIN_LON,
                "maxLon": MAX_LON,
            },
            "temperature_points": temperature_points,
            "salinity_points": salinity_points,
            "wave_points": wave_points,
            "current_vectors": current_vectors,
            "source": SOURCE_LABEL,
        }
    finally:
        temp_ds.close()
        cur_ds.close()
        sal_ds.close()
        wav_ds.close()


def _derive_current_direction(u: float, v: float) -> float:
    # 0 deg = North, clockwise.
    return (math.degrees(math.atan2(u, v)) + 360.0) % 360.0


def _build_records(
    phys: Dict[str, Dict[str, Optional[float]]],
    wav: Dict[str, Dict[str, Optional[float]]],
) -> List[Dict[str, object]]:
    all_times = sorted(
        set(phys.get("thetao", {}).keys())
        | set(phys.get("uo", {}).keys())
        | set(phys.get("vo", {}).keys())
        | set(phys.get("so", {}).keys())
        | set(wav.get("VHM0", {}).keys())
        | set(wav.get("VMDR", {}).keys())
        | set(wav.get("VTPK", {}).keys())
    )
    if not all_times:
        return []

    last_temp: Optional[float] = None
    last_u: Optional[float] = None
    last_v: Optional[float] = None
    last_salinity: Optional[float] = None
    last_wave_height: Optional[float] = None
    last_wave_direction: Optional[float] = None
    last_wave_period: Optional[float] = None

    records: List[Dict[str, object]] = []
    for ts in all_times:
        last_temp = phys.get("thetao", {}).get(ts, None) if phys.get("thetao", {}).get(ts, None) is not None else last_temp
        last_u = phys.get("uo", {}).get(ts, None) if phys.get("uo", {}).get(ts, None) is not None else last_u
        last_v = phys.get("vo", {}).get(ts, None) if phys.get("vo", {}).get(ts, None) is not None else last_v
        last_salinity = phys.get("so", {}).get(ts, None) if phys.get("so", {}).get(ts, None) is not None else last_salinity
        last_wave_height = (
            wav.get("VHM0", {}).get(ts, None)
            if wav.get("VHM0", {}).get(ts, None) is not None
            else last_wave_height
        )
        last_wave_direction = (
            wav.get("VMDR", {}).get(ts, None)
            if wav.get("VMDR", {}).get(ts, None) is not None
            else last_wave_direction
        )
        last_wave_period = (
            wav.get("VTPK", {}).get(ts, None)
            if wav.get("VTPK", {}).get(ts, None) is not None
            else last_wave_period
        )

        current_speed = None
        current_direction = None
        if last_u is not None and last_v is not None:
            current_speed = math.sqrt(last_u * last_u + last_v * last_v)
            current_direction = _derive_current_direction(last_u, last_v)

        records.append(
            {
                "station_id": STATION_ID,
                "timestamp": ts,
                "water_temperature": last_temp,
                "current_u": last_u,
                "current_v": last_v,
                "current_speed": current_speed,
                "current_direction": current_direction,
                "salinity": last_salinity,
                "wave_height": last_wave_height,
                "wave_direction": last_wave_direction,
                "wave_period": last_wave_period,
                "source": SOURCE_LABEL,
            }
        )

    return records


def _upsert_rest_rows(
    *,
    table: str,
    rows: List[Dict[str, object]],
    on_conflict: str,
    prefer: str = "resolution=merge-duplicates,return=minimal",
) -> None:
    if not rows:
        raise RuntimeError(f"No rows to upsert in table: {table}")

    supabase_url = _require_any_env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").rstrip("/")
    service_role = _require_env("SUPABASE_SERVICE_ROLE_KEY")
    endpoint = f"{supabase_url}/rest/v1/{table}?on_conflict={on_conflict}"

    headers = {
        "apikey": service_role,
        "Authorization": f"Bearer {service_role}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }

    batch_size = 500
    for idx in range(0, len(rows), batch_size):
        chunk = rows[idx : idx + batch_size]
        payload = json.dumps(chunk).encode("utf-8")
        req = request.Request(endpoint, data=payload, headers=headers, method="POST")
        try:
            with request.urlopen(req) as resp:
                if resp.status not in (200, 201, 204):
                    body = resp.read().decode("utf-8", errors="replace")
                    raise RuntimeError(f"Supabase upsert failed [{table}]: HTTP {resp.status} {body}")
        except urlerror.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase upsert failed [{table}]: HTTP {exc.code} {body}") from exc


def _upsert_supabase(records: List[Dict[str, object]]) -> None:
    _upsert_rest_rows(
        table="marine_station_data",
        rows=records,
        on_conflict="station_id,timestamp",
    )


def _upsert_layer_snapshot(snapshot: Dict[str, object]) -> None:
    _upsert_rest_rows(
        table="marine_layer_snapshots",
        rows=[snapshot],
        on_conflict="station_id,timestamp",
    )


def main() -> int:
    _require_env("COPERNICUSMARINE_SERVICE_USERNAME")
    _require_env("COPERNICUSMARINE_SERVICE_PASSWORD")
    _require_any_env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
    _require_env("SUPABASE_SERVICE_ROLE_KEY")

    now = dt.datetime.now(tz=dt.timezone.utc)
    start = _iso_z(now - dt.timedelta(days=7))
    end = _iso_z(now + dt.timedelta(days=5))

    base_output = Path("data") / "copernicus"
    temp_output = base_output / "temp"
    cur_output = base_output / "cur"
    sal_output = base_output / "sal"
    wav_output = base_output / "wav"
    temp_output.mkdir(parents=True, exist_ok=True)
    cur_output.mkdir(parents=True, exist_ok=True)
    sal_output.mkdir(parents=True, exist_ok=True)
    wav_output.mkdir(parents=True, exist_ok=True)

    _run_command(
        [
            "copernicusmarine",
            "subset",
            "--dataset-id",
            TEMP_DATASET_ID,
            *_variable_flags(TEMP_VARIABLES),
            "--minimum-longitude",
            str(MIN_LON),
            "--maximum-longitude",
            str(MAX_LON),
            "--minimum-latitude",
            str(MIN_LAT),
            "--maximum-latitude",
            str(MAX_LAT),
            "--start-datetime",
            start,
            "--end-datetime",
            end,
            "--output-directory",
            str(temp_output),
        ]
    )

    _run_command(
        [
            "copernicusmarine",
            "subset",
            "--dataset-id",
            CURRENT_DATASET_ID,
            *_variable_flags(CURRENT_VARIABLES),
            "--minimum-longitude",
            str(MIN_LON),
            "--maximum-longitude",
            str(MAX_LON),
            "--minimum-latitude",
            str(MIN_LAT),
            "--maximum-latitude",
            str(MAX_LAT),
            "--start-datetime",
            start,
            "--end-datetime",
            end,
            "--output-directory",
            str(cur_output),
        ]
    )

    _run_command(
        [
            "copernicusmarine",
            "subset",
            "--dataset-id",
            SALINITY_DATASET_ID,
            *_variable_flags(SALINITY_VARIABLES),
            "--minimum-longitude",
            str(MIN_LON),
            "--maximum-longitude",
            str(MAX_LON),
            "--minimum-latitude",
            str(MIN_LAT),
            "--maximum-latitude",
            str(MAX_LAT),
            "--start-datetime",
            start,
            "--end-datetime",
            end,
            "--output-directory",
            str(sal_output),
        ]
    )

    _run_command(
        [
            "copernicusmarine",
            "subset",
            "--dataset-id",
            WAVE_DATASET_ID,
            *_variable_flags(WAVE_VARIABLES),
            "--minimum-longitude",
            str(MIN_LON),
            "--maximum-longitude",
            str(MAX_LON),
            "--minimum-latitude",
            str(MIN_LAT),
            "--maximum-latitude",
            str(MAX_LAT),
            "--start-datetime",
            start,
            "--end-datetime",
            end,
            "--output-directory",
            str(wav_output),
        ]
    )

    temp_nc = _find_netcdf_file(temp_output)
    cur_nc = _find_netcdf_file(cur_output)
    sal_nc = _find_netcdf_file(sal_output)
    wav_nc = _find_netcdf_file(wav_output)

    phys_series: Dict[str, Dict[str, Optional[float]]] = {}
    phys_series.update(_extract_series(temp_nc, TEMP_VARIABLES))
    phys_series.update(_extract_series(cur_nc, CURRENT_VARIABLES))
    phys_series.update(_extract_series(sal_nc, SALINITY_VARIABLES))
    wave_series = _extract_series(wav_nc, WAVE_VARIABLES)
    records = _build_records(phys_series, wave_series)
    if not records:
        raise RuntimeError("No records were generated from Copernicus subset results.")
    grid_snapshot = _extract_grid_snapshot(
        temp_nc=temp_nc,
        cur_nc=cur_nc,
        sal_nc=sal_nc,
        wav_nc=wav_nc,
    )

    value_fields = (
        "water_temperature",
        "current_u",
        "current_v",
        "current_speed",
        "current_direction",
        "salinity",
        "wave_height",
        "wave_direction",
        "wave_period",
    )
    field_counts = {field: 0 for field in value_fields}
    for record in records:
        for field in value_fields:
            if record.get(field) is not None:
                field_counts[field] += 1
    print("[marine-update] non-null counts:", json.dumps(field_counts))

    has_any_value = any(any(record.get(field) is not None for field in value_fields) for record in records)
    if not has_any_value:
        raise RuntimeError(
            "All generated marine records are null. Likely selected grid cell is on land or subset is invalid."
        )

    _upsert_supabase(records)
    _upsert_layer_snapshot(grid_snapshot)
    print(f"Upserted {len(records)} records for station={STATION_ID}")
    print(
        "[marine-update] layer snapshot counts:",
        json.dumps(
            {
                "temperature_points": len(grid_snapshot.get("temperature_points", [])),
                "salinity_points": len(grid_snapshot.get("salinity_points", [])),
                "wave_points": len(grid_snapshot.get("wave_points", [])),
                "current_vectors": len(grid_snapshot.get("current_vectors", [])),
            }
        ),
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - runtime guard
        print(f"[marine-update] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
