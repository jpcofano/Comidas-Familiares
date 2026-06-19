import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { notificarFamilia } from "./enviar";

/** Dispara al publicarse una comida nueva (plan que no es compra rápida). */
export const avisoComida = onDocumentCreated("planes/{id}", async (event) => {
  const p = event.data?.data();
  if (!p) return;
  if (p.tipoSeleccion === "compra-rapida") return;

  const nombre = (p.nombreSeleccion ?? p.recetaPrincipal ?? "Comida") as string;
  await notificarFamilia("comida", {
    title: "Comida Familiar",
    body: `Hay ${nombre} 🍽 Tocá para ver el plato.`,
    url: `/planes/${event.params.id}`,
  });
});

/** Dispara al generarse una compra rápida; excluye al generador si se guardó `generadaPor`. */
export const avisoCompra = onDocumentCreated("planes/{id}", async (event) => {
  const p = event.data?.data();
  if (!p || p.tipoSeleccion !== "compra-rapida") return;

  const destino = ((p.nombreSeleccion ?? "Compra") as string).replace(/^Compra rápida · /, "");
  const n = ((p.itemsCompraRapida ?? []) as unknown[]).length;

  await notificarFamilia(
    "compras",
    {
      title: "Comida Familiar",
      body: `Nueva lista · ${destino} (${n} ítems). ¿Quién se encarga?`,
      url: "/compras",
    },
    (p.generadaPor as string | undefined) ?? undefined,
  );
});
