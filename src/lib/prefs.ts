export const THEMES = ["poster", "sunrise", "midnight"] as const;
export type Theme = (typeof THEMES)[number];
export const SIZES = ["s", "m", "l", "xl"] as const;
export type Size = (typeof SIZES)[number];
export type Widget = { id: string; visible: boolean; size: Size };

// Fusionne les widgets enregistrés avec les widgets que la page propose : on ignore ceux qui n'existent plus,
// on corrige les valeurs invalides, et les nouveaux widgets arrivent à la fin.
export function mergeWidgets(saved: unknown, defaults: Widget[]): Widget[] {
  const byId = new Map(defaults.map((d) => [d.id, d]));
  const seen = new Set<string>();
  const out: Widget[] = [];
  if (Array.isArray(saved)) {
    for (const w of saved as Partial<Widget>[]) {
      const d = w && typeof w.id === "string" ? byId.get(w.id) : undefined;
      if (!d || seen.has(d.id)) continue;
      seen.add(d.id);
      out.push({
        id: d.id,
        visible: typeof w.visible === "boolean" ? w.visible : d.visible,
        size: (SIZES as readonly string[]).includes(w.size as string) ? (w.size as Size) : d.size,
      });
    }
  }
  for (const d of defaults) if (!seen.has(d.id)) out.push(d);
  return out;
}

export const isHexColor = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Couleur du texte posé sur l'accent choisi par l'utilisateur.
export const onAccent = (hex: string) => (lum(hex) > 0.3 ? "#14110f" : "#ffffff");

// Valide la forme des widgets reçus du navigateur avant de les enregistrer.
export function cleanWidgets(input: unknown): Widget[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: Widget[] = [];
  for (const w of input as Partial<Widget>[]) {
    if (!w || typeof w.id !== "string" || w.id.length > 40 || seen.has(w.id)) continue;
    if (typeof w.visible !== "boolean" || !(SIZES as readonly string[]).includes(w.size as string)) continue;
    seen.add(w.id);
    out.push({ id: w.id, visible: w.visible, size: w.size as Size });
  }
  return out.slice(0, 30);
}

export const PAGES = ["home", "historique", "projections", "courses"] as const;
export type PrefsRow = { theme: string; accent: string | null; widgets: Record<string, unknown> };

// Applique une mise à jour partielle : seuls les champs fournis changent. Un enregistrement de thème ou d'accent
// ne doit jamais effacer la disposition des widgets.
export function applyPrefsUpdate(cur: PrefsRow, input: { page?: string; widgets?: unknown; theme?: string; accent?: string | null }): PrefsRow {
  const next: PrefsRow = { theme: cur.theme, accent: cur.accent, widgets: { ...cur.widgets } };
  if (input.theme && (THEMES as readonly string[]).includes(input.theme)) next.theme = input.theme;
  if (input.accent === null) next.accent = null;
  else if (isHexColor(input.accent)) next.accent = input.accent;
  if (input.page && (PAGES as readonly string[]).includes(input.page) && Array.isArray(input.widgets)) next.widgets[input.page] = cleanWidgets(input.widgets);
  return next;
}