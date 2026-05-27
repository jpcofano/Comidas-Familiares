// SeleccionarComponenteMenuScreen.jsx
// Mid-cook view for a menu-typed plan: pick which component to cook next.
// Matches src/routes/SeleccionarComponenteMenu.tsx.

function SeleccionarComponenteMenuScreen({ plan, menu, recetasMap, onBack, onCocinarReceta, onDesmarcar, onFinalizarMenu }) {
  const cocinados = new Set(plan.componentesCocinados || []);
  const componentes = [...menu.componentes].sort((a, b) => a.orden - b.orden);
  const obligatorios = componentes.filter(c => c.obligatorio);
  const opcionales   = componentes.filter(c => !c.obligatorio);
  const obligCocinados = obligatorios.filter(c => cocinados.has(c.idReceta)).length;
  const menuCompleto = obligatorios.length > 0 && obligCocinados === obligatorios.length;
  const [finalizando, setFinalizando] = React.useState(false);

  function ComponenteRow({ c, opcional }) {
    const r = recetasMap[c.idReceta];
    const nombre = r?.nombre ?? c.idReceta;
    const hecho = cocinados.has(c.idReceta);
    return (
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 10, padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)',
        opacity: opcional ? 0.85 : 1,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0, fontSize: 13,
            color: 'var(--text-strong)',
            fontWeight: hecho ? 400 : 500,
            textDecoration: hecho ? 'line-through' : 'none',
          }}>
            {hecho ? '✓ ' : ''}{nombre}
          </p>
          {opcional && <span style={{ fontSize: 11, color: 'var(--muted)' }}>Opcional</span>}
        </div>
        {hecho ? (
          <Button variant="ghost" size="sm" onClick={() => onDesmarcar?.(c.idReceta)} style={{ color: 'var(--muted)' }}>
            Desmarcar
          </Button>
        ) : (
          <Button variant={opcional ? 'secondary' : 'primary'} size="sm" onClick={() => onCocinarReceta?.(c.idReceta)}>
            Cocinar →
          </Button>
        )}
      </div>
    );
  }

  function doFinalizar() {
    setFinalizando(true);
    setTimeout(() => { setFinalizando(false); onFinalizarMenu?.(plan); }, 400);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <button onClick={onBack} style={{
          background: 'transparent', border: 0, padding: 4,
          display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--muted)',
        }} aria-label="Volver">
          <Icon name="chevron-left" size={20}/>
        </button>
        <span style={{ fontSize: 13, color: 'var(--muted)', flex: 1, minWidth: 0 }}>
          {menu.nombreMenu}
        </span>
      </div>

      {/* Resumen */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginBottom: 12 }}>
        <p style={{ fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 4px', fontSize: 15 }}>
          {menu.nombreMenu}
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
          {obligCocinados}/{obligatorios.length} obligatorios cocinados
        </p>

        {menuCompleto && (
          <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--ok-bg)', borderRadius: 10 }}>
            <p style={{ margin: '0 0 8px', color: 'var(--ok-text)', fontWeight: 600, fontSize: 13 }}>
              ✓ Todos los obligatorios cocinados
            </p>
            <Button variant="primary" fullWidth onClick={doFinalizar} disabled={finalizando}>
              {finalizando ? '…' : 'Finalizar menú'}
            </Button>
          </div>
        )}
      </div>

      {/* Obligatorios */}
      {obligatorios.length > 0 && (
        <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginBottom: 12 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em',
            color: 'var(--muted)', margin: '0 0 4px',
          }}>
            Obligatorios
          </p>
          {obligatorios.map(c => <ComponenteRow key={c.idReceta} c={c} opcional={false}/>)}
        </div>
      )}

      {/* Opcionales */}
      {opcionales.length > 0 && (
        <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px' }}>
          <p style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em',
            color: 'var(--muted)', margin: '0 0 4px',
          }}>
            Opcionales
          </p>
          {opcionales.map(c => <ComponenteRow key={c.idReceta} c={c} opcional={true}/>)}
        </div>
      )}
    </div>
  );
}

window.SeleccionarComponenteMenuScreen = SeleccionarComponenteMenuScreen;
