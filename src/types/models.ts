// ─── Alias: Firestore Timestamp sin importar firebase en este módulo ──────────
export type FirestoreTimestamp = { seconds: number; nanoseconds: number };

// ─── Miembros ─────────────────────────────────────────────────────────────────
export const MIEMBRO_IDS = ["juanpablo", "maria", "sofia", "federico"] as const;
export type MiembroId = typeof MIEMBRO_IDS[number];

export type Rol = "padre" | "madre" | "hija" | "hijo" | "invitado";

// ─── Plan ─────────────────────────────────────────────────────────────────────
export const ESTADOS_PLAN_ACTIVOS = ["Elegida", "Compra pendiente", "Compra lista", "Cocinada"] as const;
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
  "Vacuna", "Cerdo", "Pollo", "Cordero", "Pescado",
  "Mariscos", "Huevos", "Legumbres", "Mixta", "Vegetariana",
] as const;
export type Proteina = typeof PROTEINAS[number];

export const ESCENARIOS = ["Noche de a dos", "Cocina rápida", "Cena Especial", "Celebración"] as const;
export type Escenario = typeof ESCENARIOS[number];

export const CLIMAS_PLATO = ["Liviano", "Medio", "Potente"] as const;
export type ClimaPlato = typeof CLIMAS_PLATO[number];

export const PENSADA_PARA = ["Especial", "Semana", "Cualquiera"] as const;
export type PensadaPara = typeof PENSADA_PARA[number];

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

// ─── Ingrediente ──────────────────────────────────────────────────────────────
export interface Ingrediente {
  nroOrden: number;
  ingrediente: string;
  ingredienteCanonico: string;
  cantidad: number | null;
  cantidadMin?: number;
  cantidadMax?: number;
  cantidadLabel: string;
  unidad: string;
  unidadOriginal?: string;
  categoria: string;
  seccion?: string;
  opcional: boolean;
  paraJuanPablo?: boolean;
  notas?: string;
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

  ingredientes: Ingrediente[];
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
  estilo: string;
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
  datosCocinero: DatosCocinero;
}
