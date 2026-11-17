export const fmtPace = (secPerKm: number): string => {
  const t = Math.round(secPerKm);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export const fmtTime = (seconds: number): string => {
  const t = Math.round(seconds);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

export const paceSecPerKm = (timeS: number, distanceM: number): number | null =>
  distanceM > 0 ? timeS / (distanceM / 1000) : null;
