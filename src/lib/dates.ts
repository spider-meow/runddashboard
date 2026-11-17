const TZ = "Europe/Paris";

// Jour calendaire (AAAA-MM-JJ) à Paris : le serveur Vercel tourne en UTC, une course à 00h30 ne doit pas changer de jour.
export const parisDay = (d: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

// Nombre de jours entre aujourd'hui (Paris) et une date AAAA-MM-JJ : 0 le jour même, négatif une fois passée.
export const daysUntil = (day: string, now: Date): number => Math.round((Date.parse(day.slice(0, 10)) - Date.parse(parisDay(now))) / 86400000);

export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions): string => new Date(iso).toLocaleDateString("fr-FR", { timeZone: TZ, ...opts });
