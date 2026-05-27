// App.jsx — main interactive shell + sample data + route state

const SAMPLE_PLANES = [
  {
    id: 'p1', tipo: 'Especial', estado: 'Compra pendiente',
    nombre: 'Bondiola braseada al Malbec',
    proteina: 'Cerdo', tiempo: '3 h', dificultad: 'Media-alta',
    cocineros: ['Juan Pablo', 'María'],
    recetaId: 'r1',
  },
  {
    id: 'p2', tipo: 'Especial extra', estado: 'Compra lista',
    nombre: 'Langostinos al ajillo',
    proteina: 'Mariscos', tiempo: '25 min', dificultad: 'Baja',
    cocineros: ['Juan Pablo'],
    recetaId: 'r2',
  },
  {
    id: 'p3', tipo: 'En proceso', estado: 'Cocinando',
    nombre: 'Berenjenas grilladas con criolla',
    proteina: 'Vegetariana', tiempo: '40 min', dificultad: 'Baja',
    cocineros: ['Sofía', 'Federico'],
    recetaId: 'r3',
  },
];

const SAMPLE_LISTA = { pendientes: 7, yaTengo: 11 };

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

const SAMPLE_COMPRAS = [
  { id: 'c1', seccion: 'Carnicería',  receta: 'Bondiola al Malbec',           nombre: 'Bondiola de cerdo', cantidad: '1.2 kg',  yaTengo: false },
  { id: 'c2', seccion: 'Almacén',     receta: 'Bondiola al Malbec',           nombre: 'Malbec',            cantidad: '1 bot.',  yaTengo: true  },
  { id: 'c3', seccion: 'Verdulería',  receta: 'Bondiola al Malbec',           nombre: 'Cebolla',           cantidad: '2 u',     yaTengo: false },
  { id: 'c4', seccion: 'Verdulería',  receta: 'Bondiola al Malbec',           nombre: 'Zanahoria',         cantidad: '2 u',     yaTengo: true  },
  { id: 'c5', seccion: 'Pescadería',  receta: 'Langostinos al ajillo',        nombre: 'Langostinos',       cantidad: '500 g',   yaTengo: false },
  { id: 'c6', seccion: 'Verdulería',  receta: 'Langostinos al ajillo',        nombre: 'Ajo',               cantidad: '1 cabeza', yaTengo: false },
  { id: 'c7', seccion: 'Verdulería',  receta: 'Langostinos al ajillo',        nombre: 'Perejil',           cantidad: '1 atado', yaTengo: false },
  { id: 'c8', seccion: 'Verdulería',  receta: 'Berenjenas grilladas',         nombre: 'Berenjenas',        cantidad: '2 u',     yaTengo: false },
  { id: 'c9', seccion: 'Verdulería',  receta: 'Berenjenas grilladas',         nombre: 'Tomate',            cantidad: '2 u',     yaTengo: true  },
];

function App() {
  const [authed, setAuthed]       = React.useState(true);
  const [route, setRoute]         = React.useState({ name: 'home' });

  function navigate(name, params = {}) { setRoute({ name, ...params }); }

  const currentRecipe = route.recetaId ? SAMPLE_RECETAS.find(r => r.id === route.recetaId) : null;

  if (!authed) {
    return <LoginScreen onSignIn={() => setAuthed(true)}/>;
  }

  // Map route → bottom-nav tab id
  const tabFor = (r) => {
    if (r.name === 'home') return 'home';
    if (r.name === 'biblioteca' || r.name === 'detalle') return 'biblioteca';
    if (r.name === 'compras') return 'compras';
    if (r.name === 'historial') return 'historial';
    return '';
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: 'var(--bg)', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <Header nombre="Juan Pablo"/>
      <main style={{
        flex: 1, overflow: 'auto',
        padding: '16px 16px 92px',
      }}>
        {route.name === 'home' && (
          <HomeScreen
            planes={SAMPLE_PLANES}
            lista={SAMPLE_LISTA}
            onCocinar={(p)     => navigate('cocinar',  { recetaId: p.recetaId })}
            onVerReceta={(p)   => navigate('detalle',  { recetaId: p.recetaId })}
            onIrCompras={()    => navigate('compras')}
            onAgregar={()      => navigate('biblioteca')}
          />
        )}
        {route.name === 'biblioteca' && (
          <BibliotecaScreen
            recetas={SAMPLE_RECETAS}
            onAbrir={r => navigate('detalle', { recetaId: r.id })}
          />
        )}
        {route.name === 'compras' && (
          <ComprasScreen items={SAMPLE_COMPRAS}/>
        )}
        {route.name === 'historial' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: 'var(--muted)', fontSize: 13 }}>
              Historial — sin entradas todavía.
            </p>
          </div>
        )}
        {route.name === 'detalle' && currentRecipe && (
          <DetalleRecetaScreen
            receta={currentRecipe}
            onBack={() => navigate('biblioteca')}
            onCocinar={() => navigate('cocinar', { recetaId: currentRecipe.id })}
            onElegirComoEspecial={() => navigate('home')}
            onSumarExtra={() => navigate('home')}
          />
        )}
        {route.name === 'cocinar' && currentRecipe && (
          <CocinarScreen
            receta={currentRecipe}
            onBack={() => navigate('detalle', { recetaId: currentRecipe.id })}
            onFinalizar={() => navigate('home')}
          />
        )}
      </main>

      <BottomNav
        active={tabFor(route)}
        onNavigate={(id) => navigate(id)}
        isJP
      />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
