import { describe, it, expect } from "vitest";
import { groupByGondola, SECCIONES, ORDEN_GONDOLA_DISPLAY } from "./gondolas";

describe("ORDEN_GONDOLA_DISPLAY", () => {
  it("tiene 6 secciones", () => {
    expect(ORDEN_GONDOLA_DISPLAY).toHaveLength(6);
  });

  it("incluye Fiambrería como sección propia", () => {
    expect(ORDEN_GONDOLA_DISPLAY).toContain("Fiambrería");
  });

  it("mantiene Carnicería como sección separada", () => {
    expect(ORDEN_GONDOLA_DISPLAY).toContain("Carnicería");
  });
});

describe("SECCIONES", () => {
  it("Fiambrería tiene letra F y color rosado", () => {
    expect(SECCIONES["Fiambrería"].letra).toBe("F");
    expect(SECCIONES["Fiambrería"].color).toContain("350"); // hue rosado
  });

  it("Carnicería mantiene letra C y color rojo", () => {
    expect(SECCIONES["Carnicería"].letra).toBe("C");
    expect(SECCIONES["Carnicería"].color).toContain("25"); // hue rojo
  });
});

describe("groupByGondola — Fiambrería propia", () => {
  it("ítem con seccionGondola Fiambreria cae en grupo Fiambrería", () => {
    const items = [{ seccionGondola: "Fiambreria", nombre: "Jamón cocido" }];
    const grupos = groupByGondola(items);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].seccion).toBe("Fiambrería");
  });

  it("ítem con Fiambreria y ítem con Carniceria quedan en grupos distintos", () => {
    const items = [
      { seccionGondola: "Fiambreria", nombre: "Salame" },
      { seccionGondola: "Carniceria", nombre: "Asado" },
    ];
    const grupos = groupByGondola(items);
    expect(grupos).toHaveLength(2);
    const secciones = grupos.map((g) => g.seccion);
    expect(secciones).toContain("Fiambrería");
    expect(secciones).toContain("Carnicería");
  });

  it("Pescaderia sigue cayendo en Carnicería", () => {
    const items = [{ seccionGondola: "Pescaderia", nombre: "Merluza" }];
    const grupos = groupByGondola(items);
    expect(grupos[0].seccion).toBe("Carnicería");
  });

  it("Fiambrería aparece entre Carnicería y Lácteos en el orden canónico", () => {
    const items = [
      { seccionGondola: "Lacteos y frescos", nombre: "Leche" },
      { seccionGondola: "Fiambreria", nombre: "Mortadela" },
      { seccionGondola: "Carniceria", nombre: "Carne picada" },
    ];
    const grupos = groupByGondola(items);
    const secciones = grupos.map((g) => g.seccion);
    expect(secciones.indexOf("Carnicería")).toBeLessThan(secciones.indexOf("Fiambrería"));
    expect(secciones.indexOf("Fiambrería")).toBeLessThan(secciones.indexOf("Lácteos"));
  });
});
