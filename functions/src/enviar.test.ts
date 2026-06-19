import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks de firebase-admin ─────────────────────────────────────────────────

const sendEachForMulticastMock = vi.fn().mockResolvedValue({ responses: [] });

vi.mock("firebase-admin", () => ({
  apps: ["mock"],  // evita initializeApp
  initializeApp: vi.fn(),
  firestore: vi.fn(() => ({
    doc: vi.fn((path: string) => ({
      get: vi.fn(async () => {
        if (path === "config/pushTokens") return { data: () => TOKENS_FIXTURE };
        if (path === "config/perfiles")   return { data: () => PERFILES_FIXTURE };
        return { data: () => undefined };
      }),
    })),
  })),
  messaging: vi.fn(() => ({ sendEachForMulticast: sendEachForMulticastMock })),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TOKENS_FIXTURE = {
  juanpablo: { "token-jp-1": true, "token-jp-2": true },
  maria:     { "token-maria-1": true },
  sofia:     { "token-sofia-1": true },
  federico:  { "token-fede-1": true },
};

// sofia tiene compras=false, federico tiene comida=false
const PERFILES_FIXTURE = {
  juanpablo: { notif: { comida: true,  compras: true  } },
  maria:     { notif: { comida: true,  compras: true  } },
  sofia:     { notif: { comida: true,  compras: false } },
  federico:  { notif: { comida: false, compras: true  } },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("notificarFamilia", () => {
  beforeEach(() => { sendEachForMulticastMock.mockClear(); });

  it("notificación de comida llega a quienes tienen comida=true (excluye federico)", async () => {
    const { notificarFamilia } = await import("./enviar");
    await notificarFamilia("comida", { title: "T", body: "B", url: "/" });
    const [call] = sendEachForMulticastMock.mock.calls as [{ tokens: string[] }][];
    // juanpablo (2 tokens) + maria (1) + sofia (1) = 4; federico excluido (comida=false)
    expect(call.tokens).toHaveLength(4);
    expect(call.tokens).not.toContain("token-fede-1");
    expect(call.tokens).toContain("token-sofia-1");
  });

  it("notificación de compras llega a quienes tienen compras=true (excluye sofia)", async () => {
    const { notificarFamilia } = await import("./enviar");
    await notificarFamilia("compras", { title: "T", body: "B", url: "/compras" });
    const [call] = sendEachForMulticastMock.mock.calls as [{ tokens: string[] }][];
    // juanpablo (2) + maria (1) + federico (1) = 4; sofia excluida (compras=false)
    expect(call.tokens).toHaveLength(4);
    expect(call.tokens).not.toContain("token-sofia-1");
    expect(call.tokens).toContain("token-fede-1");
  });

  it("excluye al generador (memberId en excluir)", async () => {
    const { notificarFamilia } = await import("./enviar");
    await notificarFamilia("compras", { title: "T", body: "B", url: "/" }, "juanpablo");
    const [call] = sendEachForMulticastMock.mock.calls as [{ tokens: string[] }][];
    expect(call.tokens).not.toContain("token-jp-1");
    expect(call.tokens).not.toContain("token-jp-2");
  });

  it("no llama a sendEach si no hay tokens destinatarios", async () => {
    // Sobreescribir fixture: todos excluidos o sin tokens
    vi.doMock("firebase-admin", () => ({
      apps: ["mock"],
      initializeApp: vi.fn(),
      firestore: vi.fn(() => ({
        doc: vi.fn((path: string) => ({
          get: vi.fn(async () => {
            if (path === "config/pushTokens") return { data: () => ({}) };
            return { data: () => ({}) };
          }),
        })),
      })),
      messaging: vi.fn(() => ({ sendEachForMulticast: sendEachForMulticastMock })),
    }));
    const { notificarFamilia } = await import("./enviar");
    await notificarFamilia("comida", { title: "T", body: "B", url: "/" });
    expect(sendEachForMulticastMock).not.toHaveBeenCalled();
  });
});
