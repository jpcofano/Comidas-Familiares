/**
 * Seed idempotente de /config/importador con el prompt modelo para LLM.
 * JP puede editar el campo promptLLM desde la consola de Firebase sin tocar código.
 *
 * Uso:
 *   npx ts-node --esm scripts/seed-config-importador.ts
 *   npx ts-node --esm scripts/seed-config-importador.ts --dry-run
 */
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`
ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}

Para generarlo:
  1. Abrí Firebase Console → Engranaje (⚙) → Project Settings → Service accounts
  2. Clic en "Generate new private key" → confirmar
  3. Renombrá el archivo a "service-account.json" y guardalo en scripts/
  4. Volvé a correr el script
`);
  process.exit(1);
}

initializeApp({ credential: cert(SERVICE_ACCOUNT_PATH) });
const db = getFirestore();

// ─── Prompt modelo ────────────────────────────────────────────────────────────

const PROMPT_LLM = `Sos un asistente culinario que convierte recetas en lenguaje natural a un formato TXT estructurado.

El usuario te va a pegar una receta escrita en texto libre. Tu tarea es convertirla al formato exacto que se muestra abajo, respetando todos los marcadores, separadores y valores posibles. **Devolvé únicamente el TXT formateado, sin explicaciones, sin texto antes ni después, sin bloques de código.**

══════════════════════════════════════════════
FORMATO ESPERADO:

#RECETA
nombre: [nombre completo de la receta]
tipoItem: [uno de exactamente: Receta principal, Entrada, Guarnición, Postre, Panificado, Snack, Desayuno, Conserva, Hidrato opcional]
proteinaPrincipal: [uno de exactamente: Vacuna, Cerdo, Cordero, Aves, Pescado, Mariscos, Huevos, Legumbres, Semillas, Frutos secos, Vegetal]
escenarioUso: [uno de exactamente: Noche de a dos, Cocina rápida, Cena Especial, Celebración]
porciones: [número, ej: 4 — o rango, ej: 4 a 6]
dificultad: [uno de exactamente: Baja, Media, Media-alta, Alta]
sinLacteos: [Sí o No]
hidratos: [Sí o No — Sí si la receta lleva hidratos integrados como arroz, pasta o papas]
tiempoActivo: [tiempo activo en cocina, ej: 20 min — o: 1 h 30 min]
tiempoTotal: [tiempo total incluyendo esperas, ej: 45 min — o: 3 h]
costoEstimado: [uno de exactamente: Bajo, Medio, Medio/Alto, Alto]
aptoNocheDeADos: [Sí, No o Adaptable]
paraJuanPablo: [Sí o No]
paraFamilia: [Sí o No]
climaDelPlato: [uno de exactamente: Liviano, Medio, Potente]
pensadaPara: [uno de exactamente: Especial, Semana, Cualquiera]
cocina: [OPCIONAL — uno de exactamente: Argentina, Italiana, Española, Francesa, Mediterránea, China, Japonesa, Coreana, Tailandesa, India, Mexicana, Peruana, Árabe / Medio Oriente, Estadounidense, Otra — omitir si no aplica o no está claro]
hidratoOpcional: [si aplica: hidrato para servir aparte, ej: Arroz blanco — si no aplica, omitir esta línea]
notas: [notas generales — si no hay, omitir esta línea]
fuente: ChatGPT

#INGREDIENTES
seccion | ingrediente | preparacion | cantidad | unidad | opcional | notas
[sección, ej Principal] | [ingrediente] | [preparación — vacío si no aplica] | [cantidad numérica] | [unidad: g, kg, ml, l, u, cda, cdita, taza, pizca, diente, rama, etc.] | [Sí o No] | [notas — vacío si no aplica]

#PASOS
nroPaso | titulo | detalle | tiempoEstimadoLabel | puntoClave | errorComun | notas
[número] | [título corto] | [instrucción completa] | [N min — vacío si no hay] | [punto clave — vacío si no hay] | [error común — vacío si no hay] | [notas — vacío si no hay]

══════════════════════════════════════════════
EJEMPLO:

ENTRADA (receta en prosa):
"Pollo al curry rojo. Sellar muslos de pollo, hacer una base con cebolla y pasta de curry rojo, agregar leche de coco y cocinar 25 minutos. Sirve 4, tiempo activo 20 min, total 45 min, dificultad baja."

SALIDA esperada:
#RECETA
nombre: Pollo al curry rojo
tipoItem: Receta principal
proteinaPrincipal: Pollo
escenarioUso: Cocina rápida
porciones: 4
dificultad: Baja
sinLacteos: No
hidratos: No
tiempoActivo: 20 min
tiempoTotal: 45 min
costoEstimado: Bajo
aptoNocheDeADos: Adaptable
paraJuanPablo: Sí
paraFamilia: Sí
climaDelPlato: Medio
pensadaPara: Semana
fuente: ChatGPT

#INGREDIENTES
seccion | ingrediente | preparacion | cantidad | unidad | opcional | notas
Principal | Muslos de pollo | sin piel | 800 | g | No |
Base de sabor | Cebolla | picada | 1 | u | No |
Base de sabor | Pasta de curry rojo | | 2 | cda | No | Maesri o similar
Líquidos | Leche de coco | | 400 | ml | No |

#PASOS
nroPaso | titulo | detalle | tiempoEstimadoLabel | puntoClave | errorComun | notas
1 | Saltear base | Dorar la cebolla en aceite a fuego medio, agregar la pasta de curry y cocinar 1 minuto. | 6 min | La pasta debe fraguar en el aceite antes de agregar el pollo. | No saltear suficiente el curry. |
2 | Sellar pollo | Agregar los muslos y sellar 3 min por lado. | 6 min | Secar el pollo antes para que se selle bien. | Sellar carne húmeda. |
3 | Cocción con coco | Agregar la leche de coco, tapar y cocinar a fuego suave. | 25 min | | |

══════════════════════════════════════════════
Ahora convertí la receta que te voy a pegar. Devolvé solo el TXT:`;

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ref = db.doc("config/importador");
  const snap = await ref.get();

  if (snap.exists) {
    const existing = snap.data()?.promptLLM as string | undefined;
    if (existing && existing.trim().length > 0) {
      if (!FORCE) {
        console.log("✓ /config/importador ya existe con promptLLM — no se sobreescribe.");
        console.log(`  (${existing.length} caracteres)`);
        console.log("  Usá --force para sobreescribir (ej: tras agregar nuevos campos al prompt).");
        if (DRY_RUN) console.log("[DRY RUN] Sin cambios.");
        return;
      }
      console.log("⚡ --force activo: sobreescribiendo promptLLM existente.");
    }
  }

  const payload = {
    promptLLM: PROMPT_LLM,
    ultimaActualizacion: Timestamp.now(),
  };

  if (DRY_RUN) {
    console.log("[DRY RUN] Se escribiría /config/importador:");
    console.log(`  promptLLM: ${PROMPT_LLM.length} caracteres`);
    return;
  }

  await ref.set(payload);
  console.log("✓ /config/importador sembrado correctamente.");
  console.log(`  promptLLM: ${PROMPT_LLM.length} caracteres`);
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
