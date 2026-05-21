import { describe, it, expect } from "vitest";
import { ok, err, unwrap } from "./result";

describe("Result", () => {
  it("ok returns { ok: true, value }", () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });

  it("err returns { ok: false, error }", () => {
    expect(err("test-code", "test msg")).toEqual({
      ok: false,
      error: { code: "test-code", message: "test msg" },
    });
  });

  it("unwrap(ok(42)) returns 42", () => {
    expect(unwrap(ok(42))).toBe(42);
  });

  it("unwrap(err(...)) throws", () => {
    expect(() => unwrap(err("oops", "something failed"))).toThrow();
  });
});
