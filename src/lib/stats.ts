export type RunLike = {
  id: string;
  started_at: string;
  distance_m: number;
  moving_time_s: number;
  elevation_gain_m: number | null;
  best_efforts: Record<string, number> | null;
};

export type Week = { weekStart: string; km: number; dplus: number; pace: number | null };

const DAY = 86400000;

// Semaines du lundi au dimanche (UTC), de la plus ancienne à la semaine courante.
export function weeklyVolume(runs: RunLike[], now: Date, weeks: number): Week[] {
  const monday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  const first = monday - (weeks - 1) * 7 * DAY;
  const acc = Array.from({ length: weeks }, () => ({ m: 0, dplus: 0, time: 0 }));
  for (const r of runs) {
    const i = Math.floor((Date.parse(r.started_at) - first) / (7 * DAY));
    if (i < 0 || i >= weeks) continue;
    acc[i].m += r.distance_m; acc[i].dplus += r.elevation_gain_m ?? 0; acc[i].time += r.moving_time_s;
  }
  return acc.map((a, i) => ({
    weekStart: new Date(first + i * 7 * DAY).toISOString().slice(0, 10),
    km: Math.round(a.m / 100) / 10,
    dplus: Math.round(a.dplus),
    pace: a.m > 0 ? a.time / (a.m / 1000) : null,
  }));
}

export type Records = {
  efforts: Record<string, { time_s: number; date: string; activity_id: string }>;
  longest: { distance_m: number; date: string; activity_id: string } | null;
  biggestClimb: { elevation_gain_m: number; date: string; activity_id: string } | null;
};

export function personalRecords(runs: RunLike[]): Records {
  const rec: Records = { efforts: {}, longest: null, biggestClimb: null };
  for (const r of runs) {
    const date = r.started_at.slice(0, 10);
    for (const [name, t] of Object.entries(r.best_efforts ?? {})) {
      if (!rec.efforts[name] || t < rec.efforts[name].time_s) rec.efforts[name] = { time_s: t, date, activity_id: r.id };
    }
    if (!rec.longest || r.distance_m > rec.longest.distance_m) rec.longest = { distance_m: r.distance_m, date, activity_id: r.id };
    const up = r.elevation_gain_m ?? 0;
    if (up > 0 && (!rec.biggestClimb || up > rec.biggestClimb.elevation_gain_m)) rec.biggestClimb = { elevation_gain_m: up, date, activity_id: r.id };
  }
  return rec;
}
