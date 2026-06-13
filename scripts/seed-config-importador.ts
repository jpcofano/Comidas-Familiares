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
  (Vacuna/Cerdo/Cordero = carnes rojas · Aves = pollo/pavo/pato/cualquier ave · Vegetal = sin proteína animal, p.ej. guarniciones y postres)
escenarioUso: [uno de exactamente: Noche de a dos, Cocina rápida, Cena Especial, Celebración]
porciones: [número, ej: 4 — o rango, ej: 4 a 6]
dificultad: [uno de exactamente: Baja, Media, Media-alta, Alta]
sinLacteos: [Sí o No]
sinGluten: [Sí o No — Sí si NO lleva harina de trigo, pan, pan rallado, pasta, sémola, cuscús, cebada, centeno ni avena no certificada (ni rebozados/empanados con esos). Las harinas de almendra/coco/garbanzo y el rebozado con harina de almendra SÍ son sin gluten. Atención: la salsa de soja común contiene trigo — solo el tamari es sin gluten.]
hidratos: [Sí o No — Sí si la receta lleva hidratos integrados como arroz, pasta o papas]
esVegetariano: [Sí o No — Sí si no lleva ninguna proteína animal]
tiempoActivo: [tiempo activo en cocina, ej: 20 min — o: 1 h 30 min]
tiempoTotal: [tiempo total incluyendo esperas, ej: 45 min — o: 3 h]
costoEstimado: [uno de exactamente: Bajo, Medio, Medio/Alto, Alto]
aptoNocheDeADos: [Sí, No o Adaptable]
paraJuanPablo: [Sí o No]
paraFamilia: [Sí o No]
climaDelPlato: [uno de exactamente: Liviano, Medio, Potente]
pensadaPara: [uno de exactamente: Especial, Semana, Cualquiera]
cocina: [uno de exactamente: Argentina, Italiana, Española, Francesa, Mediterránea, China, Japonesa, Coreana, Tailandesa, India, Mexicana, Peruana, Árabe / Medio Oriente, Estadounidense, Otra]
  (campo obligatorio filtrable — elegí la cocina de ORIGEN del plato, no el estilo descriptivo; si no encaja en ninguna cocina real usá Otra)
estilo: [subtítulo libre y descriptivo, ej: "Steakhouse", "Criollo / parrilla", "Familiar rápido" — NO repetir el valor de cocina aquí]
tecnica: [uno de exactamente: Horno, Parrilla / Plancha, Salteado / Sartén, Frito, Hervido, Guiso / Braseado, Crudo / Sin cocción, Licuado / Procesado, Otra]
  (técnica principal filtrable — dejar tecnicaPrincipal para el subtítulo libre descriptivo)
hidratoOpcional: [si aplica: hidrato para servir aparte, ej: Arroz blanco — si no aplica, omitir esta línea]
notas: [notas generales — si no hay, omitir esta línea]
fuente: ChatGPT

══════════════════════════════════════════════
REGLAS PARA INGREDIENTES (importante — evita duplicados):

1. USÁ EL NOMBRE CANÓNICO si el ingrediente ya existe en la lista al final de estas instrucciones.
   Ejemplos: escribí "Tomate fresco" (no "tomatito", "tomate perita"); "Pechuga de pollo" (no "pechuga"); "Aceite de oliva" (no "un chorrito de oliva").

2. SI EL INGREDIENTE NO ESTÁ en la lista, agregalo igual con su nombre claro en singular y sin marca.
   NO lo fuerces a parecerse a otro que no corresponda.
   Pero COMPLETÁ SIEMPRE las últimas 3 columnas (categoria, rolNutricional, seccionGondola) con los valores cerrados de abajo.

3. El campo "seccion" del ingrediente (Principal, Base de sabor, etc.) es la sección DENTRO de la receta — no confundir con la góndola del super.

DIMENSIONES CERRADAS PARA CLASIFICAR INGREDIENTES NUEVOS (elegí solo de estas):

categoria (17 valores): Aceite y grasa · Caldo y fondo · Carne · Cereal y derivado · Condimento y aderezo · Despensa varios · Endulzante · Fiambre y embutido · Fruta · Hierba y especia · Huevo · Lacteo · Legumbre · Pescado y marisco · Semilla y fruto seco · Utensilio · Verdura

rolNutricional (6 valores, puede ser uno o varios separados por coma): Proteina · Neutro · Grasa · Fibra/Vegetal · Hidrato · Azucar/Dulce

seccionGondola (9 valores): Verduleria · Carniceria · Pescaderia · Fiambreria · Lacteos y frescos · Almacen / secos · Panaderia · Despensa / otros · Bazar / otros

Criterios: categoria por uso culinario (palta y tomate = Verdura); productos compuestos por su forma final (passata = Despensa, leche de coco = Despensa); rolNutricional independiente de categoria (palta = Verdura pero rol Grasa); góndola por dónde se compra.

INGREDIENTES CANÓNICOS DISPONIBLES — usá estos nombres exactos si aplican:
Aceite y grasa: Aceite de coco, Aceite de oliva, Aceite de oliva suave, Neutro
Caldo y fondo: Caldo de verduras
Carne: Aguja, Alita de pollo, Asado de tira, Bife ancho, Bife angosto, Bife de chorizo, Bifecitos de cuadril, Bondiola, Bondiola de cerdo entera, Caldo de carne, Caldo de pollo, Carne picada, Carne vacuna en cubos, Carne vacuna en tiras, Carré de cerdo, Cerdo en tiras, Chorizo, Churrasquitos de cerdo, Colita de cuadril, Cuadril, Entrana, Falda, Lomo, Matambre, Morcilla, Muslos, Nalga, Ojo de bife, Osobuco, Paleta, Panceta, Pata muslo de pollo, Pavita, Peceto, Pechito de cerdo, Pechuga de pollo, Pollo cocido desmenuzado, Pollo deshuesado, Pollo en cubos, Pollo en tiras, Ribs de cerdo, Roast beef, Suprema de pollo, Tapa de asado, Vacío
Cereal y derivado: Arroz cocido, Arroz jazmin, Arroz largo fino, Arroz yamaní, Avena arrollada, Baguette, Batatas, Cous cous, Fideos secos, Galletas de arroz, Granola, Harina 0000, Harina integral, Pan, Pan de campo, Pan de hamburguesa, Pan pita, Pan rallado, Pan tostado, Papa, Polenta, Rebanadas de pan, Salvado de avena, Tortillas, Tostadas integrales, Vinagre de arroz
Condimento y aderezo: Aceitunas negras, Aceitunas verdes, Mostaza, Mostaza dijon, Sal fina, Sal gruesa, Salsa de soja, Sriracha, Vinagre de manzana, Vinagre de vino
Despensa varios: Agua, Bicarbonato de sodio, Cacao amargo, Chocolate 85%, Chocolate 90%, Esencia de vainilla, Leche de coco, Passata de tomate, Polvo de hornear, Tomate triturado, Vino blanco seco, Vino malbec, Vino tinto, Whey protein powder
Endulzante: Azucar mascabo, Bebida de coco sin azucar, Bebida vegetal sin azucar, Edulcorante apto, Eritritol, Miel, Miel azucar mascabo
Fiambre y embutido: Jamon cocido natural
Fruta: Ananá, Arándano, Banana, Ciruela, Damasco, Durazno, Frutilla, Frutillas, Higo, Kiwi, Limon, Mandarina, Manzana roja, Manzana verde, Melón, Naranja, Pera, Pomelo, Ralladura de limon, Sandía, Uva
Hierba y especia: Aji molido, Aji picante, Ajo en polvo, Azafran, Canela, Cascara de limon, Ciboulette, Cilantro, Clavo de olor, Comino, Coriandro, Curcuma, Curry suave, Especias grill, Jengibre fresco, Laurel, Menta, Nuez moscada, Oregano, Peperoncino, Perejil, Pimenton, Pimenton ahumado, Pimenton dulce, Pimienta negra, Romero, Tomillo
Huevo: Claras de huevo, Huevos, Yemas de huevo
Lacteo: Crema de leche, Dulce de leche, Fresco, Griego, Leche descremada, Leche entera, Manteca, Muzzarella, Provoleta, Queso crema, Queso cremoso, Queso fresco, Queso port salut, Queso rallado, Queso untable, Ricota, Yogur griego, Yogur natural, Yogur vegetal sin azucar
Legumbre: Arveja seca, Garbanzo seco, Garbanzos en lata, Garbanzos secos, Lenteja seca, Poroto colorado, Poroto negro
Pescado y marisco: Abadejo, Atun al natural, Atún fresco, Calamar, Calamares limpios, Caldo de pescado, Camarón, Corvina, Filetes de merluza, Langostino, Langostinos, Lenguado, Mejillones, Mejillón, Merluza, Merluza negra, Pejerrey, Salmón, Trucha
Semilla y fruto seco: Aceite de sesamo, Almendra sin azucar, Almendras, Chia, Coco rallado extra, Coco rallado sin azucar, Harina de almendra, Harina de coco, Mani, Nueces, Pasta de mani sin azucar, Psyllium, Semillas de calabaza, Semillas de girasol, Semillas de lino, Semillas de sesamo, Tahini
Verdura: Acelga, Ajo, Apio, Batata, Berenjenas, Brócoli, Calabaza, Cebolla, Cebolla de verdeo, Cebolla morada, Champignon, Chaucha, Chauchas, Choclo, Coliflor, Echalote, Endibia, Escarola, Esparragos, Espinaca, Hinojo, Hojas verdes, Kale, Lechuga, Morron rojo, Morrón verde, Nabo, Palta, Pepino, Portobello, Puerro, Rabanito, Radicheta, Remolacha, Repollo blanco, Repollo colorado, Rucula, Tomate fresco, Tomates cherry, Zanahoria, Zapallito, Zapallo, Zucchini
══════════════════════════════════════════════

#INGREDIENTES
seccion | ingrediente | preparacion | cantidad | unidad | opcional | notas | categoria | rolNutricional | seccionGondola
[sección, ej Principal] | [ingrediente] | [preparación — vacío si no aplica] | [cantidad numérica] | [unidad: g, kg, ml, l, u, cda, cdita, taza, pizca, diente, rama, etc.] | [Sí o No] | [notas — vacío si no aplica] | [solo si es NUEVO: categoria] | [solo si es NUEVO: rol(es) separados por coma] | [solo si es NUEVO: seccionGondola]

#PASOS
nroPaso | titulo | detalle | tiempoEstimadoLabel | puntoClave | errorComun | notas
[número] | [título corto] | [instrucción completa] | [N min — vacío si no hay] | [punto clave — vacío si no hay] | [error común — vacío si no hay] | [notas — vacío si no hay]

══════════════════════════════════════════════
EJEMPLO:

ENTRADA (receta en prosa):
"Pollo al curry rojo. Sellar muslos de pollo, hacer una base con cebolla y pasta de curry rojo, agregar leche de coco y cocinar 25 minutos. Agregar un poco de pasta de pimientos asados (ingrediente nuevo). Sirve 4, tiempo activo 20 min, total 45 min, dificultad baja."

SALIDA esperada:
#RECETA
nombre: Pollo al curry rojo
tipoItem: Receta principal
proteinaPrincipal: Aves
escenarioUso: Cocina rápida
porciones: 4
dificultad: Baja
sinLacteos: No
sinGluten: No
hidratos: No
esVegetariano: No
tiempoActivo: 20 min
tiempoTotal: 45 min
costoEstimado: Bajo
aptoNocheDeADos: Adaptable
paraJuanPablo: Sí
paraFamilia: Sí
climaDelPlato: Medio
pensadaPara: Semana
cocina: India
estilo: Curry cremoso
tecnica: Salteado / Sartén
fuente: ChatGPT

#INGREDIENTES
seccion | ingrediente | preparacion | cantidad | unidad | opcional | notas | categoria | rolNutricional | seccionGondola
Principal | Pechuga de pollo | sin piel, en cubos | 800 | g | No | | | |
Base de sabor | Cebolla | picada | 1 | u | No | | | |
Base de sabor | Pasta de curry rojo | | 2 | cda | No | Maesri o similar | | |
Líquidos | Leche de coco | | 400 | ml | No | | | |
Condimentos | Pasta de pimientos asados | | 1 | cda | No | ingrediente nuevo | Condimento y aderezo | Neutro | Almacen / secos

#PASOS
nroPaso | titulo | detalle | tiempoEstimadoLabel | puntoClave | errorComun | notas
1 | Saltear base | Dorar la cebolla en aceite a fuego medio, agregar la pasta de curry y cocinar 1 minuto. | 6 min | La pasta debe fraguar en el aceite antes de agregar el pollo. | No saltear suficiente el curry. |
2 | Sellar pollo | Agregar los cubos de pollo y sellar 3 min por lado. | 6 min | Secar el pollo antes para que se selle bien. | Sellar carne húmeda. |
3 | Cocción con coco | Agregar la leche de coco y la pasta de pimientos, tapar y cocinar a fuego suave. | 25 min | | |

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
