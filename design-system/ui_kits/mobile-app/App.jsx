// App.jsx — interactive shell: sample data + route state + role switch (JP ↔ miembro)

// ─── Catálogo de miembros ────────────────────────────────────────────────────

const MIEMBROS = {
  juanpablo: { nombre: 'Juan Pablo' },
  maria:     { nombre: 'María' },
  sofia:     { nombre: 'Sofía' },
  federico:  { nombre: 'Federico' },
};

// ─── Sample data — Planes (varios estados a la vez) ──────────────────────────
//
// Cubrimos toda la máquina de estados para que el rol-switcher tenga material:
//   p1  Compra pendiente   (Especial)              → cocinar / ver receta
//   p2  Compra lista        (Especial extra)        → cocinar
//   p3  Cocinando           (En proceso)            → seguir cocinando
//   p4  Cocinada            (espera votos)          → evaluar (todos pendientes)
//   p5  Cocinada            (Sofía ya votó)         → evaluar el resto
//   p6  Evaluada            (cierre)                → ver resultado

const SAMPLE_PLANES = [
  {
    id: 'p1', tipo: 'Especial', estado: 'Compra pendiente',
    nombre: 'Bondiola braseada al Malbec',
    proteina: 'Cerdo', tiempo: '3 h', dificultad: 'Media-alta',
    cocineros: ['Juan Pablo', 'María'],
    asignaciones: ['juanpablo', 'maria', 'sofia', 'federico'],
    recetaId: 'r1',
  },
  {
    id: 'p2', tipo: 'Especial extra', estado: 'Compra lista',
    nombre: 'Langostinos al ajillo',
    proteina: 'Mariscos', tiempo: '25 min', dificultad: 'Baja',
    cocineros: ['Juan Pablo'],
    asignaciones: ['juanpablo', 'maria', 'sofia', 'federico'],
    recetaId: 'r2',
  },
  {
    id: 'p3', tipo: 'En proceso', estado: 'Cocinando',
    nombre: 'Berenjenas grilladas con criolla',
    proteina: 'Vegetal', tiempo: '40 min', dificultad: 'Baja',
    cocineros: ['Sofía', 'Federico'],
    asignaciones: ['juanpablo', 'maria', 'sofia', 'federico'],
    recetaId: 'r3',
  },
  {
    id: 'p4', tipo: 'En proceso', estado: 'Cocinada',
    nombre: 'Pollo al limón',
    proteina: 'Aves', tiempo: '50 min', dificultad: 'Baja',
    cocineros: ['Juan Pablo'],
    asignaciones: ['juanpablo', 'maria', 'sofia', 'federico'],
    recetaId: 'r5',
    votos: {},
    comentarios: {},
  },
  {
    id: 'p5', tipo: 'En proceso', estado: 'Cocinada',
    nombre: 'Risotto de hongos',
    proteina: 'Vegetal', tiempo: '45 min', dificultad: 'Media',
    cocineros: ['María'],
    asignaciones: ['juanpablo', 'maria', 'sofia', 'federico'],
    recetaId: 'r4',
    votos: { sofia: 8 },
    comentarios: { sofia: 'Bien cremoso, los hongos podrían ser más' },
  },
  {
    id: 'p6', tipo: 'En proceso', estado: 'Evaluada',
    nombre: 'Tarta de manzana',
    proteina: 'Huevos', tiempo: '1 h 20 min', dificultad: 'Media',
    cocineros: ['Juan Pablo'],
    asignaciones: ['juanpablo', 'maria', 'sofia', 'federico'],
    recetaId: 'r6',
    votos: { juanpablo: 9, maria: 8, sofia: 9, federico: 7 },
    comentarios: {
      juanpablo: 'La masa quedó perfecta esta vez.',
      maria: 'Un toque menos de azúcar la próxima.',
      federico: 'Faltó canela.',
    },
    resultado: 'Excelente',
    datosCocinero: {
      ocasion: 'Cena familiar',
      repetir: 'Sí',
      queSalioBien: 'Masa hojaldrada bien cocida; manzanas firmes.',
      queCambiaria: 'Menos azúcar, más canela.',
    },
  },
];

// ─── Sample data — Lista de compras (cards y resumen) ────────────────────────

const SAMPLE_LISTA = { pendientes: 7, yaTengo: 11 };

// Lista de compras v2 — agrupada por plan (receta). Cada item tiene su góndola.
const SAMPLE_COMPRA_PLANES = [
  {
    idPlan: 'p1', nombre: 'Bondiola al Malbec', dia: 'Mar', diaNum: 27,
    porciones: 6, asignaciones: ['Juan Pablo', 'María'],
    items: [
      { id: 'c1', seccion: 'Carnicería', nombre: 'Bondiola de cerdo', cantidad: '1.2 kg', yaTengo: false },
      { id: 'c2', seccion: 'Almacén',    nombre: 'Malbec',            cantidad: '1 bot.', yaTengo: true  },
      { id: 'c3', seccion: 'Verdulería', nombre: 'Cebolla',           cantidad: '2 u',    yaTengo: false, recetas: 2 },
      { id: 'c4', seccion: 'Verdulería', nombre: 'Zanahoria',         cantidad: '2 u',    yaTengo: true  },
    ],
  },
  {
    idPlan: 'p2', nombre: 'Langostinos al ajillo', dia: 'Vie', diaNum: 30,
    porciones: 3, asignaciones: ['Juan Pablo'],
    items: [
      { id: 'c5', seccion: 'Pescadería', nombre: 'Langostinos', cantidad: '500 g',    yaTengo: false },
      { id: 'c6', seccion: 'Verdulería', nombre: 'Ajo',         cantidad: '1 cabeza', yaTengo: false, recetas: 2 },
      { id: 'c7', seccion: 'Verdulería', nombre: 'Perejil',     cantidad: '1 atado',  yaTengo: false },
    ],
  },
  {
    idPlan: 'p3', nombre: 'Berenjenas grilladas', dia: null, diaNum: null,
    porciones: 4, asignaciones: ['Sofía', 'Federico'],
    items: [
      { id: 'c8', seccion: 'Verdulería', nombre: 'Berenjenas', cantidad: '2 u', yaTengo: false },
      { id: 'c9', seccion: 'Verdulería', nombre: 'Tomate',     cantidad: '2 u', yaTengo: true  },
    ],
  },
  {
    idPlan: 'p5c', nombre: 'Risotto de hongos', dia: null, diaNum: null,
    porciones: 4, asignaciones: ['María'],
    items: [
      { id: 'c10', seccion: 'Almacén',    nombre: 'Arroz arborio', cantidad: '320 g', yaTengo: false },
      { id: 'c11', seccion: 'Lácteos',    nombre: 'Manteca',       cantidad: '40 g',  yaTengo: false, sustitutos: ['Aceite de oliva'] },
      { id: 'c12', seccion: 'Verdulería', nombre: 'Cebolla',       cantidad: '1 u',   yaTengo: true  },
    ],
  },
];

// ─── Sample data — Recetas ───────────────────────────────────────────────────

const SAMPLE_RECETAS = [
  {
    id: 'r1', nombre: 'Bondiola braseada al Malbec',
    macros: { porPorcion: { kcal: 540, carbohidratos: 8, proteinas: 39, grasas: 33, fibra: 2 }, hidratosNetos: 6, porciones: 5, conDatos: 5, total: 6 },
    usa: ['i1', 'i10', 'i4', 'i5', 'i6', 'i11'],
    tipo: 'Receta principal', proteina: 'Cerdo', tiempo: '3 h', dificultad: 'Media-alta',
    cocina: 'Argentina',
    sinLacteos: true, sinHidratos: false,
    esVegetariano: false, esKeto: false,
    escenarioUso: 'Cena de fin de semana', estilo: 'De olla', costoEstimado: 'Medio',
    tiempoTotalLabel: '3 h 20 min', tiempoActivoLabel: '40 min', porcionesLabel: '4–6',
    aptoNocheDeADos: 'No',
    porQueEspecial: 'Se cocina casi sola: tres horas a fuego bajo y queda lista para desmechar.',
    riesgos: 'Sellar bien antes de bañar en vino; controlar que no se seque y dar vuelta cada 30 min.',
    notasCocinero: 'Si sobra salsa, reducila aparte y serví como demi-glace sobre la carne desmechada.',
    ingredientesDet: [
      { seccion: 'Principal',           texto: 'Bondiola de cerdo',  cantidad: '1.2', unidad: 'kg' },
      { seccion: 'Líquido de cocción',  texto: 'Malbec',             cantidad: '1', unidad: 'bot.', alternativas: ['otro vino tinto seco'] },
      { seccion: 'Base de sabor',       texto: 'Cebolla',            cantidad: '2', unidad: 'u' },
      { seccion: 'Base de sabor',       texto: 'Zanahoria',          cantidad: '2', unidad: 'u' },
      { seccion: 'Base de sabor',       texto: 'Ajo',                cantidad: '3', unidad: 'dientes' },
      { seccion: 'Condimentos',         texto: 'Laurel, tomillo y romero', cantidad: 'c/n', unidad: '', opcional: true },
      { seccion: 'Cocción',             texto: 'Aceite de oliva',    cantidad: '3', unidad: 'cda' },
    ],
    ingredientes: [
      '1.2 kg bondiola de cerdo', '1 botella Malbec',
      '2 cebollas, 2 zanahorias, 3 dientes de ajo',
      'Hierbas: laurel, tomillo, romero', 'Aceite de oliva, sal, pimienta',
    ],
    pasos: [
      { titulo: 'Sellar la bondiola',     tiempo: '8 min',  tiempoMin: 8,   desc: 'Sellar a fuego alto en cazuela de hierro hasta dorar bien por todos los lados.', puntoClave: 'Dorar parejo sella los jugos.', errorComun: 'Mover la carne antes de que selle.' },
      { titulo: 'Sumar vino y reducir',   tiempo: '20 min', tiempoMin: 20,  desc: 'Agregar el Malbec y dejar reducir hasta la mitad.', puntoClave: 'Reducir evapora el alcohol y concentra sabor.' },
      { titulo: 'Brasear a fuego bajo',   tiempo: '2 h',    tiempoMin: 120, desc: 'Tapar y cocinar a fuego bajo, dando vuelta cada 30 min.', errorComun: 'Fuego alto: la carne se seca por fuera y queda dura.' },
      { titulo: 'Reposar y desmechar',    tiempo: '15 min', tiempoMin: 15,  desc: 'Retirar, reposar fuera del fuego y desmechar la carne.' },
    ],
  },
  {
    id: 'r2', nombre: 'Langostinos al ajillo',
    macros: { porPorcion: { kcal: 280, carbohidratos: 3, proteinas: 28, grasas: 17, fibra: 1 }, hidratosNetos: 2, porciones: 3, conDatos: 4, total: 4 },
    usa: ['i2', 'i6', 'i9', 'i11'],
    tipo: 'Receta principal', proteina: 'Mariscos', tiempo: '25 min', dificultad: 'Baja',
    cocina: 'Española',
    sinLacteos: true, sinHidratos: true,
    esVegetariano: false, esKeto: true,
    escenarioUso: 'Entrada rápida', estilo: 'Español', costoEstimado: 'Alto',
    tiempoTotalLabel: '25 min', tiempoActivoLabel: '18 min', porcionesLabel: '2–3',
    aptoNocheDeADos: 'Sí',
    porQueEspecial: 'Quince minutos de sartén y parece de restaurante.',
    riesgos: 'No pasarse de cocción: el langostino se pone gomoso en segundos.',
    notasCocinero: 'Terminar con un chorrito de oliva en crudo y pan para mojar.',
    ingredientesDet: [
      { seccion: 'Principal',    texto: 'Langostinos',     cantidad: '500', unidad: 'g' },
      { seccion: 'Base de sabor', texto: 'Ajo',            cantidad: '6', unidad: 'dientes' },
      { seccion: 'Condimentos',  texto: 'Perejil',         cantidad: '1', unidad: 'atado' },
      { seccion: 'Condimentos',  texto: 'Ají molido',      cantidad: '1', unidad: 'pizca', opcional: true },
      { seccion: 'Cocción',      texto: 'Aceite de oliva', cantidad: '4', unidad: 'cda' },
    ],
    ingredientes: ['500 g langostinos', '6 dientes de ajo', 'Perejil', 'Aceite de oliva', 'Ají molido', 'Sal'],
    pasos: [
      { titulo: 'Limpiar los langostinos', tiempo: '10 min', tiempoMin: 10, desc: 'Pelar y retirar el intestino.', puntoClave: 'Secarlos bien para que se sellen, no hiervan.' },
      { titulo: 'Dorar el ajo',            tiempo: '3 min',  tiempoMin: 3,  desc: 'En aceite de oliva con ají molido, a fuego medio.', errorComun: 'Quemar el ajo amarga todo el plato.' },
      { titulo: 'Saltear y servir',        tiempo: '5 min',  tiempoMin: 5,  desc: 'Sumar langostinos y perejil; saltear 2 min y servir.' },
    ],
  },
  {
    id: 'r3', nombre: 'Berenjenas grilladas con criolla',
    macros: { porPorcion: { kcal: 130, carbohidratos: 12, proteinas: 3, grasas: 9, fibra: 6 }, hidratosNetos: 6, porciones: 4, conDatos: 4, total: 4 },
    usa: ['i7', 'i8', 'i4', 'i11'],
    tipo: 'Guarnición', proteina: 'Vegetal', tiempo: '40 min', dificultad: 'Baja',
    cocina: 'Mediterránea',
    sinLacteos: true, sinHidratos: true,
    esVegetariano: true, esKeto: true,
    ingredientes: ['2 berenjenas', 'Sal gruesa', '2 tomates, 1 cebolla morada, 1 ají morrón', 'Aceite de oliva', 'Vinagre de vino, sal, pimienta'],
    pasos: [
      { titulo: 'Cortar y salar las berenjenas', tiempo: '20 min', tiempoMin: 20, desc: 'Dejar drenar para sacar amargor.' },
      { titulo: 'Armar la criolla',              tiempo: '10 min', tiempoMin: 10, desc: 'Picar bien chico, condimentar y dejar marinar.' },
      { titulo: 'Grillar y servir',              tiempo: '10 min', tiempoMin: 10, desc: 'A fuego fuerte hasta marcas. Cubrir con criolla.' },
    ],
  },
  {
    id: 'r4', nombre: 'Risotto de hongos',
    macros: { conDatos: 0, total: 3 },
    usa: ['i12', 'i4', 'i14'],
    tipo: 'Receta principal', proteina: 'Vegetal', tiempo: '45 min', dificultad: 'Media',
    cocina: 'Italiana',
    sinLacteos: false, sinHidratos: false,
    esVegetariano: true, esKeto: false,
    ingredientes: [], pasos: [],
  },
  {
    id: 'r5', nombre: 'Pollo al limón',
    macros: { porPorcion: { kcal: 310, carbohidratos: 4, proteinas: 41, grasas: 13, fibra: 1 }, hidratosNetos: 3, porciones: 4, conDatos: 2, total: 3 },
    usa: ['i3', 'i6', 'i11'],
    tipo: 'Receta principal', proteina: 'Aves', tiempo: '50 min', dificultad: 'Baja',
    sinLacteos: true, sinHidratos: true,
    esVegetariano: false, esKeto: true,
    ingredientes: [], pasos: [],
  },
  {
    id: 'r6', nombre: 'Tarta de manzana',
    macros: { porPorcion: { kcal: 340, carbohidratos: 42, proteinas: 5, grasas: 16, fibra: 3 }, hidratosNetos: 39, porciones: 8, conDatos: 2, total: 2 },
    usa: ['i13', 'i14'],
    tipo: 'Postre', proteina: 'Huevos', tiempo: '1 h 20 min', dificultad: 'Media',
    cocina: 'Francesa',
    sinLacteos: false, sinHidratos: false,
    esVegetariano: true, esKeto: false,
    ingredientes: [], pasos: [],
  },
];

// ─── Sample data — Menús (Modelo M: receta principal + componentes) ──────────
//
// Un menú es una selección curada de recetas que se cocinan juntas para una
// ocasión. Cada componente apunta a una receta (recetaId → SAMPLE_RECETAS) y
// lleva un rol (Principal, Base, Salsa, Guarnición…) que pinta su chip de letra.

const SAMPLE_MENUS = [
  {
    id: 'm1', nombre: 'Español de mar',
    escenarioUso: 'Noche de a dos', estado: 'Probado',
    estilo: 'Mediterráneo, de sartén', climaDelMenu: 'Templado',
    idealPara: 'Una cena tranquila sin pasar horas en la cocina',
    descripcion: 'Langostinos al ajillo de entrada y una guarnición fresca. Liviano, rápido y con onda de bodegón costero.',
    derived: { tiempo: '55 min', dificultad: 'Baja', costo: 'Medio/Alto', porciones: '2–4', sinLacteos: true, hidratos: false },
    componentes: [
      { orden: 1, tipo: 'Principal',  recetaId: 'r2', obligatorio: true },
      { orden: 2, tipo: 'Guarnición', recetaId: 'r3', obligatorio: true, notas: 'Se puede grillar mientras descansan los langostinos.' },
      { orden: 3, tipo: 'Postre',     recetaId: 'r6', obligatorio: false, notas: 'Opcional si querés cerrar dulce.' },
    ],
    paraJuanPablo: 'Zarzuela sola, sin guarnición.',
    paraFamilia: 'Sumar pan para mojar en el ajillo.',
    notasOcasion: 'Anduvo muy bien para un aniversario en casa.',
  },
  {
    id: 'm2', nombre: 'Domingo de olla',
    escenarioUso: 'Domingo familiar', estado: 'Para probar',
    estilo: 'De olla, contundente', climaDelMenu: 'Frío',
    idealPara: 'Almuerzo largo de domingo con toda la familia',
    descripcion: 'La bondiola al Malbec como gran protagonista, con una guarnición liviana al lado y postre para cerrar.',
    derived: { tiempo: '3 h 40 min', dificultad: 'Media-alta', costo: 'Medio', porciones: '4–6', sinLacteos: false, hidratos: true },
    componentes: [
      { orden: 1, tipo: 'Principal',  recetaId: 'r1', obligatorio: true },
      { orden: 2, tipo: 'Guarnición', recetaId: 'r3', obligatorio: true },
      { orden: 3, tipo: 'Postre',     recetaId: 'r6', obligatorio: true, notas: 'Sale del horno mientras se desmecha la bondiola.' },
    ],
    riesgos: 'Coordinar tiempos: la bondiola lleva 3 h, arrancar temprano.',
    paraFamilia: 'Rinde para 6 con la guarnición y el postre.',
  },
];

// ─── Sample data — Catálogo de ingredientes ──────────────────────────────────
//
// Espejo reducido de la colección "ingredientes": cada uno con su categoría
// (qué ES), su sección de góndola (DÓNDE se compra) y sus roles nutricionales
// (qué APORTA). Los marcados `ambiguo` cayeron con valores por defecto al
// importarse y JP los tiene que completar.

const SAMPLE_INGREDIENTES = [
  { id: 'i1',  nombre: 'Bondiola de cerdo', categoria: 'Carne',              gondola: 'Carnicería', roles: ['Proteina', 'Grasa'], usos: 4 },
  { id: 'i2',  nombre: 'Langostinos',       categoria: 'Pescado y marisco',  gondola: 'Pescadería', roles: ['Proteina'],          usos: 3 },
  { id: 'i3',  nombre: 'Pollo',             categoria: 'Carne',              gondola: 'Carnicería', roles: ['Proteina'],          usos: 9 },
  { id: 'i4',  nombre: 'Cebolla',           categoria: 'Verdura',            gondola: 'Verdulería', roles: ['Fibra/Vegetal'],     usos: 22 },
  { id: 'i5',  nombre: 'Zanahoria',         categoria: 'Verdura',            gondola: 'Verdulería', roles: ['Fibra/Vegetal'],     usos: 14 },
  { id: 'i6',  nombre: 'Ajo',               categoria: 'Verdura',            gondola: 'Verdulería', roles: ['Neutro'],            usos: 31 },
  { id: 'i7',  nombre: 'Berenjena',         categoria: 'Verdura',            gondola: 'Verdulería', roles: ['Fibra/Vegetal'],     usos: 5 },
  { id: 'i8',  nombre: 'Tomate',            categoria: 'Verdura',            gondola: 'Verdulería', roles: ['Fibra/Vegetal'],     usos: 18 },
  { id: 'i9',  nombre: 'Perejil',           categoria: 'Hierba y especia',   gondola: 'Verdulería', roles: ['Neutro'],            usos: 12 },
  { id: 'i10', nombre: 'Malbec',            categoria: 'Despensa varios',    gondola: 'Almacén',    roles: ['Neutro'],            usos: 2 },
  { id: 'i11', nombre: 'Aceite de oliva',   categoria: 'Aceite y grasa',     gondola: 'Almacén',    roles: ['Grasa'],             usos: 27, equivalencias: ['i14'] },
  { id: 'i12', nombre: 'Arroz arborio',     categoria: 'Cereal y derivado',  gondola: 'Almacén',    roles: ['Hidrato'],           usos: 6 },
  { id: 'i13', nombre: 'Manzana',           categoria: 'Fruta',              gondola: 'Verdulería', roles: ['Azucar/Dulce', 'Fibra/Vegetal'], usos: 4 },
  { id: 'i14', nombre: 'Manteca',           categoria: 'Lacteo',             gondola: 'Lácteos',    roles: ['Grasa'],             usos: 8, equivalencias: ['i11'] },
  // Ambiguos: importados con valores por defecto, falta completar
  { id: 'i15', nombre: 'Ras el hanout',     categoria: 'Despensa varios',    gondola: 'Despensa / otros', roles: [],            usos: 1, ambiguo: true, canonico: 'ras el hanout' },
  { id: 'i16', nombre: 'Miso blanco',       categoria: 'Despensa varios',    gondola: 'Despensa / otros', roles: [],            usos: 1, ambiguo: true, canonico: 'miso blanco' },
  // Duplicados de ejemplo (mismo ingrediente cargado dos veces)
  { id: 'i17', nombre: 'ajo',               categoria: 'Verdura',            gondola: 'Verdulería', roles: ['Neutro'],            usos: 2, sinonimos: ['diente de ajo'] },
  { id: 'i18', nombre: 'Tomates',           categoria: 'Verdura',            gondola: 'Verdulería', roles: ['Fibra/Vegetal'],     usos: 3 },
];

// ─── Sample data — Historial (platos ya cerrados) ────────────────────────────

const SAMPLE_HISTORIAL = [
  {
    idHist: 'h1', idReceta: 'r1',
    nombreSeleccion: 'Bondiola braseada al Malbec',
    fechaRealizada: '12 may 2026', ocasion: 'Cena familiar',
    resultado: 'Excelente', promedio: 9.2,
    calificaciones: { juanpablo: 10, maria: 9, sofia: 9, federico: 9 },
    comentarios: {
      maria: 'Tierna y muy sabrosa.',
      sofia: 'La salsa quedó espesa, ideal.',
    },
    repetir: 'Sí', dificultadReal: 'Media-alta', costoRealAprox: '$18.500',
    queSalioBien: 'Sello inicial muy parejo; el vino redujo bien.',
    queCambiaria: 'Sacarla 10 min antes para que no se deshaga al desmechar.',
    notasFamiliares: 'A todos les gustó. Sumarla a la rotación de invierno.',
  },
  {
    idHist: 'h2', idReceta: 'r5',
    nombreSeleccion: 'Pollo al limón',
    fechaRealizada: '5 may 2026', ocasion: 'Cena familiar',
    resultado: 'Muy bueno', promedio: 8.0,
    calificaciones: { juanpablo: 8, maria: 7, sofia: 9, federico: 8 },
    comentarios: { federico: 'Falta sal.' },
    repetir: 'Sí',
  },
  {
    idHist: 'h3', idReceta: 'r4',
    nombreSeleccion: 'Risotto de hongos',
    fechaRealizada: '28 abr 2026',
    resultado: 'Bueno', promedio: 6.7,
    calificaciones: { juanpablo: 7, maria: 6, sofia: 7, federico: 7 },
    comentarios: {},
    repetir: 'Quizás',
  },
  {
    idHist: 'h4', idReceta: 'r3',
    nombreSeleccion: 'Berenjenas grilladas con criolla',
    fechaRealizada: '21 abr 2026',
    resultado: 'Regular', promedio: 5.4,
    calificaciones: { juanpablo: 6, maria: 5, sofia: 5, federico: 6 },
    comentarios: { maria: 'Le faltó tiempo en la parrilla.' },
    repetir: 'No',
    queCambiaria: 'Más fuego y menos tiempo de marinada.',
  },
  {
    idHist: 'h5', idReceta: 'r6',
    nombreSeleccion: 'Tarta de manzana',
    fechaRealizada: '14 abr 2026', ocasion: 'Cumpleaños',
    resultado: 'Excelente', promedio: 9.5,
    calificaciones: { juanpablo: 10, maria: 9, sofia: 10, federico: 9 },
    comentarios: { sofia: 'La mejor tarta del año.' },
  },
  {
    idHist: 'h6', idReceta: 'r2',
    nombreSeleccion: 'Langostinos al ajillo',
    fechaRealizada: '7 abr 2026',
    resultado: 'Muy bueno', promedio: 8.5,
    calificaciones: { juanpablo: 9, maria: 8, sofia: 9, federico: 8 },
    comentarios: {},
  },
];

// ─── Tweak defaults (persistentes vía host) ──────────────────────────────────

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "viewMode": "juanpablo",
  "startRoute": "home",
  "showPendientesBadge": true,
  "memberLayout": "rows",
  "memberState": "ready",
  "matchLayout": "cercania",
  "mostrarSubs": true,
  "subsEstilo": "inline",
  "macrosLayout": "estrella",
  "perfilLayout": "hero"
}/*EDITMODE-END*/;

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [authed, setAuthed] = React.useState(true);
  const [route, setRoute]   = React.useState({ name: t.startRoute || 'home' });

  // Si el rol cambia, mandamos al usuario al "home" de ese rol.
  // (También cuando el tweak startRoute cambie.)
  const lastViewModeRef = React.useRef(t.viewMode);
  React.useEffect(() => {
    if (lastViewModeRef.current !== t.viewMode) {
      lastViewModeRef.current = t.viewMode;
      setRoute({ name: 'home' });
    }
  }, [t.viewMode]);

  function navigate(name, params = {}) { setRoute({ name, ...params }); }

  // ── Toast host (microinteraction shared across screens) ─────────────────────
  const [toast, setToast] = React.useState(null);
  const toastTimer = React.useRef(null);
  React.useEffect(() => {
    window.__toast = (text, ok = true) => {
      clearTimeout(toastTimer.current);
      setToast({ text, ok, id: Date.now() });
      toastTimer.current = setTimeout(() => setToast(null), 3200);
    };
    return () => clearTimeout(toastTimer.current);
  }, []);

  // Exposed for screenshot tooling — lets external scripts drive route + role.
  React.useEffect(() => {
    window.__nav = navigate;
    window.__setRole = (v) => setTweak('viewMode', v);
    window.__setAuthed = setAuthed;
    window.__setTweak = setTweak;
  });

  const miembroId = t.viewMode;
  const isJP      = miembroId === 'juanpablo';
  const nombre    = MIEMBROS[miembroId]?.nombre || 'Juan Pablo';

  // ── Derivados de los planes ─────────────────────────────────────────────────

  const [recetas, setRecetas] = React.useState(SAMPLE_RECETAS);

  // Visibilidad de biblioteca por miembro (E9.8) — estado interactivo para el prototipo.
  // Opt-in: solo las recetas listadas se ven en la biblioteca de ese miembro.
  const [vis, setVis] = React.useState({
    maria:    ['r1', 'r5', 'r6'],
    sofia:    ['r4', 'r6'],
    federico: [],
  });
  function toggleVis(miembro, recetaId) {
    setVis(prev => {
      const lista = prev[miembro] || [];
      const next = lista.includes(recetaId)
        ? lista.filter(x => x !== recetaId)
        : [...lista, recetaId];
      return { ...prev, [miembro]: next };
    });
  }
  // Recetas visibles para el miembro actual (JP ve todas)
  const recetasParaMiembro = isJP
    ? recetas
    : recetas.filter(r => (vis[miembroId] || []).includes(r.id));

  // Perfiles de miembro (Lote 10) — color + preferencias editables por cada uno.
  const [perfiles, setPerfiles] = React.useState({
    juanpablo: { inicial: 'JP', color: '#8a4a2f', preferencias: ['Sin picante'] },
    maria:     { inicial: 'M',  color: '#74324a', preferencias: ['No come pescado'] },
    sofia:     { inicial: 'S',  color: '#3c4a6e', preferencias: [] },
    federico:  { inicial: 'F',  color: '#2e5d2e', preferencias: ['Sin lácteos'] },
  });
  const [perfilViendo, setPerfilViendo] = React.useState('juanpablo');
  const ORDEN_MIEMBROS = ['juanpablo', 'maria', 'sofia', 'federico'];
  const miembrosPerfil = ORDEN_MIEMBROS.map(id => ({
    id,
    nombre: MIEMBROS[id]?.nombre || id,
    inicial: perfiles[id].inicial,
    color: perfiles[id].color,
    preferencias: perfiles[id].preferencias,
    enBiblioteca: id === 'juanpablo' ? recetas.length : (vis[id]?.length ?? 0),
  }));
  const perfilActivo = isJP ? perfilViendo : miembroId;
  function cambiarColor(id, c) { setPerfiles(p => ({ ...p, [id]: { ...p[id], color: c } })); }
  function addPref(id, t) { setPerfiles(p => ({ ...p, [id]: { ...p[id], preferencias: [...p[id].preferencias, t] } })); }
  function removePref(id, i) { setPerfiles(p => ({ ...p, [id]: { ...p[id], preferencias: p[id].preferencias.filter((_, j) => j !== i) } })); }

  // E10.2 — publicar los colores personalizados al store de MemberAvatar
  // (historial, voto, plan cards, header reflejan el color elegido en el perfil).
  React.useEffect(() => {
    if (window.__memberColorStore) {
      const map = {};
      Object.keys(perfiles).forEach(id => { map[id] = perfiles[id].color; });
      window.__memberColorStore.set(map);
    }
  }, [perfiles]);

  const currentRecipe = route.recetaId
    ? recetas.find(r => r.id === route.recetaId) : null;
  const currentPlan = route.planId
    ? SAMPLE_PLANES.find(p => p.id === route.planId) : null;
  const currentHist = route.histId
    ? SAMPLE_HISTORIAL.find(h => h.idHist === route.histId) : null;
  const currentMenu = route.menuId
    ? SAMPLE_MENUS.find(m => m.id === route.menuId) : null;

  // Pendientes de evaluar: plan en estado Cocinada para los que YO no voté
  const planesCocinados = SAMPLE_PLANES.filter(p => p.estado === 'Cocinada');
  const pendientes = planesCocinados.filter(p =>
    (p.asignaciones || []).includes(miembroId) && (p.votos?.[miembroId] == null)
  );

  // "Mi semana" del miembro: planes activos (no Evaluada) donde estoy asignado
  const misPlanes = SAMPLE_PLANES.filter(p =>
    p.estado !== 'Evaluada' && (p.asignaciones || []).includes(miembroId)
  );

  // Plan asignado y cocinable de la receta abierta (para mostrar "Empezar a cocinar").
  // JP: siempre puede. Miembro: solo si tiene un plan asignado y cocinable de esa receta.
  const ESTADOS_COCINABLES = ['Compra pendiente', 'Compra lista', 'Cocinando'];
  const puedeCocinarReceta = isJP || (currentRecipe ? SAMPLE_PLANES.some(p =>
    p.recetaId === currentRecipe.id &&
    (p.asignaciones || []).includes(miembroId) &&
    ESTADOS_COCINABLES.includes(p.estado)
  ) : false);

  if (!authed) {
    return <LoginScreen onSignIn={() => setAuthed(true)}/>;
  }

  // ── Mapeo route → bottom-nav tab id ─────────────────────────────────────────

  const tabFor = (r) => {
    if (r.name === 'home') return 'home';
    if (r.name === 'biblioteca' || r.name === 'detalle' || r.name === 'importar' || r.name === 'importar-receta' || r.name === 'detalle-menu' || r.name === 'catalogo' || r.name === 'visibilidad') return 'biblioteca';
    if (r.name === 'que-cocino') return 'home';
    if (r.name === 'compras')    return 'compras';
    if (r.name === 'pendientes' || r.name === 'voto') return 'home';
    if (r.name === 'perfil') return 'home';
    if (r.name === 'historial' || r.name === 'historial-detalle') return 'historial';
    return '';
  };

  // ── Click de tab → navegación ───────────────────────────────────────────────
  function onTabClick(id) {
    navigate(id);
  }

  // ── Header subtitle: contexto del rol activo ────────────────────────────────

  const headerSubtitle = isJP ? null : `Vista de ${nombre}`;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: 'var(--bg)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <Header
        nombre={nombre}
        subtitle={headerSubtitle}
        avatarColor={perfiles[miembroId]?.color}
        avatarInicial={perfiles[miembroId]?.inicial}
        onAvatarClick={() => navigate('perfil')}
      />

      <main style={{
        flex: 1, overflow: 'auto',
        padding: '16px 16px 92px',
      }}>
        {/* ── Home: JP ve dashboard editor; miembros ven MemberDashboard ──── */}
        {route.name === 'home' && isJP && (
          <HomeScreen
            planes={SAMPLE_PLANES.filter(p => p.estado !== 'Evaluada' && p.estado !== 'Cocinada')}
            lista={SAMPLE_LISTA}
            onCocinar={(p)     => navigate('cocinar',  { recetaId: p.recetaId })}
            onVerReceta={(p)   => navigate('detalle',  { recetaId: p.recetaId })}
            onIrCompras={()    => navigate('compras')}
            onQueCocino={()    => navigate('que-cocino')}
            onAgregar={()      => navigate('biblioteca')}
          />
        )}
        {route.name === 'home' && !isJP && (
          <MemberDashboardScreen
            nombre={nombre} miembroId={miembroId} semana="25–31 may"
            misPlanes={misPlanes}
            pendientes={pendientes}
            historial={SAMPLE_HISTORIAL}
            loading={t.memberState === 'loading'}
            error={t.memberState === 'error'}
            layout={t.memberLayout}
            onReintentar={() => setTweak('memberState', 'ready')}
            onCocinar={(p)        => navigate('cocinar', { recetaId: p.recetaId })}
            onVerReceta={(p)      => navigate('detalle', { recetaId: p.recetaId })}
            onEvaluar={(p)        => navigate('voto',    { planId: p.id })}
            onOpenHistorial={(h)  => navigate('historial-detalle', { histId: h.idHist })}
            onIrAHistorial={()    => navigate('historial')}
          />
        )}

        {/* ── Biblioteca ────────────────────────────────────────────────── */}
        {route.name === 'biblioteca' && (
          <BibliotecaScreen
            recetas={recetasParaMiembro}
            memberMode={!isJP}
            miNombre={nombre}
            menus={isJP ? SAMPLE_MENUS : []}
            onAbrir={r => navigate('detalle', { recetaId: r.id })}
            onAbrirMenu={m => navigate('detalle-menu', { menuId: m.id })}
            onImportar={isJP ? () => navigate('importar-receta') : undefined}
            onVerCatalogo={isJP ? () => navigate('catalogo') : undefined}
            onVerVisibilidad={isJP ? () => navigate('visibilidad') : undefined}
          />
        )}

        {/* ── Perfil de miembro ─────────────────────────────────────────── */}
        {route.name === 'perfil' && (
          <PerfilScreen
            miembros={miembrosPerfil}
            perfilId={perfilActivo}
            viewerId={miembroId}
            isJP={isJP}
            layout={t.perfilLayout}
            historial={SAMPLE_HISTORIAL}
            onCambiarPerfil={setPerfilViendo}
            onCambiarColor={cambiarColor}
            onAddPref={addPref}
            onRemovePref={removePref}
            onVerHistorial={() => navigate('historial')}
            onBack={() => navigate(isJP ? 'home' : 'home')}
          />
        )}

        {/* ── Asignar recetas / visibilidad por miembro (JP) ────────────── */}
        {route.name === 'visibilidad' && isJP && (
          <VisibilidadScreen
            recetas={recetas}
            vis={vis}
            onToggle={toggleVis}
            onBack={() => navigate('biblioteca')}
          />
        )}

        {/* ── Detalle de menú ───────────────────────────────────────────── */}
        {route.name === 'detalle-menu' && currentMenu && (
          <DetalleMenuScreen
            menu={currentMenu}
            recetas={recetas}
            isJP={isJP}
            macrosLayout={t.macrosLayout}
            onBack={() => navigate('biblioteca')}
            onAbrirReceta={r => navigate('detalle', { recetaId: r.id })}
          />
        )}

        {/* ── Catálogo de ingredientes ──────────────────────────────────── */}
        {route.name === 'catalogo' && (
          <CatalogoIngredientesScreen
            ingredientes={SAMPLE_INGREDIENTES}
            recetas={recetas}
            isJP={isJP}
            onBack={() => navigate('biblioteca')}
            onAbrirReceta={r => navigate('detalle', { recetaId: r.id })}
          />
        )}

        {/* ── Importar menú (JP) ────────────────────────────────────────── */}
        {route.name === 'importar' && (
          <ImportarMenuScreen isJP={isJP} onBack={() => navigate('biblioteca')}/>
        )}

        {/* ── Importar receta (JP) ──────────────────────────────────────── */}
        {route.name === 'importar-receta' && (
          <ImportarRecetaScreen isJP={isJP} onBack={() => navigate('biblioteca')}/>
        )}

        {/* ── Compras ───────────────────────────────────────────────────── */}
        {route.name === 'compras' && (
          <ComprasScreen planes={SAMPLE_COMPRA_PLANES}/>
        )}

        {/* ── ¿Qué cocino con lo que tengo? ─────────────────────────────── */}
        {route.name === 'que-cocino' && (
          <CocinarConQueTengoScreen
            recetas={recetas}
            ingredientes={SAMPLE_INGREDIENTES}
            layout={t.matchLayout}
            onBack={() => navigate('home')}
            onAbrirReceta={r => navigate('detalle', { recetaId: r.id })}
          />
        )}

        {/* ── Pendientes (miembros) ─────────────────────────────────────── */}
        {route.name === 'pendientes' && (
          <>
            <h2 style={{ marginBottom: 4 }}>Pendientes de evaluar</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 16px' }}>
              {pendientes.length === 0
                ? 'Nada esperando tu nota.'
                : `${pendientes.length} ${pendientes.length === 1 ? 'plato' : 'platos'} esperando tu nota.`}
            </p>
            {pendientes.length === 0 ? (
              <div style={{
                padding: '40px 0', textAlign: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 14,
              }}>
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>
                  Todo al día.
                </p>
              </div>
            ) : (
              pendientes.map(p => (
                <div key={p.id} style={{
                  background: 'var(--surface-strong)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '14px 16px', marginBottom: 10,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-strong)', fontSize: 14 }}>
                      {p.nombre}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                      Cocinada · esperando tu nota
                    </p>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => navigate('voto', { planId: p.id })}>
                    Evaluar
                  </Button>
                </div>
              ))
            )}
          </>
        )}

        {/* ── Voto (Cocinada → evaluar) / VistaEvaluada (Evaluada) ─────── */}
        {route.name === 'voto' && currentPlan && (
          <VotoScreen
            plan={currentPlan} miembroId={miembroId} isJP={isJP}
            onBack={() => navigate(isJP ? 'home' : 'pendientes')}
            onGuardar={() => navigate(isJP ? 'home' : 'pendientes')}
          />
        )}

        {/* ── Historial (lista + buscador) ──────────────────────────────── */}
        {route.name === 'historial' && (
          <HistorialScreen
            entries={SAMPLE_HISTORIAL} miembroId={miembroId}
            onAbrir={h => navigate('historial-detalle', { histId: h.idHist })}
          />
        )}

        {/* ── Historial detalle ────────────────────────────────────────── */}
        {route.name === 'historial-detalle' && currentHist && (
          <HistorialDetalleScreen
            entry={currentHist}
            onBack={() => navigate('historial')}
            onVerReceta={(idReceta) => navigate('detalle', { recetaId: idReceta })}
          />
        )}

        {/* ── Detalle receta ────────────────────────────────────────────── */}
        {route.name === 'detalle' && currentRecipe && (
          <DetalleRecetaScreen
            receta={currentRecipe}
            isJP={isJP}
            catalogo={SAMPLE_INGREDIENTES}
            mostrarSubs={t.mostrarSubs}
            subsEstilo={t.subsEstilo}
            macrosLayout={t.macrosLayout}
            puedeCocinar={puedeCocinarReceta}
            onBack={() => navigate('biblioteca')}
            onCocinar={() => navigate('cocinar', { recetaId: currentRecipe.id })}
            onElegirComoEspecial={() => navigate('home')}
            onSumarExtra={() => navigate('home')}
            onGuardarReceta={(upd) => setRecetas(prev => prev.map(r => r.id === upd.id ? upd : r))}
          />
        )}

        {/* ── Cocinar (paso a paso) ─────────────────────────────────────── */}
        {route.name === 'cocinar' && currentRecipe && (
          <CocinarScreen
            receta={currentRecipe}
            catalogo={SAMPLE_INGREDIENTES}
            mostrarSubs={t.mostrarSubs}
            onBack={() => navigate('detalle', { recetaId: currentRecipe.id })}
            onFinalizar={() => navigate('home')}
          />
        )}
      </main>

      <BottomNav
        active={tabFor(route)}
        onNavigate={onTabClick}
        isJP={isJP}
      />

      {/* ── Tweaks panel: cambio de rol + saltos de pantalla ───────────── */}
      <TweaksPanel title="Tweaks — Comida Familiar">
        <TweakSection label="Rol activo"/>
        <TweakRadio
          label="Miembro"
          value={t.viewMode}
          options={[
            { value: 'juanpablo', label: 'JP' },
            { value: 'maria',     label: 'M'  },
            { value: 'sofia',     label: 'S'  },
            { value: 'federico',  label: 'F'  },
          ]}
          onChange={(v) => setTweak('viewMode', v)}
        />

        <TweakSection label="Ir a pantalla"/>
        <TweakSelect
          label="Ruta"
          value={route.name}
          options={[
            { value: 'home',              label: isJP ? 'Inicio (JP)' : 'Mi semana' },
            { value: 'que-cocino',        label: '¿Qué cocino con lo que tengo?' },
            { value: 'perfil',            label: 'Perfil de miembro' },
            { value: 'biblioteca',        label: isJP ? 'Biblioteca' : 'Mis recetas' },
            ...(isJP ? [{ value: 'visibilidad', label: 'Asignar recetas (visibilidad)' }] : []),
            { value: 'detalle-menu',      label: 'Detalle de menú (Español de mar)' },
            { value: 'catalogo',          label: 'Catálogo de ingredientes' },
            { value: 'compras',           label: 'Compras' },
            { value: 'historial',         label: 'Historial (lista)' },
            { value: 'historial-detalle', label: 'Historial detalle (Bondiola)' },
            { value: 'voto',              label: pendientes[0] ? `Evaluar: ${pendientes[0].nombre}` : 'Evaluar (sin pendientes)' },
            { value: 'detalle',           label: 'Detalle receta (Bondiola)' },
            { value: 'cocinar',           label: 'Cocinar (Bondiola)' },
            ...(isJP ? [{ value: 'importar-receta', label: 'Importar receta' }] : []),
          ]}
          onChange={(v) => {
            if (v === 'historial-detalle') navigate('historial-detalle', { histId: 'h1' });
            else if (v === 'detalle-menu') navigate('detalle-menu', { menuId: 'm1' });
            else if (v === 'voto' && pendientes[0]) navigate('voto', { planId: pendientes[0].id });
            else if (v === 'voto') navigate('voto', { planId: 'p6' }); // VistaEvaluada (Tarta)
            else if (v === 'detalle' || v === 'cocinar') navigate(v, { recetaId: 'r1' });
            else navigate(v);
          }}
        />

        <TweakSection label="¿Qué cocino? — layout"/>        <TweakRadio
          label="Resultados"
          value={t.matchLayout}
          options={[
            { value: 'cercania', label: 'Cercanía' },
            { value: 'ranking',  label: 'Ranking' },
          ]}
          onChange={(v) => { setTweak('matchLayout', v); navigate('que-cocino'); }}
        />

        <TweakSection label="Sustitutos (detalle/cocinar)"/>        <TweakToggle
          label="Mostrar sustitutos"
          value={t.mostrarSubs}
          onChange={(v) => setTweak('mostrarSubs', v)}
        />
        <TweakRadio
          label="Estilo"
          value={t.subsEstilo}
          options={[
            { value: 'inline', label: 'o X' },
            { value: 'chip',   label: 'Chip' },
          ]}
          onChange={(v) => setTweak('subsEstilo', v)}
        />

        <TweakSection label="Macros (detalle/menú)"/>
        <TweakRadio
          label="Layout"
          value={t.macrosLayout}
          options={[
            { value: 'estrella', label: 'Estrella' },
            { value: 'tabla',    label: 'Tabla' },
          ]}
          onChange={(v) => { setTweak('macrosLayout', v); }}
        />

        <TweakSection label="Perfil de miembro — layout"/>
        <TweakRadio
          label="Diseño"
          value={t.perfilLayout}
          options={[
            { value: 'hero',     label: 'Hero' },
            { value: 'compacto', label: 'Compacto' },
          ]}
          onChange={(v) => { setTweak('perfilLayout', v); navigate('perfil'); }}
        />

        {/* Variaciones de la vista de miembro */}
        {!isJP && (
          <>
            <TweakSection label="Mi semana — layout"/>
            <TweakRadio
              label="Diseño"
              value={t.memberLayout}
              options={[
                { value: 'rows',  label: 'Filas' },
                { value: 'cards', label: 'Cards' },
              ]}
              onChange={(v) => setTweak('memberLayout', v)}
            />
            <TweakSection label="Estado de carga"/>
            <TweakRadio
              label="Estado"
              value={t.memberState}
              options={[
                { value: 'ready',   label: 'OK' },
                { value: 'loading', label: 'Cargando' },
                { value: 'error',   label: 'Error' },
              ]}
              onChange={(v) => setTweak('memberState', v)}
            />
          </>
        )}

        <TweakSection label="Estados — saltos rápidos"/>
        <TweakButton label="Vista evaluada (Tarta)" secondary
          onClick={() => navigate('voto', { planId: 'p6' })}/>
        <TweakButton label="Voto a medias (Risotto)" secondary
          onClick={() => navigate('voto', { planId: 'p5' })}/>
        <TweakButton label="Sin votos (Pollo)" secondary
          onClick={() => navigate('voto', { planId: 'p4' })}/>
      </TweaksPanel>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          key={toast.id}
          style={{
            position: 'absolute', left: '50%', bottom: 88,
            transform: 'translateX(-50%)', zIndex: 60,
            maxWidth: 'calc(100% - 32px)', textAlign: 'center',
            background: toast.ok ? 'var(--ok-bg)' : 'var(--err-bg)',
            color: toast.ok ? 'var(--ok-text)' : 'var(--err-text)',
            border: `1px solid ${toast.ok ? 'var(--ok-line)' : 'var(--err-line)'}`,
            borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 500,
            boxShadow: 'var(--shadow-toast)',
            animation: 'cf-toast-in 200ms ease',
          }}
        >{toast.text}</div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
