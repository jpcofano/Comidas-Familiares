// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { construirTextoLista, compartirLista } from "./compartirLista";
import type { ItemTexto } from "./compartirLista";

const ITEMS: ItemTexto[] = [
  { nombre: "Berenjenas",   cantidad: "2",   unidad: "unidades", seccion: "Verduleria",        comprado: false },
  { nombre: "Mozzarella",   cantidad: "200", unidad: "g",        seccion: "Fiambreria",        comprado: false },
  { nombre: "Tomate",       cantidad: "3",   unidad: "unidades", seccion: "Verduleria",        comprado: false },
  { nombre: "Aceite oliva", cantidad: "4",   unidad: "cdas",     seccion: "Almacen / secos",   comprado: false },
  { nombre: "Leche",        cantidad: "1",   unidad: "l",        seccion: "Lacteos y frescos", comprado: true  },
];

describe("construirTextoLista", () => {
  it("agrupa en el orden de góndola correcto (Verdulería antes que Fiambrería)", () => {
    const texto = construirTextoLista("Compra", null, ITEMS);
    const idxVerd  = texto.indexOf("VERDULERÍA");
    const idxFiam  = texto.indexOf("FIAMBRERÍA");
    const idxAlm   = texto.indexOf("ALMACÉN");
    expect(idxVerd).toBeLessThan(idxFiam);
    expect(idxFiam).toBeLessThan(idxAlm);
  });

  it("omite los items ya comprados", () => {
    const texto = construirTextoLista("Compra", null, ITEMS);
    expect(texto).not.toContain("Leche");
  });

  it("incluye el título con emoji 🛒", () => {
    const texto = construirTextoLista("Compra semanal", null, ITEMS);
    expect(texto).toContain("🛒 Compra semanal");
  });

  it("incluye el subtítulo cuando se pasa", () => {
    const texto = construirTextoLista("Compra", "(la hace María)", ITEMS);
    expect(texto).toContain("(la hace María)");
  });

  it("omite el subtítulo cuando es null", () => {
    const texto = construirTextoLista("Compra", null, ITEMS);
    const lineas = texto.split("\n");
    expect(lineas[1]).toBe("");
  });

  it("formato de línea: viñeta + nombre + cantidad + unidad", () => {
    const texto = construirTextoLista("Compra", null, ITEMS);
    expect(texto).toContain("• Berenjenas — 2 unidades");
    expect(texto).toContain("• Mozzarella — 200 g");
  });

  it("línea sin cantidad cuando cantidad y unidad son undefined", () => {
    const sin: ItemTexto[] = [
      { nombre: "Sal", seccion: "Almacen / secos", comprado: false },
    ];
    const texto = construirTextoLista("Lista", null, sin);
    expect(texto).toContain("• Sal");
    expect(texto).not.toContain("• Sal —");
  });

  it("cierra con '— Comida Familiar'", () => {
    const texto = construirTextoLista("Compra", null, ITEMS);
    expect(texto.trimEnd()).toContain("— Comida Familiar");
  });

  it("devuelve solo header + cierre cuando todos están comprados", () => {
    const todos: ItemTexto[] = ITEMS.map((i) => ({ ...i, comprado: true }));
    const texto = construirTextoLista("Compra", null, todos);
    expect(texto).toContain("🛒 Compra");
    expect(texto).toContain("— Comida Familiar");
    expect(texto).not.toContain("VERDULERÍA");
  });
});

describe("compartirLista", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("usa navigator.share cuando está disponible", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: shareMock, writable: true, configurable: true });
    await compartirLista("texto de prueba");
    expect(shareMock).toHaveBeenCalledWith({ text: "texto de prueba" });
  });

  it("abre wa.me cuando navigator.share no existe", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, writable: true, configurable: true });
    const openMock = vi.spyOn(window, "open").mockReturnValue(null);
    await compartirLista("hola mundo");
    expect(openMock).toHaveBeenCalledWith(
      expect.stringContaining("wa.me/?text="),
      "_blank",
      "noopener",
    );
    expect(openMock.mock.calls[0][0]).toContain(encodeURIComponent("hola mundo"));
  });

  it("no abre wa.me si el usuario cancela navigator.share", async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error("AbortError"));
    Object.defineProperty(navigator, "share", { value: shareMock, writable: true, configurable: true });
    const openMock = vi.spyOn(window, "open").mockReturnValue(null);
    await compartirLista("texto");
    expect(openMock).not.toHaveBeenCalled();
  });
});
