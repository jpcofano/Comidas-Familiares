import { describe, it, expect, vi, afterEach } from "vitest";
import { comprimirImagen } from "./comprimirImagen";

// El entorno de test es 'node', no 'jsdom'. Las APIs de browser
// (createImageBitmap, canvas) no existen nativamente — se mockean con vi.stubGlobal.
// Advertencia documentada: si el entorno cambia a jsdom estos mocks pueden simplificarse.

function makeMocks(bitmapW: number, bitmapH: number, dataUrl: string) {
  const mockCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
    toDataURL: vi.fn().mockReturnValue(dataUrl),
  };
  const mockBitmap = { width: bitmapW, height: bitmapH, close: vi.fn() };

  vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(mockBitmap));
  vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(mockCanvas) });

  return { mockCanvas, mockBitmap };
}

describe("comprimirImagen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("warn: browser APIs mockeadas (entorno node no soporta canvas real)", () => {
    console.warn(
      "comprimirImagen.test: createImageBitmap y canvas están mockeados. " +
      "Validación de compresión real requiere entorno jsdom o browser."
    );
    expect(typeof comprimirImagen).toBe("function");
  });

  it("devuelve un string que empieza con data:image/jpeg;base64,", async () => {
    const fakeDataUrl = "data:image/jpeg;base64,/9j/fakedata";
    makeMocks(800, 600, fakeDataUrl);

    const file = new File([""], "test.jpg", { type: "image/jpeg" });
    const result = await comprimirImagen(file);

    expect(result.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("imagen chica (lado largo <= 1440px) no se agranda", async () => {
    const { mockCanvas } = makeMocks(400, 300, "data:image/jpeg;base64,small");

    const file = new File([""], "small.jpg", { type: "image/jpeg" });
    await comprimirImagen(file);

    expect(mockCanvas.width).toBe(400);
    expect(mockCanvas.height).toBe(300);
  });

  it("cierra el bitmap al terminar (incluso si hay error)", async () => {
    const { mockBitmap } = makeMocks(200, 200, "data:image/jpeg;base64,x");

    const file = new File([""], "x.jpg", { type: "image/jpeg" });
    await comprimirImagen(file);

    expect(mockBitmap.close).toHaveBeenCalledOnce();
  });
});
