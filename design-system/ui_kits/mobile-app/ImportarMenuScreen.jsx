// ImportarMenuScreen.jsx — JP-only: paste TXT block to import a new menu

const MENU_PLACEHOLDER =
`#MENU
nombre: Español de mar
escenarioUso: Noche de a dos
estilo: Español / mediterráneo
estado: Para probar
aptoNocheDeADos: Sí
hidratoOpcional: Arroz blanco o pan aparte
paraJuanPablo: Zarzuela sola, sin arroz ni pan
paraFamilia: Arroz blanco o pan para acompañar
notas: Muy especial

#COMPONENTES
orden | tipo      | idReceta_o_nombre         | obligatorio | notas
1     | Entrada   | Langostinos al ajillo     | Sí          | Sin manteca
2     | Principal | REC-0102                  | Sí          |
3     | Postre    | Frutas asadas con canela  | No          |`;

function ImportPhaseBanner({ phase, payload }) {
  if (!phase || phase === 'idle' || phase === 'loading') return null;

  const styles = {
    success:   { bg: 'var(--ok-bg)',   line: 'var(--ok-line)',   color: 'var(--ok-text)',   title: 'Menú importado' },
    duplicate: { bg: 'var(--warn-bg)', line: 'var(--warn-line)', color: 'var(--warn-text)', title: 'Menú duplicado' },
    error:     { bg: 'var(--err-bg)',  line: 'var(--err-line)',  color: 'var(--err-text)',  title: 'Errores de validación' },
  };
  const s = styles[phase];
  return (
    <div style={{
      marginTop: 12, padding: '12px 14px',
      background: s.bg, border: `1px solid ${s.line}`,
      borderRadius: 10,
    }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: s.color }}>{s.title}</p>
      {phase === 'success' && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: s.color }}>
          <strong>{payload.idMenu}</strong> — “{payload.nombre}” ({payload.componentes} componentes)
        </p>
      )}
      {phase === 'duplicate' && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: s.color }}>
          Ya existe un menú con este nombre ({payload.idMenu}). No se creó uno nuevo.
        </p>
      )}
      {phase === 'error' && payload.errors && (
        <ul style={{ margin: '6px 0 0 18px', padding: 0, fontSize: 12, color: s.color }}>
          {payload.errors.map((e, i) => (
            <li key={i} style={{ marginBottom: 2 }}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ImportarMenuScreen({ isJP, onBack }) {
  if (!isJP) {
    return (
      <>
        <VotoHeader title="Importar menú" onBack={onBack}/>
        <div style={{
          padding: '36px 20px', textAlign: 'center',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14,
        }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Esta sección es solo para Juan Pablo.
          </p>
        </div>
      </>
    );
  }

  const [txt, setTxt] = React.useState('');
  const [phase, setPhase] = React.useState('idle');
  const [payload, setPayload] = React.useState(null);

  function handleImport() {
    // Mock: detect a few patterns to demo all three banners
    if (!txt.trim().startsWith('#MENU')) {
      setPhase('error');
      setPayload({ errors: ['Falta el header #MENU al inicio.'] });
      return;
    }
    if (!txt.includes('#COMPONENTES')) {
      setPhase('error');
      setPayload({ errors: ['Falta la sección #COMPONENTES.'] });
      return;
    }
    setPhase('loading');
    setTimeout(() => {
      // Naive parse for demo
      const m = txt.match(/nombre:\s*(.+)/);
      const nombre = m ? m[1].trim() : 'Menú sin nombre';
      const comps = (txt.split('#COMPONENTES')[1] || '')
        .split('\n').filter(l => /^\s*\d+\s*\|/.test(l)).length;
      if (nombre.toLowerCase().includes('duplicado')) {
        setPhase('duplicate');
        setPayload({ idMenu: 'MENU-0017', nombre });
      } else {
        setPhase('success');
        setPayload({ idMenu: 'MENU-' + String(Math.floor(Math.random() * 9000 + 1000)), nombre, componentes: comps });
        setTxt('');
      }
    }, 600);
  }

  function handleSubir() {
    setTxt(MENU_PLACEHOLDER);
    setPhase('idle');
  }

  const isLoading = phase === 'loading';

  return (
    <>
      <VotoHeader title="Importar menú" onBack={onBack}/>

      <div style={{
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 12,
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
          Formato esperado
        </p>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
          Pegá el TXT con bloque{' '}
          <code style={{ fontSize: 11, background: 'var(--surface-alt)', padding: '1px 5px', borderRadius: 4 }}>#MENU</code>
          {' '}seguido de{' '}
          <code style={{ fontSize: 11, background: 'var(--surface-alt)', padding: '1px 5px', borderRadius: 4 }}>#COMPONENTES</code>,
          {' '}o cargá un archivo de ejemplo.
        </p>
      </div>

      <div style={{
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '12px 14px',
      }}>
        <textarea
          value={txt}
          onChange={e => { setTxt(e.target.value); if (phase !== 'idle' && phase !== 'loading') setPhase('idle'); }}
          placeholder={MENU_PLACEHOLDER}
          disabled={isLoading}
          rows={14}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: 'var(--font-mono)', fontSize: 11,
            padding: 10, borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            resize: 'vertical', lineHeight: 1.5,
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={handleSubir} disabled={isLoading}>
            Cargar ejemplo
          </Button>
          {txt && (
            <Button variant="ghost" size="sm" onClick={() => { setTxt(''); setPhase('idle'); }} disabled={isLoading}>
              Limpiar
            </Button>
          )}
          <span style={{ flex: 1 }}/>
          <Button
            variant="primary" size="sm"
            onClick={handleImport}
            disabled={isLoading || !txt.trim()}
          >
            {isLoading ? 'Importando…' : 'Importar'}
          </Button>
        </div>

        <ImportPhaseBanner phase={phase} payload={payload}/>
      </div>
    </>
  );
}

window.ImportarMenuScreen = ImportarMenuScreen;
