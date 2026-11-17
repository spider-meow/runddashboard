/* Données SYNTHÉTIQUES de démonstration. Aucun vrai tracé GPS, aucune vraie activité. */
(function () {
  // PRNG déterministe : les maquettes affichent toujours la même chose
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  const fmtPace = (s) => { s = Math.round(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const fmtTime = (s) => {
    s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
  };
  const riegel = (t1, d1, d2) => t1 * Math.pow(d2 / d1, 1.06);

  // ----- course à venir : Les Collines de Garches -----
  const race = { name: "Les Collines de Garches", date: "2026-11-22", dist: 16.2, dplus: 275, target: 290 };
  race.targetTime = race.dist * race.target; // 4698 s = 1:18:18

  // profil d'élévation : 5 bosses, ramené à exactement 275 m de D+
  const N = 162; // 1 point / 100 m
  const bumps = [[2.4, 1.0, .9], [5.0, 1.2, 1.0], [7.9, 1.5, 1.1], [10.7, 1.1, .8], [13.6, .9, .9]];
  let raw = [];
  for (let i = 0; i <= N; i++) {
    const km = i / 10; let e = 0;
    bumps.forEach(([c, h, w]) => { e += h * Math.exp(-Math.pow((km - c) / (w * 1.1), 2)); });
    raw.push(e + (rnd() - .5) * .04);
  }
  const gain = (a) => a.reduce((s, v, i) => (i && v > a[i - 1] ? s + v - a[i - 1] : s), 0);
  const k = race.dplus / gain(raw);
  const elev = raw.map((v) => 96 + v * k); // altitude en m
  const elevMin = Math.min(...elev), elevMax = Math.max(...elev);

  // tracé : boucle à lobes, normalisée dans 400 x 300
  const route = [];
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI * 2, r = 1 + .26 * Math.sin(3 * t + .6) + .12 * Math.sin(5 * t + 1.4);
    route.push([Math.cos(t) * r * 1.35, Math.sin(t) * r]);
  }
  const xs = route.map((p) => p[0]), ys = route.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const sc = Math.min(340 / (maxX - minX), 240 / (maxY - minY));
  const routeXY = route.map(([x, y]) => [200 + (x - (minX + maxX) / 2) * sc, 150 + (y - (minY + maxY) / 2) * sc]);

  // repères de passage (km) avec allure cible ajustée à la pente
  const checkpoints = [
    { km: 0, name: "Départ", note: "Se placer à 4:55, ne pas partir vite" },
    { km: 2.4, name: "1re côte", note: "Sommet bosse 1 : tenir l'effort, pas l'allure" },
    { km: 5.0, name: "Ravitaillement", note: "Eau, 1 gel optionnel" },
    { km: 7.9, name: "Plus longue montée", note: "Relancer dès la bascule" },
    { km: 10.7, name: "Mi-course haute", note: "Point de décision : on accélère ?" },
    { km: 13.6, name: "Dernière bosse", note: "Passer la bosse, puis tout donner" },
    { km: 16.2, name: "Arrivée", note: "" },
  ];
  // temps cumulé cible : plus lent en montée, un peu plus rapide en descente, puis normalisé sur 1:18:18
  const base = []; for (let i = 0; i <= N; i++) base.push(i === 0 ? 0 : 0.1 + Math.max(-0.05, (elev[i] - elev[i - 1]) * 0.012));
  let acc = 0; const rawT = base.map((b) => (acc += b));
  const tScale = race.targetTime / rawT[N];
  const timeAt = (km) => rawT[Math.round(km * 10)] * tScale;
  checkpoints.forEach((c) => { c.t = timeAt(c.km); });

  // ----- dernière course (synthétique) -----
  const splits = [];
  const lastElev = [4, 11, -3, 2, 14, -9, 6, 1, 18, -12, 3, 5, 2]; // m par km
  for (let i = 0; i < 12; i++) splits.push({ km: i + 1, pace: 296 + lastElev[i] * 1.4 + (rnd() - .5) * 8 - (i > 8 ? 4 : 0), elev: lastElev[i], hr: 148 + i * 1.2 + rnd() * 3 });
  splits.push({ km: 13, pace: 288, elev: 2, hr: 163, partial: .4 });
  const lastRun = {
    name: "Sortie du dimanche", date: "2026-11-15", dist: 12.4,
    time: splits.slice(0, 12).reduce((s, x) => s + x.pace, 0) + 288 * .4,
    dplus: lastElev.reduce((s, v) => s + Math.max(0, v), 0) + 8, hr: 156, splits,
  };

  // ----- historique : 24 semaines -----
  const weeks = [];
  const vols = [38, 42, 35, 46, 50, 41, 53, 57, 44, 60, 55, 48, 62, 66, 52, 68, 71, 58, 64, 70, 61, 55, 49, 38];
  for (let i = 0; i < 24; i++) weeks.push({ w: i, km: vols[i], pace: 321 - i * 1.1 + (rnd() - .5) * 6, dplus: 180 + vols[i] * 5 });
  const prs = [
    { label: "5 km", t: 1302, date: "2026-09-13" }, { label: "10 km", t: 2758, date: "2026-10-04" },
    { label: "Semi", t: 6130, date: "2026-10-18" }, { label: "Plus longue", v: "28,3 km", date: "2026-06-21" },
    { label: "Plus gros D+", v: "412 m", date: "2026-05-30" },
  ];
  const recent = [
    ["2026-11-15", "Sortie du dimanche", 12.4, lastRun.time, 187],
    ["2026-11-12", "Footing récupération", 7.2, 2316, 41], ["2026-11-10", "Séance 6 × 1000 m", 11.0, 3085, 64],
    ["2026-11-08", "Footing facile", 9.6, 3006, 72], ["2026-11-04", "Tempo 3 × 2 km", 12.5, 3540, 95],
    ["2026-11-01", "Sortie longue", 20.1, 6420, 233], ["2026-10-29", "Footing facile", 8.0, 2512, 38],
  ];
  const refBest = { dist: 10, time: 2758 }; // base des projections (10 km, 4 oct)

  window.RD = { fmtPace, fmtTime, riegel, race, elev, elevMin, elevMax, routeXY, checkpoints, lastRun, weeks, prs, recent, refBest, N };
})();
