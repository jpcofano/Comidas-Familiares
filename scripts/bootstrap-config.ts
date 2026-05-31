import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SERVICE_ACCOUNT_PATH = resolve("scripts/service-account.json");

if (!existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`
ERROR: No se encontró el service account en ${SERVICE_ACCOUNT_PATH}

Para generarlo:
  1. Abrí Firebase Console → https://console.firebase.google.com/project/comida-familiar
  2. Engranaje (⚙) → Project Settings → pestaña "Service accounts"
  3. Clic en "Generate new private key" → confirmar
  4. Renombrá el archivo descargado a "service-account.json"
  5. Guardalo en scripts/service-account.json dentro de este repo
  6. Volvé a correr: npm run bootstrap:config
`);
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, "utf-8"));

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const familia = {
  miembros: {
    juanpablo: {
      nombre: "Juan Pablo",
      rol: "padre",
      mails: ["jpcofano@gmail.com"]
    },
    maria: {
      nombre: "María",
      rol: "madre",
      mails: ["marialascano@gmail.com", "maria.lascano@accenture.com"]
    },
    sofia: {
      nombre: "Sofía",
      rol: "hija",
      mails: ["sofiacofano@gmail.com"]
    },
    federico: {
      nombre: "Federico",
      rol: "hijo",
      mails: ["fedecofano1@gmail.com"]
    }
  },
  owner: "juanpablo",
  timezone: "America/Argentina/Buenos_Aires",
  semanaArrancaEn: "lunes"
};

const diccionarios = {
  tiposItem: [
    "Receta principal", "Entrada", "Guarnición", "Postre",
    "Panificado", "Snack", "Desayuno", "Conserva",
    "Hidrato opcional", "Componente"
  ],
  proteinas: [
    // E9.0: jerarquía 2 niveles — estas son las hojas (valores de recetas)
    "Vacuna", "Cerdo", "Cordero",           // Carnes rojas
    "Aves",                                  // ex-Pollo
    "Pescado", "Mariscos",
    "Huevos",
    "Legumbres", "Semillas", "Frutos secos", // Vegetales proteicos
    "Vegetal",                               // ex-Vegetariana/Mixta sin proteína
  ],
  escenarios: ["Noche de a dos", "Cocina rápida", "Cena Especial", "Celebración"],
  climaPlato: ["Liviano", "Medio", "Potente"],
  pensadaPara: ["Especial", "Semana", "Cualquiera"],
  tiposPlan: ["Especial", "Especial extra", "En proceso"],
  ocasiones: ["Cena familiar", "Con invitados", "Cumpleaños", "Celebración", "Otra"],
  aptoNocheDeADos: ["Sí", "No", "Adaptable"],
  dificultades: ["Baja", "Media", "Media-alta", "Alta"],
  costos: ["Bajo", "Medio", "Medio/Alto", "Alto"],
  miembros: [
    { id: "juanpablo", nombre: "Juan Pablo", rol: "padre" },
    { id: "maria",     nombre: "María",      rol: "madre" },
    { id: "sofia",     nombre: "Sofía",      rol: "hija"  },
    { id: "federico",  nombre: "Federico",   rol: "hijo"  }
  ],
  estadosPlan: {
    activos: ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"],
    finales: ["Evaluada"]
  },
  seccionesIngredientes: [
    "Principal", "Base de sabor", "Líquido de cocción",
    "Condimentos", "Cocción", "Guarnición baja en hidratos",
    "Opcional familia"
  ],
  unidadesCanonicas: [
    "g", "kg", "ml", "l", "unidad", "unidades",
    "cda", "cdta", "taza", "pizca", "gusto"
  ],
  version: 1,
  ultimaActualizacion: Timestamp.now()
};

async function main() {
  try {
    // Verify connection by reading project ID from the service account
    const projectId = serviceAccount.project_id as string;
    console.log(`✓ Conectado al proyecto: ${projectId}`);

    await db.collection("config").doc("familia").set(familia);
    const totalMails =
      Object.values(familia.miembros).reduce((acc, m) => acc + m.mails.length, 0);
    const nombres = Object.values(familia.miembros).map(m => m.nombre).join(", ");
    console.log(`✓ Escrito /config/familia (4 miembros: ${nombres} — ${totalMails} mails autorizados)`);

    await db.collection("config").doc("diccionarios").set(diccionarios);
    console.log("✓ Escrito /config/diccionarios (10 enums + miembros + estados + secciones + unidades)");

    console.log("✓ Bootstrap completo. Ahora ya pueden loguearse los miembros.");
    process.exit(0);
  } catch (err) {
    console.error("ERROR durante el bootstrap:", err);
    process.exit(1);
  }
}

main();
