// ImportarMenuScreen.jsx — JP-only: importar un menú desde TXT.
// Refinado al nivel de Importar receta: paso 1 pegar/parsear → paso 2 revisar
// componentes → resultado. Todo sobre design tokens. Parser mockeado.

const MENU_PLACEHOLDER =
`#MENU
nombre: Español de mar
escenarioUso: Noche de a dos
estilo: Español / mediterráneo
estado: Para probar
aptoNocheDeADos: Sí
hidratoOpcional: Arroz blanco o pan aparte
notas: Muy especial

#COMPONENTES
orden | tipo      | idReceta_o_nombre         | obligatorio | notas
1     | Entrada   | Langostinos al ajillo     | Sí          | Sin manteca
2     | Principal | REC-0102                  | Sí          |
3     | Postre    | Frutas asadas con canela  | No          |`;

// Mock parse → menú + componentes
const MOCK_MENU = {
  nombre: 'Español de mar',
  escenarioUso: 'Noche de a dos',
  estilo: 'Español / mediterráneo',
  componentes: [
    { orden: 1, tipo: 'Entrada',   nombre: 'Langostinos al ajillo',    obligatorio: true,  resuelto: true },
    { orden: 2, tipo: 'Principal', nombre: 'Zarzuela de pescado',      obligatorio: true,  resuelto: true,  ref: 'REC-0102' },
    { orden: 3, tipo: 'Postre',    nombre: 'Frutas asadas con canela', obligatorio: false, resuelto: false },
  ],
};

function MenuStepHeader({ paso, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <button onClick={onBack} aria-label="Volver" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4, fontFamily: 'inherit',
      }}>
        <Icon name="chevron-left" size={20}/>
      </button>
      <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-strong)' }}>Importar menú</h2>
      <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>Paso {paso} de 2</span>
    </div>
  );
}

// ─── Paso 1 ──────────────────────────────────────────────────────────────────

function MenuPaso1({ txt, setTxt, onParsear, parsing, parseError }) {
  const [copiado, setCopiado] = React.useState(false);
  const [archivo, setArchivo] = React.useState(null);
  function copiarPrompt() {
    navigator.clipboard?.writeText('Convertí este menú al formato #MENU / #COMPONENTES…').catch(() => {});
    setCopiado(true); setTimeout(() => setCopiado(false), 2200);
  }
  const box = { background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 };
  return (
    <>
      <div style={box}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>Copiar prompt para tu IA</p>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          Copiá el prompt, pegáselo a tu IA con el menú en texto libre y traé el resultado acá.
        </p>
        <Button variant={copiado ? 'secondary' : 'primary'} size="sm" onClick={copiarPrompt}>
          {copiado ? 'Copiado ✓' : 'Copiar prompt'}
        </Button>
      </div>

      <div style={box}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <label style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer',
            background: 'var(--surface-strong)', color: 'var(--text)', fontSize: 12, fontWeight: 500,
          }}>
            <Icon name="upload" size={14}/> Subir .txt
            <input type="file" accept=".txt,text/plain" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                setArchivo(f.name);
                const r = new FileReader(); r.onload = ev => setTxt(String(ev.target?.result || '')); r.readAsText(f, 'utf-8');
                e.target.value = '';
              }}/>
          </label>
          {archivo && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Cargado: <strong>{archivo}</strong></span>}
        </div>

        <textarea
          value={txt} onChange={e => setTxt(e.target.value)} placeholder={MENU_PLACEHOLDER}
          rows={12} disabled={parsing}
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)', fontSize: 11, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical', lineHeight: 1.5 }}/>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={() => setTxt(MENU_PLACEHOLDER)} disabled={parsing}>Cargar ejemplo</Button>
          {txt && <Button variant="ghost" size="sm" onClick={() => { setTxt(''); setArchivo(null); }} disabled={parsing}>Limpiar</Button>}
          <span style={{ flex: 1 }}/>
          <Button variant="primary" size="sm" onClick={onParsear} disabled={parsing || !txt.trim()}>
            {parsing ? <><Spinner size={13} color="#fff"/> Parseando…</> : 'Parsear'}
          </Button>
        </div>

        {parseError && (
          <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--err-bg)', border: '1px solid var(--err-line)', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--err-text)' }}>Errores de validación</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--err-text)' }}>{parseError}</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Paso 2 — revisar componentes ─────────────────────────────────────────────

function ComponenteRow({ c }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0,
        background: 'var(--primary-soft)', color: 'var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
      }}>{c.orden}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-strong)' }}>{c.nombre}</p>
          {!c.obligatorio && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(opcional)</span>}
        </div>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {c.tipo}{c.ref ? ` · ${c.ref}` : ''}
        </p>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, whiteSpace: 'nowrap',
        background: c.resuelto ? 'var(--ok-bg)' : 'var(--warn-bg)',
        color: c.resuelto ? 'var(--ok-text)' : 'var(--warn-text)',
      }}>{c.resuelto ? '✓ En biblioteca' : '+ Nueva'}</span>
    </div>
  );
}

function MenuPaso2({ menu, onImportar, onVolver, importando }) {
  const nuevas = menu.componentes.filter(c => !c.resuelto).length;
  return (
    <>
      <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 12 }}>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-strong)', fontSize: 15 }}>{menu.nombre}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{menu.escenarioUso} · {menu.estilo}</p>
      </div>

      <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '6px 16px 12px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '12px 0 2px' }}>
          {menu.componentes.length} componentes
        </p>
        {menu.componentes.map(c => <ComponenteRow key={c.orden} c={c}/>)}
        {nuevas > 0 && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted-strong)' }}>
            {nuevas} {nuevas === 1 ? 'receta nueva se creará' : 'recetas nuevas se crearán'} al importar.
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button variant="secondary" onClick={onVolver}>← Volver</Button>
        <span style={{ flex: 1 }}/>
        <Button variant="primary" onClick={onImportar} disabled={importando}>
          {importando ? <><Spinner size={13} color="#fff"/> Importando…</> : 'Importar menú'}
        </Button>
      </div>
    </>
  );
}

// ─── Paso 3 (resultado inline) ────────────────────────────────────────────────

function MenuResultado({ onImportarOtro }) {
  return (
    <>
      <div style={{ background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ok-text)' }}>Menú importado</p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ok-text)' }}>
          <strong>MENU-0017</strong> — "Español de mar" (3 componentes)
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onImportarOtro}>Importar otro</Button>
    </>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

function ImportarMenuScreen({ isJP, onBack }) {
  if (!isJP) {
    return (
      <>
        <MenuStepHeader paso={1} onBack={onBack}/>
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
  const [importando, setImportando] = React.useState(false);

  function handleParsear() {
    setParseError(null);
    if (!txt.trim().startsWith('#MENU')) { setParseError('Falta el header #MENU al inicio.'); return; }
    if (!txt.includes('#COMPONENTES')) { setParseError('Falta la sección #COMPONENTES.'); return; }
    setParsing(true);
    setTimeout(() => { setParsing(false); setPaso(2); }, 700);
  }
  function handleImportar() {
    setImportando(true);
    setTimeout(() => { setImportando(false); setPaso(3); }, 900);
  }
  function reset() { setTxt(''); setParseError(null); setPaso(1); }

  return (
    <div>
      <MenuStepHeader paso={paso === 3 ? 2 : paso} onBack={paso === 1 ? onBack : () => setPaso(paso === 3 ? 2 : 1)}/>
      {paso === 1 && <MenuPaso1 txt={txt} setTxt={setTxt} onParsear={handleParsear} parsing={parsing} parseError={parseError}/>}
      {paso === 2 && <MenuPaso2 menu={MOCK_MENU} onImportar={handleImportar} onVolver={() => setPaso(1)} importando={importando}/>}
      {paso === 3 && <MenuResultado onImportarOtro={reset}/>}
    </div>
  );
}

window.ImportarMenuScreen = ImportarMenuScreen;
