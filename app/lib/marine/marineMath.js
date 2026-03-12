export function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function currentSpeedFromUV(u, v) {
  const uu = toFiniteNumber(u);
  const vv = toFiniteNumber(v);
  if (uu === null || vv === null) return null;
  return Math.sqrt(uu * uu + vv * vv);
}

export function currentDirectionFromUV(u, v) {
  const uu = toFiniteNumber(u);
  const vv = toFiniteNumber(v);
  if (uu === null || vv === null) return null;
  // 0 deg = North, clockwise.
  return (Math.atan2(uu, vv) * (180 / Math.PI) + 360) % 360;
}

export function fillWithLastValid(points) {
  let lastWaterTemperature = null;
  let lastCurrentSpeed = null;
  let lastCurrentDirection = null;
  let lastWaveHeight = null;
  let lastWaveDirection = null;
  let lastWavePeriod = null;
  let lastSalinity = null;

  return (points || []).map((point) => {
    lastWaterTemperature = point.waterTemperature ?? lastWaterTemperature;
    lastCurrentSpeed = point.currentSpeed ?? lastCurrentSpeed;
    lastCurrentDirection = point.currentDirection ?? lastCurrentDirection;
    lastWaveHeight = point.waveHeight ?? lastWaveHeight;
    lastWaveDirection = point.waveDirection ?? lastWaveDirection;
    lastWavePeriod = point.wavePeriod ?? lastWavePeriod;
    lastSalinity = point.salinity ?? lastSalinity;

    return {
      ...point,
      waterTemperature: lastWaterTemperature,
      currentSpeed: lastCurrentSpeed,
      currentDirection: lastCurrentDirection,
      waveHeight: lastWaveHeight,
      waveDirection: lastWaveDirection,
      wavePeriod: lastWavePeriod,
      salinity: lastSalinity,
    };
  });
}
