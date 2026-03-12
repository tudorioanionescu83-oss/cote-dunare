#!/usr/bin/env python3
"""
Automated Copernicus Marine -> Supabase updater for Constanta marine station.

Requirements:
  pip install copernicusmarine xarray netcdf4 numpy supabase
"""

from __future__ import annotations

import datetime as dt
import math
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

import numpy as np
import xarray as xr
from supabase import create_client

import copernicusmarine


STATION_ID = "constanta_marine"
SOURCE_LABEL = "Copernicus Marine"

CONST_LAT = 44.17
CONST_LON = 28.65
BBOX = {
    "minimum_latitude": 44.0,
    "maximum_latitude": 44.4,
    "minimum_longitude": 28.4,
    "maximum_longitude": 28.9,
}

DATASET_PHY = "BLKSEA_ANALYSISFORECAST_PHY_007_001"
DATASET_WAV = "BLKSEA_ANALYSISFORECAST_WAV_007_003"

VARIABLES_PHY = ["thetao", "uo", "vo", "so"]
VARIABLES_WAV = ["VHM0", "VMDR", "VTPK"]


def read_env(name: str, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing environment variable: {name}")
    return value


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def to_iso(dt_obj: dt.datetime) -> str:
    return dt_obj.astimezone(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def maybe_login(username: str, password: str) -> None:
    login_fn = getattr(copernicusmarine, "login", None)
    if not callable(login_fn):
        return
    try:
        login_fn(username=username, password=password)
        print("Copernicus login succeeded.")
    except Exception as exc:  # noqa: BLE001
        print(f"Copernicus login skipped (subset call still uses credentials): {exc}")


def safe_subset(**kwargs: Any) -> Any:
    try:
        return copernicusmarine.subset(**kwargs)
    except TypeError:
        fallback = dict(kwargs)
        fallback.pop("force_download", None)
        fallback.pop("overwrite_output_data", None)
        return copernicusmarine.subset(**fallback)


def resolve_subset_path(result: Any, output_dir: Path, expected_name: str) -> Path:
    candidate = output_dir / expected_name
    if candidate.exists():
        return candidate

    if isinstance(result, (str, Path)):
        path_obj = Path(result)
        if path_obj.exists():
            return path_obj

    for attr in ("path", "file_path", "output_path", "local_path"):
        value = getattr(result, attr, None)
        if value:
            path_obj = Path(value)
            if path_obj.exists():
                return path_obj

    files_attr = getattr(result, "files", None)
    if isinstance(files_attr, Iterable):
        for item in files_attr:
            path_obj = Path(str(item))
            if path_obj.exists():
                return path_obj

    nc_files = sorted(output_dir.glob("*.nc"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not nc_files:
        raise RuntimeError(f"No subset file found in {output_dir}")
    return nc_files[0]


def first_existing_var(ds: xr.Dataset, names: List[str]) -> Optional[str]:
    for name in names:
        if name in ds.variables:
            return name
    return None


def scalar_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        val = float(value)
    except Exception:  # noqa: BLE001
        return None
    if math.isnan(val) or math.isinf(val):
        return None
    return val


def normalize_time_value(value: Any) -> Optional[str]:
    if value is None:
        return None

    if isinstance(value, np.datetime64):
        if np.isnat(value):
            return None
        text = np.datetime_as_string(value, unit="s")
        if text.endswith("Z"):
            return text
        return f"{text}Z"

    if hasattr(value, "isoformat"):
        text = value.isoformat()
        if text.endswith("+00:00"):
            return text.replace("+00:00", "Z")
        if text.endswith("Z"):
            return text
        return f"{text}Z"

    text = str(value)
    return text if text else None


def extract_series(ds: xr.Dataset, variable_name: str, lat: float, lon: float) -> Dict[str, Optional[float]]:
    da = ds[variable_name]

    lat_coord = next((name for name in ("latitude", "lat", "y") if name in da.coords), None)
    lon_coord = next((name for name in ("longitude", "lon", "x") if name in da.coords), None)

    if lat_coord and lon_coord:
        da = da.sel({lat_coord: lat, lon_coord: lon}, method="nearest")
    elif lat_coord:
        da = da.sel({lat_coord: lat}, method="nearest")
    elif lon_coord:
        da = da.sel({lon_coord: lon}, method="nearest")

    for dim_name in ("depth", "depthu", "depthv", "depthw", "lev", "z", "sigma"):
        if dim_name in da.dims:
            da = da.isel({dim_name: 0})

    if "time" not in da.coords and "time" not in da.dims:
        return {}

    time_name = "time" if "time" in da.coords else "time"
    times = da[time_name].values
    values = da.values

    # Guarantee iterability for single-value arrays.
    if np.ndim(times) == 0:
        times = [times]
        values = [values]

    series: Dict[str, Optional[float]] = {}
    for ts, val in zip(times, values):
        ts_iso = normalize_time_value(ts)
        if not ts_iso:
            continue
        series[ts_iso] = scalar_float(val)
    return series


def merge_by_timestamp(series_map: Dict[str, Dict[str, Optional[float]]]) -> Dict[str, Dict[str, Optional[float]]]:
    merged: Dict[str, Dict[str, Optional[float]]] = {}
    for field_name, series in series_map.items():
        for ts, val in series.items():
            if ts not in merged:
                merged[ts] = {}
            merged[ts][field_name] = val
    return merged


def current_speed(u: Optional[float], v: Optional[float]) -> Optional[float]:
    if u is None or v is None:
        return None
    return math.sqrt((u * u) + (v * v))


def current_direction(u: Optional[float], v: Optional[float]) -> Optional[float]:
    if u is None or v is None:
        return None
    # 0° = North, clockwise.
    direction = (math.degrees(math.atan2(u, v)) + 360.0) % 360.0
    return direction


def fill_with_last_valid(points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    last_values: Dict[str, Optional[float]] = {
        "water_temperature": None,
        "current_u": None,
        "current_v": None,
        "salinity": None,
        "wave_height": None,
        "wave_direction": None,
        "wave_period": None,
    }

    out: List[Dict[str, Any]] = []
    for point in points:
        normalized = dict(point)
        for key in last_values:
            if normalized.get(key) is None:
                normalized[key] = last_values[key]
            else:
                last_values[key] = normalized[key]

        normalized["current_speed"] = current_speed(normalized.get("current_u"), normalized.get("current_v"))
        normalized["current_direction"] = current_direction(normalized.get("current_u"), normalized.get("current_v"))
        out.append(normalized)
    return out


def chunked(items: List[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    for idx in range(0, len(items), size):
        yield items[idx : idx + size]


def download_subsets(username: str, password: str, output_dir: Path) -> Dict[str, Path]:
    now = utc_now()
    start = now - dt.timedelta(hours=int(os.getenv("COPERNICUS_LOOKBACK_HOURS", "72")))
    end = now + dt.timedelta(hours=int(os.getenv("COPERNICUS_FORECAST_HOURS", "120")))

    print(f"Subset time window: {to_iso(start)} -> {to_iso(end)}")

    phy_name = "constanta_phy.nc"
    wav_name = "constanta_wav.nc"

    phy_result = safe_subset(
        dataset_id=DATASET_PHY,
        variables=VARIABLES_PHY,
        start_datetime=to_iso(start),
        end_datetime=to_iso(end),
        output_directory=str(output_dir),
        output_filename=phy_name,
        force_download=True,
        overwrite_output_data=True,
        username=username,
        password=password,
        minimum_depth=0.0,
        maximum_depth=1.0,
        **BBOX,
    )

    wav_result = safe_subset(
        dataset_id=DATASET_WAV,
        variables=VARIABLES_WAV,
        start_datetime=to_iso(start),
        end_datetime=to_iso(end),
        output_directory=str(output_dir),
        output_filename=wav_name,
        force_download=True,
        overwrite_output_data=True,
        username=username,
        password=password,
        **BBOX,
    )

    phy_path = resolve_subset_path(phy_result, output_dir, phy_name)
    wav_path = resolve_subset_path(wav_result, output_dir, wav_name)
    print(f"Downloaded physical subset: {phy_path}")
    print(f"Downloaded wave subset: {wav_path}")
    return {"physical": phy_path, "waves": wav_path}


def build_normalized_rows(physical_path: Path, waves_path: Path) -> List[Dict[str, Any]]:
    with xr.open_dataset(physical_path) as ds_phy, xr.open_dataset(waves_path) as ds_wav:
        var_thetao = first_existing_var(ds_phy, ["thetao"])
        var_uo = first_existing_var(ds_phy, ["uo"])
        var_vo = first_existing_var(ds_phy, ["vo"])
        var_so = first_existing_var(ds_phy, ["so"])

        var_vhm0 = first_existing_var(ds_wav, ["VHM0", "vhm0"])
        var_vmdr = first_existing_var(ds_wav, ["VMDR", "vmdr"])
        var_vtpk = first_existing_var(ds_wav, ["VTPK", "vtpk"])

        series_map: Dict[str, Dict[str, Optional[float]]] = {}
        if var_thetao:
            series_map["water_temperature"] = extract_series(ds_phy, var_thetao, CONST_LAT, CONST_LON)
        if var_uo:
            series_map["current_u"] = extract_series(ds_phy, var_uo, CONST_LAT, CONST_LON)
        if var_vo:
            series_map["current_v"] = extract_series(ds_phy, var_vo, CONST_LAT, CONST_LON)
        if var_so:
            series_map["salinity"] = extract_series(ds_phy, var_so, CONST_LAT, CONST_LON)
        if var_vhm0:
            series_map["wave_height"] = extract_series(ds_wav, var_vhm0, CONST_LAT, CONST_LON)
        if var_vmdr:
            series_map["wave_direction"] = extract_series(ds_wav, var_vmdr, CONST_LAT, CONST_LON)
        if var_vtpk:
            series_map["wave_period"] = extract_series(ds_wav, var_vtpk, CONST_LAT, CONST_LON)

    merged = merge_by_timestamp(series_map)
    ordered_points = []
    for ts in sorted(merged.keys()):
        ordered_points.append({"timestamp": ts, **merged[ts]})

    filled_points = fill_with_last_valid(ordered_points)

    normalized_rows: List[Dict[str, Any]] = []
    for point in filled_points:
        normalized_rows.append(
            {
                "station_id": STATION_ID,
                "timestamp": point["timestamp"],
                "water_temperature": point.get("water_temperature"),
                "current_u": point.get("current_u"),
                "current_v": point.get("current_v"),
                "current_speed": point.get("current_speed"),
                "current_direction": point.get("current_direction"),
                "salinity": point.get("salinity"),
                "wave_height": point.get("wave_height"),
                "wave_direction": point.get("wave_direction"),
                "wave_period": point.get("wave_period"),
                "source": SOURCE_LABEL,
            }
        )

    return normalized_rows


def upsert_rows(rows: List[Dict[str, Any]], supabase_url: str, supabase_key: str) -> None:
    if not rows:
        print("No rows to upsert.")
        return

    client = create_client(supabase_url, supabase_key)
    for batch in chunked(rows, 500):
        client.table("marine_station_data").upsert(batch, on_conflict="station_id,timestamp").execute()
    print(f"Upserted {len(rows)} rows into marine_station_data.")

    retention_days = int(os.getenv("MARINE_RETENTION_DAYS", "45"))
    cutoff = to_iso(utc_now() - dt.timedelta(days=retention_days))
    client.table("marine_station_data").delete().eq("station_id", STATION_ID).lt("timestamp", cutoff).execute()
    print(f"Retention cleanup completed. Kept last {retention_days} days.")


def main() -> None:
    username = read_env("COPERNICUSMARINE_SERVICE_USERNAME")
    password = read_env("COPERNICUSMARINE_SERVICE_PASSWORD")
    supabase_url = os.getenv("SUPABASE_URL") or read_env("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or read_env("SUPABASE_KEY")

    maybe_login(username, password)

    with tempfile.TemporaryDirectory(prefix="copernicus_constanta_") as tmp_dir:
        output_dir = Path(tmp_dir)
        paths = download_subsets(username=username, password=password, output_dir=output_dir)
        rows = build_normalized_rows(paths["physical"], paths["waves"])
        upsert_rows(rows, supabase_url=supabase_url, supabase_key=supabase_key)

    print("Constanta marine update finished successfully.")


if __name__ == "__main__":
    main()
