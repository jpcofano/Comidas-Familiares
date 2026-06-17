import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks hoisted (deben estar antes de los imports del módulo bajo test) ────

const mockUpdate = vi.hoisted(() => vi.fn());
const mockCommit = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("firebase/firestore", () => ({
  writeBatch: vi.fn(() => ({ update: mockUpdate, commit: mockCommit })),
  doc: vi.fn((_db: unknown, _col: string, id: string) => `ref/${id}`),
  arrayUnion: vi.fn((id: string) => ({ _op: "arrayUnion", id })),
  arrayRemove: vi.fn((id: string) => ({ _op: "arrayRemove", id })),
  serverTimestamp: vi.fn(() => null),
  // Resto — no se usan en setEquivalencia/quitarEquivalencia pero deben existir
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
}));

vi.mock("../firebase", () => ({ db: {} }));

import { setEquivalencia, quitarEquivalencia } from "./ingredientes";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("setEquivalencia — simetría", () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockCommit.mockClear().mockResolvedValue(undefined);
  });

  it("actualiza los dos docs en el mismo batch", async () => {
    await setEquivalencia("ING-0001", "ING-0002");
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledOnce();
  });

  it("agrega ING-0002 a ING-0001", async () => {
    await setEquivalencia("ING-0001", "ING-0002");
    const [ref1, patch1] = mockUpdate.mock.calls[0];
    expect(ref1).toContain("ING-0001");
    expect(patch1.equivalencias).toMatchObject({ _op: "arrayUnion", id: "ING-0002" });
  });

  it("agrega ING-0001 a ING-0002 (simetría)", async () => {
    await setEquivalencia("ING-0001", "ING-0002");
    const [ref2, patch2] = mockUpdate.mock.calls[1];
    expect(ref2).toContain("ING-0002");
    expect(patch2.equivalencias).toMatchObject({ _op: "arrayUnion", id: "ING-0001" });
  });
});

describe("quitarEquivalencia — simetría", () => {
  beforeEach(() => {
    mockUpdate.mockClear();
    mockCommit.mockClear().mockResolvedValue(undefined);
  });

  it("actualiza los dos docs en el mismo batch", async () => {
    await quitarEquivalencia("ING-0001", "ING-0002");
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalledOnce();
  });

  it("quita ING-0002 de ING-0001", async () => {
    await quitarEquivalencia("ING-0001", "ING-0002");
    const [ref1, patch1] = mockUpdate.mock.calls[0];
    expect(ref1).toContain("ING-0001");
    expect(patch1.equivalencias).toMatchObject({ _op: "arrayRemove", id: "ING-0002" });
  });

  it("quita ING-0001 de ING-0002 (simetría)", async () => {
    await quitarEquivalencia("ING-0001", "ING-0002");
    const [ref2, patch2] = mockUpdate.mock.calls[1];
    expect(ref2).toContain("ING-0002");
    expect(patch2.equivalencias).toMatchObject({ _op: "arrayRemove", id: "ING-0001" });
  });
});
