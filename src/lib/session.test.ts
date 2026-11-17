import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "./session";

const SECRET = "un-secret-de-test-assez-long";

describe("session", () => {
  it("accepte un cookie qu'on vient de signer", () => {
    const c = signSession(123, SECRET, 1000, 60);
    expect(verifySession(c, SECRET, 1030)).toBe(123);
  });
  it("refuse un cookie expiré", () => {
    const c = signSession(123, SECRET, 1000, 60);
    expect(verifySession(c, SECRET, 1061)).toBeNull();
  });
  it("refuse un cookie modifié", () => {
    const c = signSession(123, SECRET, 1000, 60);
    expect(verifySession(c.replace("123", "999"), SECRET, 1010)).toBeNull();
  });
  it("refuse un mauvais secret", () => {
    const c = signSession(123, SECRET, 1000, 60);
    expect(verifySession(c, "autre-secret", 1010)).toBeNull();
  });
  it("refuse n'importe quoi", () => {
    expect(verifySession(undefined, SECRET, 1)).toBeNull();
    expect(verifySession("", SECRET, 1)).toBeNull();
    expect(verifySession("a.b", SECRET, 1)).toBeNull();
  });
});
