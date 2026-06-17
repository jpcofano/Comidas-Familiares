// ImportarRecetaScreen.jsx — JP-only: import recipes from a TXT block.
// 3-step flow (pegar/parsear → revisar matching de ingredientes → resultado),
// rebuilt entirely on design tokens. Mocked parser for the prototype.

const RECETA_PLACEHOLDER =
`#RECETA
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

#INGREDIENTES
seccion | ingrediente | cantidad | unidad | opcional
Principal | Muslos de pollo | 800 | g | No
Principal | Leche de coco | 400 | ml | No
Base de sabor | Cebolla | 1 | u | No
Condimentos | Curry rojo en pasta | 2 | cda | No

#PASOS
1 | Saltear aromáticos | Dorar la cebolla y sumar el curry. | 5 min
2 | Sellar el pollo | Sellar los muslos 3 min por lado. | 6 min
3 | Cocción con coco | Sumar la leche de coco y cocinar tapado. | 25 min`;

// Mocked parse result — demonstrates the three match types
const MOCK_FILAS = [
  { texto: 'Muslos de pollo',      unidad: '800 g', tipo: 'exacto',     catalogo: 'Pollo (muslo)' },
  { texto: 'Leche de coco',        unidad: '400 ml', tipo: 'sugerencia', sugerencias: [
      { id: 'ING-0231', nombre: 'Leche de coco', categoria: 'Almacén' },
      { id: 'ING-0232', nombre: 'Crema de coco', categoria: 'Almacén' },
    ] },
  { texto: 'Cebolla',             unidad: '1 u', tipo: 'exacto',     catalogo: 'Cebolla' },
  { texto: 'Curry rojo en pasta', unidad: '2 cda', tipo: 'nuevo',    nombre: 'Curry rojo en pasta', categoria: 'Condimentos' },
];

const CATEGORIAS = ['Almacén', 'Condimentos', 'Verdulería', 'Carnicería', 'Despensa varios'];

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepHeader({ paso, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <button onClick={onBack} aria-label="Volver" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4, fontFamily: 'inherit',
      }}>
        <Icon name="chevron-left" size={20}/>
      </button>
      <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-strong)' }}>Importar receta</h2>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>Paso {paso} de 3</span>
    </div>
  );
}

function MatchBadge({ tipo }) {
  const M = {
    exacto:     { bg: 'var(--ok-bg)',   color: 'var(--ok-text)',   label: '✓ Exacto' },
    sugerencia: { bg: 'var(--warn-bg)', color: 'var(--warn-text)', label: '⚠ Sugerencias' },
    nuevo:      { bg: 'var(--surface-alt)', color: 'var(--muted-strong)', label: '+ Nuevo' },
  }[tipo];
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: M.bg, color: M.color, whiteSpace: 'nowrap' }}>
      {M.label}
    </span>
  );
}

// ─── Paso 1 ──────────────────────────────────────────────────────────────────

function Paso1({ txt, setTxt, onParsear, parsing, parseError }) {
  const [copiado, setCopiado] = React.useState(false);
  const [archivo, setArchivo] = React.useState(null);

  function copiarPrompt() {
    navigator.clipboard?.writeText('Convertí esta receta al formato #RECETA / #INGREDIENTES / #PASOS…').catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  }

  const inputBox = {
    background: 'var(--surface-strong)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '14px 16px', marginBottom: 12,
  };

  return (
    <>
      {/* Copiar prompt */}
      <div style={inputBox}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>Copiar prompt para tu IA</p>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          Copiá el prompt, pegáselo a tu IA junto con la receta en texto libre y traé el resultado acá.
        </p>
        <Button variant={copiado ? 'secondary' : 'primary'} size="sm" onClick={copiarPrompt}>
          {copiado ? 'Copiado ✓' : 'Copiar prompt'}
        </Button>
      </div>

      {/* Pegar / subir */}
      <div style={inputBox}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer',
            background: 'var(--surface-strong)', color: 'var(--text)', fontSize: 12, fontWeight: 500,
          }}>
            <Icon name="upload" size={14}/> Subir .txt
            <input type="file" accept=".txt,text/plain" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (!f) return;
                setArchivo(f.name);
                const r = new FileReader();
                r.onload = ev => setTxt(String(ev.target?.result || ''));
                r.readAsText(f, 'utf-8');
                e.target.value = '';
              }}/>
          </label>
          {archivo && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Cargado: <strong>{archivo}</strong></span>}
        </div>

        <textarea
          value={txt}
          onChange={e => setTxt(e.target.value)}
          placeholder={RECETA_PLACEHOLDER}
          rows={12}
          disabled={parsing}
          style={{
            width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: 11,
            padding: 10, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', resize: 'vertical', lineHeight: 1.5,
          }}/>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => setTxt(RECETA_PLACEHOLDER)} disabled={parsing}>Cargar ejemplo</Button>
          {txt && <Button variant="ghost" size="sm" onClick={() => { setTxt(''); setArchivo(null); }} disabled={parsing}>Limpiar</Button>}
          <span style={{ flex: 1 }}/>
          <Button variant="primary" size="sm" onClick={onParsear} disabled={parsing || !txt.trim()}>
            {parsing ? <><Spinner size={13} color="#fff"/> Parseando…</> : 'Parsear'}
          </Button>
        </div>

        {parseError && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--err-bg)', border: '1px solid var(--err-line)', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--err-text)' }}>Errores de parseo</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--err-text)' }}>{parseError}</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Paso 2 — revisar matching ───────────────────────────────────────────────

function FilaIngrediente({ fila, onChange }) {
  return (
    <div style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-strong)' }}>{fila.texto}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{fila.unidad}</span>
        <span style={{ marginLeft: 'auto' }}><MatchBadge tipo={fila.tipo}/></span>
      </div>

      {fila.tipo === 'exacto' && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          Catálogo: <strong style={{ color: 'var(--muted-strong)' }}>{fila.catalogo}</strong>
        </p>
      )}

      {fila.tipo === 'sugerencia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {fila.sugerencias.map(s => {
            const sel = fila.elegida === s.id;
            return (
              <button key={s.id} onClick={() => onChange({ ...fila, elegida: s.id })} style={{
                textAlign: 'left', padding: '7px 10px', borderRadius: 8, fontFamily: 'inherit',
                border: `1px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                background: sel ? 'var(--primary-soft)' : 'var(--surface-strong)', cursor: 'pointer', fontSize: 13,
              }}>
                <strong style={{ color: 'var(--text-strong)' }}>{s.nombre}</strong>
                <span style={{ color: 'var(--muted)', marginLeft: 8, fontWeight: 400 }}>{s.categoria}</span>
              </button>
            );
          })}
          <button onClick={() => onChange({ ...fila, elegida: '__nuevo' })} style={{
            textAlign: 'left', padding: '7px 10px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13,
            border: `1px dashed ${fila.elegida === '__nuevo' ? 'var(--muted-strong)' : 'var(--line)'}`,
            background: fila.elegida === '__nuevo' ? 'var(--surface-alt)' : 'transparent',
            color: 'var(--muted-strong)', cursor: 'pointer',
          }}>+ Crear ingrediente nuevo</button>
        </div>
      )}

      {(fila.tipo === 'nuevo' || fila.elegida === '__nuevo') && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" defaultValue={fila.nombre || fila.texto} placeholder="Nombre en catálogo"
            style={{ flex: 1, minWidth: 150, fontSize: 13, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text)', fontFamily: 'inherit' }}/>
          <select defaultValue={fila.categoria || CATEGORIAS[0]}
            style={{ fontSize: 13, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-strong)', color: 'var(--text)', fontFamily: 'inherit' }}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function Paso2({ filas, setFilas, onGuardar, onVolver, guardando }) {
  const nuevos = filas.filter(f => f.tipo === 'nuevo' || f.elegida === '__nuevo').length;
  const sugerencias = filas.filter(f => f.tipo === 'sugerencia').length;
  return (
    <>
      <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-strong)', fontSize: 14 }}>Pollo al curry rojo</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{filas.length} ingredientes · 3 pasos</p>
        {(sugerencias > 0 || nuevos > 0) && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--muted-strong)' }}>
            {sugerencias > 0 && `${sugerencias} a confirmar`}{sugerencias > 0 && nuevos > 0 && ' · '}{nuevos > 0 && `${nuevos} nuevo${nuevos > 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--muted)' }}>
        Revisá cómo se resolvió cada ingrediente contra el catálogo.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {filas.map((f, i) => (
          <FilaIngrediente key={i} fila={f} onChange={nf => setFilas(prev => prev.map((x, j) => j === i ? nf : x))}/>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" onClick={onVolver}>← Volver</Button>
        <span style={{ flex: 1 }}/>
        <Button variant="primary" onClick={onGuardar} disabled={guardando}>
          {guardando ? <><Spinner size={13} color="#fff"/> Guardando…</> : 'Confirmar y guardar'}
        </Button>
      </div>
    </>
  );
}

// ─── Paso 3 — resultado ──────────────────────────────────────────────────────

function ResultBlock({ tone, title, children }) {
  const T = {
    ok:   { bg: 'var(--ok-bg)',   line: 'var(--ok-line)',   color: 'var(--ok-text)' },
    warn: { bg: 'var(--warn-bg)', line: 'var(--warn-line)', color: 'var(--warn-text)' },
    err:  { bg: 'var(--err-bg)',  line: 'var(--err-line)',  color: 'var(--err-text)' },
  }[tone];
  return (
    <div style={{ background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.color }}>{title}</p>
      <div style={{ marginTop: 4, fontSize: 12, color: T.color }}>{children}</div>
    </div>
  );
}

function Paso3({ onImportarOtra }) {
  return (
    <>
      <ResultBlock tone="ok" title="1 receta creada">
        <p style={{ margin: 0 }}><strong>REC-0148</strong> — Pollo al curry rojo</p>
      </ResultBlock>
      <ResultBlock tone="warn" title="1 ingrediente nuevo agregado al catálogo">
        Curry rojo en pasta (Condimentos)
      </ResultBlock>
      <div style={{ marginTop: 4 }}>
        <Button variant="secondary" size="sm" onClick={onImportarOtra}>Importar otra</Button>
      </div>
    </>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

function ImportarRecetaScreen({ isJP, onBack }) {
  if (!isJP) {
    return (
      <>
        <StepHeader paso={1} onBack={onBack}/>
        <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Esta sección es solo para Juan Pablo.</p>
        </div>
      </>
    );
  }

  const [paso, setPaso] = React.useState(1);
  const [txt, setTxt] = React.useState('');
  const [parsing, setParsing] = React.useState(false);
  const [parseError, setParseError] = React.useState(null);
  const [filas, setFilas] = React.useState([]);
  const [guardando, setGuardando] = React.useState(false);

  function handleParsear() {
    setParseError(null);
    if (!txt.trim().startsWith('#RECETA')) {
      setParseError('Falta el header #RECETA al inicio del bloque.');
      return;
    }
    setParsing(true);
    setTimeout(() => {
      setParsing(false);
      setFilas(MOCK_FILAS.map(f => ({ ...f })));
      setPaso(2);
    }, 700);
  }

  function handleGuardar() {
    setGuardando(true);
    setTimeout(() => { setGuardando(false); setPaso(3); }, 900);
  }

  function reset() {
    setTxt(''); setFilas([]); setParseError(null); setPaso(1);
  }

  return (
    <div>
      <StepHeader paso={paso} onBack={paso === 1 ? onBack : () => setPaso(paso - 1)}/>
      {paso === 1 && <Paso1 txt={txt} setTxt={setTxt} onParsear={handleParsear} parsing={parsing} parseError={parseError}/>}
      {paso === 2 && <Paso2 filas={filas} setFilas={setFilas} onGuardar={handleGuardar} onVolver={() => setPaso(1)} guardando={guardando}/>}
      {paso === 3 && <Paso3 onImportarOtra={reset}/>}
    </div>
  );
}

window.ImportarRecetaScreen = ImportarRecetaScreen;
