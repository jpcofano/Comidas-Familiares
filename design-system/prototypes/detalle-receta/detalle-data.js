// detalle-data.js — Mock recipe data matching the repo schema
window.RECETA_DETALLE = {
  id: 'r-milas-pure',
  nombre: 'Milanesas con puré',
  tipoItem: 'Receta',
  porQueEspecial: 'El clásico de los viernes. Funciona para chicos, fácil de armar, sobra para sándwich del sábado.',
  porcionesLabel: '5',
  tiempoActivoLabel: '25 min',
  tiempoTotalLabel: '50 min',
  proteinaPrincipal: 'Carne',
  dificultad: 'Fácil',
  costoEstimado: 'Medio',
  escenarioUso: 'Cena familiar',
  estilo: 'Clásico AR',
  tecnicaPrincipal: 'Fritura',
  hidratos: true,
  sinLacteos: false,
  aptoNocheDeADos: 'No',
  notas: 'Si sobra puré, mezclalo con queso rallado y lo gratinás al horno otro día.',
  riesgos: 'Atención con el aceite caliente al freír. Mantener a los chicos lejos de la sartén.',
  ingredientes: [
    { textoOriginal: 'Nalga en milanesas', cantidadLabel: '800', unidad: 'g', seccion: 'Carnicería' },
    { textoOriginal: 'Huevos',              cantidadLabel: '3',   unidad: 'un', seccion: 'Lácteos' },
    { textoOriginal: 'Leche',               cantidadLabel: '2',   unidad: 'L', seccion: 'Lácteos' },
    { textoOriginal: 'Manteca',             cantidadLabel: '200', unidad: 'g', seccion: 'Lácteos' },
    { textoOriginal: 'Pan rallado',         cantidadLabel: '500', unidad: 'g', seccion: 'Almacén' },
    { textoOriginal: 'Harina',              cantidadLabel: '300', unidad: 'g', seccion: 'Almacén' },
    { textoOriginal: 'Aceite girasol',      cantidadLabel: '500', unidad: 'ml', seccion: 'Almacén' },
    { textoOriginal: 'Papas',               cantidadLabel: '1.5', unidad: 'kg', seccion: 'Verdulería' },
    { textoOriginal: 'Ajo',                 cantidadLabel: '2',   unidad: 'dientes', seccion: 'Verdulería', opcional: true },
    { textoOriginal: 'Perejil',             cantidadLabel: '1',   unidad: 'puñado', seccion: 'Verdulería', opcional: true },
  ],
  pasos: [
    { nroPaso: 1, titulo: 'Preparar la milanesa', detalle: 'Salpimentar la carne. Pasar por harina, después por huevo batido, finalmente por pan rallado. Apretar bien para que adhiera.', tiempoEstimadoLabel: '8 min', puntoClave: 'Apretá el pan rallado con la palma para que no se caiga al freír.', errorComun: 'Si la carne está mojada, la harina no adhiere — secala con papel.' },
    { nroPaso: 2, titulo: 'Hervir las papas', detalle: 'Pelar y cortar en cubos grandes. Poner en agua FRÍA con sal, llevar a hervor. Cocinar 20 minutos hasta que un cuchillo entre fácil.', tiempoEstimadoLabel: '20 min', puntoClave: 'Arrancar con agua FRÍA, no caliente — cocina más parejo.' },
    { nroPaso: 3, titulo: 'Precalentar el aceite', detalle: 'Sartén grande con 1 cm de aceite. Calor medio-alto. Probar con una miga de pan rallado: tiene que dorar en 5 segundos.', tiempoEstimadoLabel: '5 min', errorComun: 'Si humea el aceite, está demasiado caliente — bajá la hornalla.' },
    { nroPaso: 4, titulo: 'Freír las milanesas', detalle: '3 minutos por lado o hasta dorado. No amontonar — de a 2 por vez. Escurrir sobre papel absorbente.', tiempoEstimadoLabel: '12 min', puntoClave: 'Si no chisporrotea al entrar, sacala y esperá.' },
    { nroPaso: 5, titulo: 'Hacer el puré', detalle: 'Colar las papas. Pisar con la manteca y agregar leche tibia de a poco. Sal a gusto.', tiempoEstimadoLabel: '5 min' },
    { nroPaso: 6, titulo: 'Emplatar', detalle: 'Puré en la base, milanesa encima. Si querés, un gajo de limón al costado.', tiempoEstimadoLabel: '2 min' },
  ],
};

// Plan-related state for action buttons
window.PLANES_ACTIVOS_MOCK = [];  // empty → all 3 actions enabled
