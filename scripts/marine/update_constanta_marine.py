#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import json
import math
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Iterable, List, Optional
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
MIN_LAT = 44.0
MAX_LAT = 44.4
MIN_LON = 28.4
MAX_LON = 28.9
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


def _upsert_supabase(records: List[Dict[str, object]]) -> None:
    if not records:
        raise RuntimeError("No records to upsert.")

    supabase_url = _require_any_env("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").rstrip("/")
    service_role = _require_env("SUPABASE_SERVICE_ROLE_KEY")
    endpoint = f"{supabase_url}/rest/v1/marine_station_data?on_conflict=station_id,timestamp"

    headers = {
        "apikey": service_role,
        "Authorization": f"Bearer {service_role}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    batch_size = 500
    for idx in range(0, len(records), batch_size):
        chunk = records[idx : idx + batch_size]
        payload = json.dumps(chunk).encode("utf-8")
        req = request.Request(endpoint, data=payload, headers=headers, method="POST")
        try:
            with request.urlopen(req) as resp:
                if resp.status not in (200, 201, 204):
                    body = resp.read().decode("utf-8", errors="replace")
                    raise RuntimeError(f"Supabase upsert failed: HTTP {resp.status} {body}")
        except urlerror.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Supabase upsert failed: HTTP {exc.code} {body}") from exc


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
    print(f"Upserted {len(records)} records for station={STATION_ID}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - runtime guard
        print(f"[marine-update] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
