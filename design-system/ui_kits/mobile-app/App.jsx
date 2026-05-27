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
    proteina: 'Vegetariana', tiempo: '40 min', dificultad: 'Baja',
    cocineros: ['Sofía', 'Federico'],
    asignaciones: ['juanpablo', 'maria', 'sofia', 'federico'],
    recetaId: 'r3',
  },
  {
    id: 'p4', tipo: 'En proceso', estado: 'Cocinada',
    nombre: 'Pollo al limón',
    proteina: 'Pollo', tiempo: '50 min', dificultad: 'Baja',
    cocineros: ['Juan Pablo'],
    asignaciones: ['juanpablo', 'maria', 'sofia', 'federico'],
    recetaId: 'r5',
    votos: {},
    comentarios: {},
  },
  {
    id: 'p5', tipo: 'En proceso', estado: 'Cocinada',
    nombre: 'Risotto de hongos',
    proteina: 'Vegetariana', tiempo: '45 min', dificultad: 'Media',
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
  {
    id: 'p7', tipo: 'En proceso', estado: 'Cocinando',
    tipoSeleccion: 'menu', menuId: 'm1',
    nombre: 'Cena de invierno cálida',
    proteina: 'Mixto', tiempo: '3 h 40 min', dificultad: 'Media-alta',
    cocineros: ['Juan Pablo', 'María'],
    asignaciones: ['juanpablo', 'maria'],
    componentesCocinados: ['r1'],   // bondiola ya cocinada, falta berenjenas (opcional)
  },
];

// ─── Sample data — Lista de compras (cards y resumen) ────────────────────────

const SAMPLE_LISTA = { pendientes: 7, yaTengo: 11 };

const SAMPLE_COMPRAS = [
  { id: 'c1', seccion: 'Carnicería',  receta: 'Bondiola al Malbec',     nombre: 'Bondiola de cerdo', cantidad: '1.2 kg',   yaTengo: false },
  { id: 'c2', seccion: 'Almacén',     receta: 'Bondiola al Malbec',     nombre: 'Malbec',            cantidad: '1 bot.',   yaTengo: true  },
  { id: 'c3', seccion: 'Verdulería',  receta: 'Bondiola al Malbec',     nombre: 'Cebolla',           cantidad: '2 u',      yaTengo: false },
  { id: 'c4', seccion: 'Verdulería',  receta: 'Bondiola al Malbec',     nombre: 'Zanahoria',         cantidad: '2 u',      yaTengo: true  },
  { id: 'c5', seccion: 'Pescadería',  receta: 'Langostinos al ajillo',  nombre: 'Langostinos',       cantidad: '500 g',    yaTengo: false },
  { id: 'c6', seccion: 'Verdulería',  receta: 'Langostinos al ajillo',  nombre: 'Ajo',               cantidad: '1 cabeza', yaTengo: false },
  { id: 'c7', seccion: 'Verdulería',  receta: 'Langostinos al ajillo',  nombre: 'Perejil',           cantidad: '1 atado',  yaTengo: false },
  { id: 'c8', seccion: 'Verdulería',  receta: 'Berenjenas grilladas',   nombre: 'Berenjenas',        cantidad: '2 u',      yaTengo: false },
  { id: 'c9', seccion: 'Verdulería',  receta: 'Berenjenas grilladas',   nombre: 'Tomate',            cantidad: '2 u',      yaTengo: true  },
];

// ─── Sample data — Recetas ───────────────────────────────────────────────────

const SAMPLE_RECETAS = [
  {
    id: 'r1', nombre: 'Bondiola braseada al Malbec',
    tipo: 'Receta principal', proteina: 'Cerdo', tiempo: '3 h', dificultad: 'Media-alta',
    sinLacteos: true, sinHidratos: false,
    ingredientes: [
      '1.2 kg bondiola de cerdo',
      '1 botella Malbec',
      '2 cebollas, 2 zanahorias, 3 dientes de ajo',
      'Hierbas: laurel, tomillo, romero',
      'Aceite de oliva, sal, pimienta',
    ],
    pasos: [
      { titulo: 'Sellar la bondiola',     tiempo: '8 min',  tiempoMin: 8,   desc: 'Sellar a fuego alto en cazuela de hierro hasta dorar bien por todos los lados.' },
      { titulo: 'Sumar vino y reducir',   tiempo: '20 min', tiempoMin: 20,  desc: 'Agregar el Malbec y dejar reducir hasta la mitad.' },
      { titulo: 'Brasear a fuego bajo',   tiempo: '2 h',    tiempoMin: 120, desc: 'Tapar y cocinar a fuego bajo, dando vuelta cada 30 min.' },
      { titulo: 'Reposar y desmechar',    tiempo: '15 min', tiempoMin: 15,  desc: 'Retirar, reposar fuera del fuego y desmechar la carne.' },
    ],
  },
  {
    id: 'r2', nombre: 'Langostinos al ajillo',
    tipo: 'Receta principal', proteina: 'Mariscos', tiempo: '25 min', dificultad: 'Baja',
    sinLacteos: true, sinHidratos: true,
    ingredientes: ['500 g langostinos', '6 dientes de ajo', 'Perejil', 'Aceite de oliva', 'Ají molido', 'Sal'],
    pasos: [
      { titulo: 'Limpiar los langostinos', tiempo: '10 min', tiempoMin: 10, desc: 'Pelar, retirar el intestino.' },
      { titulo: 'Dorar el ajo',            tiempo: '3 min',  tiempoMin: 3,  desc: 'En aceite de oliva con ají molido.' },
      { titulo: 'Saltear y servir',        tiempo: '5 min',  tiempoMin: 5,  desc: 'Sumar langostinos, perejil. Servir.' },
    ],
  },
  {
    id: 'r3', nombre: 'Berenjenas grilladas con criolla',
    tipo: 'Guarnición', proteina: 'Vegetariana', tiempo: '40 min', dificultad: 'Baja',
    sinLacteos: true, sinHidratos: true,
    ingredientes: ['2 berenjenas', 'Sal gruesa', '2 tomates, 1 cebolla morada, 1 ají morrón', 'Aceite de oliva', 'Vinagre de vino, sal, pimienta'],
    pasos: [
      { titulo: 'Cortar y salar las berenjenas', tiempo: '20 min', tiempoMin: 20, desc: 'Dejar drenar para sacar amargor.' },
      { titulo: 'Armar la criolla',              tiempo: '10 min', tiempoMin: 10, desc: 'Picar bien chico, condimentar y dejar marinar.' },
      { titulo: 'Grillar y servir',              tiempo: '10 min', tiempoMin: 10, desc: 'A fuego fuerte hasta marcas. Cubrir con criolla.' },
    ],
  },
  {
    id: 'r4', nombre: 'Risotto de hongos',
    tipo: 'Receta principal', proteina: 'Vegetariana', tiempo: '45 min', dificultad: 'Media',
    sinLacteos: false, sinHidratos: false,
    ingredientes: [], pasos: [],
  },
  {
    id: 'r5', nombre: 'Pollo al limón',
    tipo: 'Receta principal', proteina: 'Pollo', tiempo: '50 min', dificultad: 'Baja',
    sinLacteos: true, sinHidratos: true,
    ingredientes: [], pasos: [],
  },
  {
    id: 'r6', nombre: 'Tarta de manzana',
    tipo: 'Postre', proteina: 'Huevos', tiempo: '1 h 20 min', dificultad: 'Media',
    sinLacteos: false, sinHidratos: false,
    ingredientes: [], pasos: [],
  },
];

// ─── Sample data — Menús (composiciones multi-receta) ────────────────────────

const SAMPLE_MENUS = [
  {
    idMenu: 'm1', nombreMenu: 'Cena de invierno cálida',
    escenarioUso: 'Cena familiar', estado: 'Sin probar',
    estilo: 'Reconfortante, lento, para fin de semana frío',
    climaDelMenu: 'Frío', idealPara: 'Cena de domingo o festejo informal',
    descripcion: 'Carne larga + acompañamiento liviano que corta. Para 4-6 personas, requiere planificación de la mañana.',
    dificultad: 'Media-alta', porciones: '4-6', sinLacteos: true,
    paraJuanPablo: 'La bondiola necesita 3 h reales, no apurarla. Sumar guarnición al final.',
    paraFamilia: 'Es comida sustancial; viene bien después de un día en la calle.',
    notas: 'La bondiola sola es suficiente. La berenjena es opcional pero corta bien la untuosidad.',
    componentes: [
      { idReceta: 'r1', tipo: 'Principal',  orden: 1, obligatorio: true,  notas: '' },
      { idReceta: 'r3', tipo: 'Guarnición', orden: 2, obligatorio: false, notas: 'Hacer cuando la bondiola esté reposando.' },
    ],
  },
  {
    idMenu: 'm2', nombreMenu: 'Mesa de domingo',
    escenarioUso: 'Almuerzo familiar', estado: 'Probado',
    estilo: 'Clásico de fin de semana, ritmo tranquilo',
    idealPara: 'Almuerzo largo de domingo, sin apuro',
    descripcion: 'Pollo al horno + un postre que se prepara mientras se cocina el pollo. Cierra una mesa para 4.',
    dificultad: 'Baja', porciones: '4',
    componentes: [
      { idReceta: 'r5', tipo: 'Principal', orden: 1, obligatorio: true,  notas: '' },
      { idReceta: 'r6', tipo: 'Postre',    orden: 2, obligatorio: true,  notas: 'Armar la masa mientras el pollo está al horno.' },
    ],
  },
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
  "showPendientesBadge": true
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

  const miembroId = t.viewMode;
  const isJP      = miembroId === 'juanpablo';
  const nombre    = MIEMBROS[miembroId]?.nombre || 'Juan Pablo';

  // ── Derivados de los planes ─────────────────────────────────────────────────

  const currentRecipe = route.recetaId
    ? SAMPLE_RECETAS.find(r => r.id === route.recetaId) : null;
  const currentPlan = route.planId
    ? SAMPLE_PLANES.find(p => p.id === route.planId) : null;
  const currentHist = route.histId
    ? SAMPLE_HISTORIAL.find(h => h.idHist === route.histId) : null;
  const currentMenu = route.menuId
    ? SAMPLE_MENUS.find(m => m.idMenu === route.menuId) : null;
  const currentPlanMenu = currentPlan && currentPlan.tipoSeleccion === 'menu'
    ? SAMPLE_MENUS.find(m => m.idMenu === currentPlan.menuId) : null;
  // recetasMap for menu screens
  const recetasMap = React.useMemo(
    () => Object.fromEntries(SAMPLE_RECETAS.map(r => [r.id, r])),
    []
  );

  // Pendientes de evaluar: plan en estado Cocinada para los que YO no voté
  const planesCocinados = SAMPLE_PLANES.filter(p => p.estado === 'Cocinada');
  const pendientes = planesCocinados.filter(p =>
    (p.asignaciones || []).includes(miembroId) && (p.votos?.[miembroId] == null)
  );

  // "Mi semana" del miembro: planes activos (no Evaluada) donde estoy asignado
  const misPlanes = SAMPLE_PLANES.filter(p =>
    p.estado !== 'Evaluada' && (p.asignaciones || []).includes(miembroId)
  );

  if (!authed) {
    return <LoginScreen onSignIn={() => setAuthed(true)}/>;
  }

  // ── Mapeo route → bottom-nav tab id ─────────────────────────────────────────

  const tabFor = (r) => {
    if (r.name === 'home') return 'home';
    if (r.name === 'biblioteca' || r.name === 'detalle' || r.name === 'importar') return 'biblioteca';
    if (r.name === 'compras')    return 'compras';
    if (r.name === 'pendientes' || r.name === 'voto') return isJP ? 'historial' : 'pendientes';
    if (r.name === 'historial' || r.name === 'historial-detalle') return 'historial';
    return '';
  };

  // El BottomNav distingue 'pendientes' solo para miembros. Para mantener el
  // contrato actual del componente (4 ids), traducimos clicks aquí.
  function onTabClick(id) {
    if (id === 'pendientes') return navigate('pendientes');
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
      <Header nombre={nombre} subtitle={headerSubtitle}/>

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
            onAgregar={()      => navigate('biblioteca')}
          />
        )}
        {route.name === 'home' && !isJP && (
          <MemberDashboardScreen
            nombre={nombre} miembroId={miembroId} semana="25–31 may"
            misPlanes={misPlanes}
            pendientes={pendientes}
            historial={SAMPLE_HISTORIAL}
            onCocinar={(p)        => navigate('cocinar', { recetaId: p.recetaId })}
            onVerReceta={(p)      => navigate('detalle', { recetaId: p.recetaId })}
            onEvaluar={(p)        => navigate('voto',    { planId: p.id })}
            onOpenHistorial={(h)  => navigate('historial-detalle', { histId: h.idHist })}
            onIrAHistorial={()    => navigate('historial')}
          />
        )}

        {/* ── Biblioteca (con cabecera "Importar" para JP) ──────────────── */}
        {route.name === 'biblioteca' && (
          <>
            {isJP && (
              <button
                onClick={() => navigate('importar')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--surface-strong)', border: '1px solid var(--border)',
                  borderRadius: 9999, padding: '6px 12px',
                  color: 'var(--primary)', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  marginBottom: 12,
                }}
              >
                <Icon name="upload" size={14}/>
                Importar menú
              </button>
            )}
            <BibliotecaScreen
              recetas={SAMPLE_RECETAS}
              onAbrir={r => navigate('detalle', { recetaId: r.id })}
            />
          </>
        )}

        {/* ── Importar menú (JP) ────────────────────────────────────────── */}
        {route.name === 'importar' && (
          <ImportarMenuScreen isJP={isJP} onBack={() => navigate('biblioteca')}/>
        )}

        {/* ── Compras ───────────────────────────────────────────────────── */}
        {route.name === 'compras' && (
          <ComprasScreen items={SAMPLE_COMPRAS}/>
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
            onBack={() => navigate('biblioteca')}
            onCocinar={() => navigate('cocinar', { recetaId: currentRecipe.id })}
            onElegirComoEspecial={() => navigate('home')}
            onSumarExtra={() => navigate('home')}
          />
        )}

        {/* ── Cocinar (paso a paso) ─────────────────────────────────────── */}
        {route.name === 'cocinar' && currentRecipe && (
          <CocinarScreen
            receta={currentRecipe}
            onBack={() => navigate('detalle', { recetaId: currentRecipe.id })}
            onFinalizar={() => navigate('home')}
          />
        )}

        {/* ── Detalle menú (multi-receta) ──────────────────────────────── */}
        {route.name === 'menu-detalle' && currentMenu && (
          <DetalleMenuScreen
            menu={currentMenu}
            recetasMap={recetasMap}
            isJP={isJP}
            onBack={() => navigate('biblioteca')}
            onAbrirReceta={(id) => navigate('detalle', { recetaId: id })}
            onElegirEspecial={() => navigate('home')}
            onSumarEnProceso={() => navigate('home')}
          />
        )}

        {/* ── Seleccionar componente (cocinar un menú activo) ──────────── */}
        {route.name === 'componentes-menu' && currentPlan && currentPlanMenu && (
          <SeleccionarComponenteMenuScreen
            plan={currentPlan}
            menu={currentPlanMenu}
            recetasMap={recetasMap}
            onBack={() => navigate('home')}
            onCocinarReceta={(id) => navigate('cocinar', { recetaId: id })}
            onDesmarcar={() => {}}
            onFinalizarMenu={() => navigate('home')}
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
            { value: 'biblioteca',        label: 'Biblioteca' },
            { value: 'compras',           label: 'Compras' },
            ...(isJP ? [] : [{ value: 'pendientes', label: 'Pendientes de evaluar' }]),
            { value: 'historial',         label: 'Historial (lista)' },
            { value: 'historial-detalle', label: 'Historial detalle (Bondiola)' },
            { value: 'voto',              label: pendientes[0] ? `Evaluar: ${pendientes[0].nombre}` : 'Evaluar (sin pendientes)' },
            { value: 'detalle',           label: 'Detalle receta (Bondiola)' },
            { value: 'cocinar',           label: 'Cocinar (Bondiola)' },
            { value: 'menu-detalle',      label: 'Detalle menú (Cena de invierno)' },
            { value: 'componentes-menu',  label: 'Cocinando menú (componentes)' },
            ...(isJP ? [{ value: 'importar', label: 'Importar menú' }] : []),
          ]}
          onChange={(v) => {
            if (v === 'historial-detalle') navigate('historial-detalle', { histId: 'h1' });
            else if (v === 'voto' && pendientes[0]) navigate('voto', { planId: pendientes[0].id });
            else if (v === 'voto') navigate('voto', { planId: 'p6' }); // VistaEvaluada (Tarta)
            else if (v === 'detalle' || v === 'cocinar') navigate(v, { recetaId: 'r1' });
            else if (v === 'menu-detalle') navigate('menu-detalle', { menuId: 'm1' });
            else if (v === 'componentes-menu') navigate('componentes-menu', { planId: 'p7' });
            else navigate(v);
          }}
        />

        <TweakSection label="Estados — saltos rápidos"/>
        <TweakButton label="Vista evaluada (Tarta)" secondary
          onClick={() => navigate('voto', { planId: 'p6' })}/>
        <TweakButton label="Voto a medias (Risotto)" secondary
          onClick={() => navigate('voto', { planId: 'p5' })}/>
        <TweakButton label="Sin votos (Pollo)" secondary
          onClick={() => navigate('voto', { planId: 'p4' })}/>
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
