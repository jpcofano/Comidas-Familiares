// ─── Alias: Firestore Timestamp sin importar firebase en este módulo ──────────
export type FirestoreTimestamp = { seconds: number; nanoseconds: number };

// ─── Miembros ─────────────────────────────────────────────────────────────────
export const MIEMBRO_IDS = ["juanpablo", "maria", "sofia", "federico"] as const;
export type MiembroId = typeof MIEMBRO_IDS[number];

export type Rol = "padre" | "madre" | "hija" | "hijo" | "invitado";

// ─── Plan ─────────────────────────────────────────────────────────────────────
export const ESTADOS_PLAN_ACTIVOS = ["Elegida", "Compra pendiente", "Compra lista", "Cocinando", "Cocinada"] as const;
export const ESTADOS_PLAN_FINALES = ["Evaluada"] as const;
export const ESTADOS_PLAN = [...ESTADOS_PLAN_ACTIVOS, ...ESTADOS_PLAN_FINALES] as const;
export type EstadoPlan = typeof ESTADOS_PLAN[number];

export const TIPOS_PLAN = ["Especial", "Especial extra", "En proceso"] as const;
export type TipoPlan = typeof TIPOS_PLAN[number];

export type TipoSeleccion = "receta" | "menu";

// ─── Receta — enums de dominio ────────────────────────────────────────────────
export const TIPOS_ITEM = [
  "Receta principal", "Entrada", "Guarnición", "Postre",
  "Panificado", "Snack", "Desayuno", "Conserva", "Hidrato opcional",
] as const;
export type TipoItem = typeof TIPOS_ITEM[number];

export const PROTEINAS = [
  // Proteína animal
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado", "Mariscos", "Huevos", "Fiambre",
  // Proteína vegetal
  "Legumbres", "Semillas", "Frutos secos",
  // Meta-valores
  "Mixta", "Vegetariana",
] as const;
export type Proteina = typeof PROTEINAS[number];

export const ESCENARIOS = ["Noche de a dos", "Cocina rápida", "Cena Especial", "Celebración"] as const;
export type Escenario = typeof ESCENARIOS[number];

export const CLIMAS_PLATO = ["Liviano", "Medio", "Potente"] as const;
export type ClimaPlato = typeof CLIMAS_PLATO[number];

export const PENSADA_PARA = ["Especial", "Semana", "Cualquiera"] as const;
export type PensadaPara = typeof PENSADA_PARA[number];

export const COCINAS = [
  "Argentina", "Italiana", "Española", "Francesa", "Mediterránea",
  "China", "Japonesa", "Coreana", "Tailandesa", "India", "Mexicana",
  "Peruana", "Árabe / Medio Oriente", "Estadounidense", "Otra",
] as const;
export type Cocina = typeof COCINAS[number];

export const DIFICULTADES = ["Baja", "Media", "Media-alta", "Alta"] as const;
export type Dificultad = typeof DIFICULTADES[number];

export const COSTOS = ["Bajo", "Medio", "Medio/Alto", "Alto"] as const;
export type Costo = typeof COSTOS[number];

export const APTO_NOCHE_DE_A_DOS = ["Sí", "No", "Adaptable"] as const;
export type AptoNocheDeADos = typeof APTO_NOCHE_DE_A_DOS[number];

export const OCASIONES = ["Cena familiar", "Con invitados", "Cumpleaños", "Celebración", "Otra"] as const;
export type Ocasion = typeof OCASIONES[number];

export const RESULTADOS = ["Excelente", "Muy bueno", "Bueno", "Regular", "Malísimo"] as const;
export type Resultado = typeof RESULTADOS[number];

export const TIPOS_COMPONENTE = ["Entrada", "Principal", "Acompañamiento", "Postre"] as const;
export type TipoComponente = typeof TIPOS_COMPONENTE[number];

export const ESTADOS_MENU = ["Para probar", "Probado", "Archivado"] as const;
export type EstadoMenu = typeof ESTADOS_MENU[number];

// ─── Helper genérico para campos numéricos con rango ─────────────────────────
export interface RangoNumerico {
  value: number;
  min?: number;
  max?: number;
  raw: string;
}

// ─── Catálogo de ingredientes ─────────────────────────────────────────────────
export interface Ingrediente {
  idIngrediente: string;
  canonico: string;
  nombrePreferido: string;
  sinonimos: string[];
  categoria: string;
  rolNutricional: string[];
  seccionGondola: string;
  unidadesHabituales: string[];
  vecesUsado: number;
  ambiguo: boolean;
  origen: "seed" | "import" | "manual";
  fechaCreacion?: FirestoreTimestamp;
  ultimaModificacion?: FirestoreTimestamp;
}

// ─── Ingrediente en receta (referencia al catálogo) ───────────────────────────
export interface IngredienteEnReceta {
  idIngrediente: string;
  textoOriginal: string;
  preparacion?: string;
  seccion?: string;
  cantidad?: string | number;
  cantidadLabel?: string;
  cantidadMin?: number;
  cantidadMax?: number;
  unidad?: string;
  opcional?: boolean;
  notas?: string;
  alternativas?: Array<{ idIngrediente: string }>;
}

// ─── Paso ─────────────────────────────────────────────────────────────────────
export interface Paso {
  nroPaso: number;
  titulo: string;
  detalle: string;
  tiempoEstimadoLabel: string;
  tiempoEstimadoMin: number | null;
  momento?: string;
  puntoClave?: string;
  errorComun?: string;
  notas?: string;
}

// ─── Receta ───────────────────────────────────────────────────────────────────
export interface Receta {
  idReceta: string;
  nombre: string;
  nombreCanonico: string;

  tipoItem: TipoItem;
  proteinaPrincipal: Proteina;
  estilo: string;
  tecnicaPrincipal: string;
  escenarioUso: Escenario;
  climaDelPlato?: ClimaPlato;
  pensadaPara: PensadaPara;
  cocina?: Cocina;

  sinLacteos: boolean;
  hidratos: boolean;
  aptoNocheDeADos: AptoNocheDeADos;
  paraJuanPablo: boolean;
  paraFamilia: boolean;

  tiempoActivoLabel: string;
  tiempoActivoMin: number | null;
  tiempoTotalLabel: string;
  tiempoTotalMin: number | null;
  dificultad: Dificultad;
  dificultadOrden: number;

  porcionesLabel: string;
  porcionesMin: number | null;
  porcionesMax: number | null;
  costoEstimado: Costo;
  costoOrden: number;

  hidratoOpcional?: string;
  acompPadres?: string;
  porQueEspecial?: string;
  riesgos?: string;
  notas?: string;
  notasNocheDeADos?: string;

  fuente?: string;
  urlFuente?: string;
  imagenUrl?: string;

  ingredientes: IngredienteEnReceta[];
  pasos: Paso[];

  vecesCocinada: number;
  ultimaEvaluacion?: string;
  ultimoPuntaje?: number;

  fechaImportacion?: string;
  fechaCreacion?: FirestoreTimestamp;
  ultimaModificacion?: FirestoreTimestamp;
}

// ─── Menu (Modelo M) ──────────────────────────────────────────────────────────
export interface ComponenteMenu {
  orden: number;
  tipo: TipoComponente;
  idReceta: string;
  obligatorio: boolean;
  notas?: string;
}

export interface Menu {
  idMenu: string;
  nombreMenu: string;
  nombreCanonico: string;

  estado: EstadoMenu;
  estilo?: string;
  escenarioUso: Escenario;
  climaDelMenu?: string;
  idealPara?: string;
  descripcion?: string;

  paraJuanPablo?: string;
  paraFamilia?: string;
  riesgos?: string;
  notas?: string;
  notasOcasion?: string;
  aptoNocheDeADos?: AptoNocheDeADos;
  hidratoOpcional?: string;

  componentes: ComponenteMenu[];

  vecesCocinada?: number;
  fechaCreacion?: FirestoreTimestamp;
  ultimaModificacion?: FirestoreTimestamp;
}

export interface MenuDerived {
  tiempoActivoMin: number;
  tiempoTotalMin: number;
  dificultadOrden: number;
  sinLacteos: boolean;
  hidratos: boolean;
  porcionesMin: number;
  porcionesMax: number;
  costoOrden: number;
}

// ─── Plan ─────────────────────────────────────────────────────────────────────
export interface DatosCocinero {
  ocasion?: Ocasion | "";
  repetir: "" | "Sí" | "No";
  costoRealAprox: string;
  dificultadReal: "" | Dificultad;
  queSalioBien: string;
  queCambiaria: string;
  notasFamiliares: string;
}

export interface Plan {
  idPlan: string;
  semanaInicio: string;
  semanaFin: string;
  tipoSeleccion: TipoSeleccion;
  tipoPlan: TipoPlan;
  idSeleccion: string;
  nombreSeleccion: string;
  recetaPrincipal: string;
  estado: EstadoPlan;
  fechaEleccion: FirestoreTimestamp;
  fechaPrevistaComida: string | null;
  cantidadPersonas: number;
  listaComprasId: string | null;
  notas: string;
  origen: string | null;
  asignaciones: MiembroId[];
  votos: Record<MiembroId, number | null>;
  comentariosPlan: Record<MiembroId, string>;
  datosCocinero: DatosCocinero | null;
  componentesCocinados?: string[];
  fecha?: string;               // "YYYY-MM-DD" — día asignado (opcional, dentro de semanaInicio..semanaFin)
}

// ─── Historial ────────────────────────────────────────────────────────────────
export interface Historial {
  idHist: string;
  fechaRealizada: string;
  fechaRealizadaTimestamp: FirestoreTimestamp;
  idPlan: string;
  idReceta: string;
  idMenu: string;
  receta: string;
  tipoSeleccion: TipoSeleccion;
  idSeleccion: string;
  nombreSeleccion: string;
  semanaInicio: string;
  ocasion: Ocasion | "";
  calificaciones: Record<MiembroId, number>;
  comentarios: Record<MiembroId, string>;
  promedio: number;
  resultado: Resultado | "";
  repetir: "" | "Sí" | "No";
  costoRealAprox: string;
  dificultadReal: "" | Dificultad;
  queSalioBien: string;
  queCambiaria: string;
  notasFamiliares: string;
}

// ─── Compras ──────────────────────────────────────────────────────────────────
export interface AporteCompra {
  idPlan: string;
  idReceta: string;
  nombreReceta: string;
  textoOriginal: string;
  tipoAporte: "receta" | "alternativa";
  alternativaCon?: string[];
  cantidad: number;
  unidad: string;
}

export interface ItemCompra {
  id: string;
  idIngrediente: string;
  nombrePreferido: string;
  seccionGondola: string;
  cantidadTotal: number;
  cantidadLabel: string;
  unidad: string;
  opcional: boolean;
  yaTengo: boolean;
  aportes: AporteCompra[];
  notas: string;
}

export interface ListaCompras {
  idLista: string;
  semanaInicio: string;
  fechaGeneracion: FirestoreTimestamp;
  totalItems?: number;
  totalYaTengo?: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────
export interface MiembroConfig {
  id: MiembroId;
  nombre: string;
  rol: Rol;
}

export interface FamiliaConfigMiembro {
  nombre: string;
  rol: Rol;
  mails: string[];
}

export interface FamiliaConfig {
  miembros: Record<MiembroId, FamiliaConfigMiembro>;
  owner: MiembroId;
  timezone: string;
  semanaArrancaEn: "lunes" | "domingo";
}

export interface DiccionariosConfig {
  tiposItem: TipoItem[];
  proteinas: Proteina[];
  escenarios: Escenario[];
  climaPlato: ClimaPlato[];
  pensadaPara: PensadaPara[];
  cocinas: Cocina[];
  tiposPlan: TipoPlan[];
  ocasiones: Ocasion[];
  aptoNocheDeADos: AptoNocheDeADos[];
  dificultades: Dificultad[];
  costos: Costo[];
  miembros: MiembroConfig[];
  estadosPlan: {
    activos: EstadoPlan[];
    finales: EstadoPlan[];
  };
  categoriasIngrediente: string[];
  rolesNutricionales: string[];
  seccionesGondola: string[];
  unidadesCanonicas: string[];
  version: number;
  ultimaActualizacion: FirestoreTimestamp;
}

export interface UserDoc {
  uid: string;
  email: string;
  memberId: MiembroId;
  nombre: string;
  rol?: Rol;                             // kept for upsertUserDoc backward compat
  ultimoLogin: FirestoreTimestamp;
  fechaPrimerLogin?: FirestoreTimestamp; // kept for upsertUserDoc Omit compat
  fechaCreacion?: FirestoreTimestamp;
}

// ─── Backward-compat aliases (usados por src/auth/ desde E1) ─────────────────
export type MemberId = MiembroId;
export type MemberRole = Rol;
export type MemberInfo = FamiliaConfigMiembro;

// Alias usado en src/data/diccionarios.ts
export type Diccionarios = DiccionariosConfig;
