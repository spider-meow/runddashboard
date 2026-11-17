export type StravaEvent = {
  object_type?: string; aspect_type?: string; object_id?: number | string; owner_id?: number | string; updates?: Record<string, string>;
};

export type EventAction =
  | { action: "sync" }
  | { action: "verify-delete"; activityId: string }
  | { action: "deauthorize" }
  | { action: "ignore" };

// Les événements Strava ne sont pas signés : on ne fait confiance qu'aux identifiants, jamais au contenu.
export function classifyEvent(ev: unknown, ownerId: string): EventAction {
  const e = ev as StravaEvent | null;
  if (!e || typeof e !== "object" || String(e.owner_id) !== ownerId) return { action: "ignore" };
  if (e.object_type === "athlete") return e.updates?.authorized === "false" ? { action: "deauthorize" } : { action: "ignore" };
  if (e.object_type !== "activity" || e.object_id == null) return { action: "ignore" };
  if (e.aspect_type === "create" || e.aspect_type === "update") return { action: "sync" };
  if (e.aspect_type === "delete") return { action: "verify-delete", activityId: String(e.object_id) };
  return { action: "ignore" };
}
