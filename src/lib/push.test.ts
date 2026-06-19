// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";

vi.mock("firebase/messaging", () => ({
  getMessaging: vi.fn(),
  getToken: vi.fn(),
  onMessage: vi.fn(),
  isSupported: vi.fn().mockResolvedValue(false),
}));

vi.mock("../firebase", () => ({ app: {}, db: {} }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), setDoc: vi.fn(), deleteField: vi.fn() }));

describe("pushSoportado", () => {
  it("devuelve false cuando isSupported() resuelve false", async () => {
    const { pushSoportado } = await import("./push");
    const result = await pushSoportado();
    expect(result).toBe(false);
  });
});
