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

// Allure saisie en « m:ss » (ex. 4:50) -> secondes par km, ou null si le format est invalide.
export const parsePace = (s: string): number | null => {
  const m = /^\s*(\d{1,2}):([0-5]\d)\s*$/.exec(s);
  return m ? +m[1] * 60 + +m[2] : null;
};

export const fmtKm = (distanceM: number): string => (distanceM / 1000).toFixed(1).replace(".", ",");
