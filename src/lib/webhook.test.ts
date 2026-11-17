import { describe, expect, it } from "vitest";
import { classifyEvent } from "./webhook";

const OWNER = "111";
const ev = (o: object) => ({ object_type: "activity", aspect_type: "create", object_id: 5, owner_id: 111, subscription_id: 1, event_time: 1, updates: {}, ...o });

describe("classifyEvent", () => {
  it("synchronise à la création et à la modification d'une activité", () => {
    expect(classifyEvent(ev({}), OWNER)).toEqual({ action: "sync" });
    expect(classifyEvent(ev({ aspect_type: "update", updates: { title: "x" } }), OWNER)).toEqual({ action: "sync" });
  });
  it("vérifie auprès de Strava avant de supprimer (les événements ne sont pas signés)", () => {
    expect(classifyEvent(ev({ aspect_type: "delete" }), OWNER)).toEqual({ action: "verify-delete", activityId: "5" });
  });
  it("coupe la connexion quand l'athlète révoque l'accès", () => {
    expect(classifyEvent(ev({ object_type: "athlete", aspect_type: "update", updates: { authorized: "false" } }), OWNER)).toEqual({ action: "deauthorize" });
  });
  it("ignore les événements d'un autre athlète ou mal formés", () => {
    expect(classifyEvent(ev({ owner_id: 222 }), OWNER)).toEqual({ action: "ignore" });
    expect(classifyEvent(null, OWNER)).toEqual({ action: "ignore" });
    expect(classifyEvent({ object_type: "activity" }, OWNER)).toEqual({ action: "ignore" });
    expect(classifyEvent(ev({ object_type: "athlete", updates: {} }), OWNER)).toEqual({ action: "ignore" });
  });
});
