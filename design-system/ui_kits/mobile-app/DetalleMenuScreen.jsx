// DetalleMenuScreen.jsx — Menu detail (multi-recipe bundle)
// Matches src/routes/DetalleMenu.tsx behavior: metadata + components list + JP actions.

function DetalleMenuScreen({ menu, recetasMap, isJP, onBack, onAbrirReceta, onElegirEspecial, onSumarEnProceso }) {
  const [toast, setToast] = React.useState(null);
  const [confirm, setConfirm] = React.useState(null);
  const [loadingAccion, setLoadingAccion] = React.useState(null);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Derivados a partir de las recetas obligatorias (lectura, no se recalculan)
  const componentes = [...menu.componentes].sort((a, b) => a.orden - b.orden);
  const obligatorios = componentes.filter(c => c.obligatorio);
  const tiempoTotalMin = obligatorios.reduce((acc, c) => {
    const r = recetasMap[c.idReceta];
    const min = r?.tiempoMin || parseTiempoToMin(r?.tiempo);
    return acc + (min || 0);
  }, 0);

  function parseTiempoToMin(t) {
    if (!t) return 0;
    let total = 0;
    const h = t.match(/(\d+)\s*h/); if (h) total += parseInt(h[1]) * 60;
    const m = t.match(/(\d+)\s*min/); if (m) total += parseInt(m[1]);
    return total;
  }

  function fmtMin(min) {
    if (!min) return '—';
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return m > 0 ? `${h}h ${m} min` : `${h}h`;
  }

  function handleEspecial() {
    if (menu.especialExistente) {
      setConfirm({
        mensaje: `Ya hay una Especial esta semana: "${menu.especialExistente}". ¿Reemplazarla? Se descartarán también sus extras.`,
        accion: () => doEspecial(),
      });
    } else {
      doEspecial();
    }
  }

  function doEspecial() {
    setConfirm(null);
    setLoadingAccion('especial');
    setTimeout(() => {
      setLoadingAccion(null);
      setToast({ text: `"${menu.nombreMenu}" elegido como Especial.`, ok: true });
      onElegirEspecial?.(menu);
    }, 600);
  }

  function handleEnProceso() {
    setLoadingAccion('enproceso');
    setTimeout(() => {
      setLoadingAccion(null);
      setToast({ text: `"${menu.nombreMenu}" sumado como En proceso.`, ok: true });
      onSumarEnProceso?.(menu);
    }, 600);
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
        <h2 style={{ margin: 0, fontSize: 17, color: 'var(--text-strong)', flex: 1, minWidth: 0 }}>
          {menu.nombreMenu}
        </h2>
      </div>

      {/* Metadata */}
      <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'var(--surface-alt)', color: 'var(--muted-strong)' }}>
            {menu.escenarioUso}
          </span>
          {menu.estado && (
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 9999, background: 'var(--info-bg)', color: 'var(--info-text)' }}>
              {menu.estado}
            </span>
          )}
        </div>

        {menu.estilo       && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 4px' }}>{menu.estilo}</p>}
        {menu.climaDelMenu && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 4px' }}>Clima: {menu.climaDelMenu}</p>}
        {menu.idealPara    && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 4px' }}>Ideal para: {menu.idealPara}</p>}
        {menu.descripcion  && <p style={{ fontSize: 13, color: 'var(--text)', margin: '8px 0 0', lineHeight: 1.5 }}>{menu.descripcion}</p>}

        <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
          {tiempoTotalMin > 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtMin(tiempoTotalMin)} total</span>}
          {menu.dificultad && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{menu.dificultad}</span>}
          {menu.porciones  && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{menu.porciones} porciones</span>}
          {menu.sinLacteos && (
            <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 9999, background: 'var(--ok-bg)', color: 'var(--ok-text)' }}>
              Sin lácteos
            </span>
          )}
        </div>

        {menu.riesgos && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--warn-bg)', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--warn-text)' }}>⚠ {menu.riesgos}</p>
          </div>
        )}
      </div>

      {/* Componentes */}
      <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginBottom: 12 }}>
        <p style={{ fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 12px', fontSize: 14 }}>
          Componentes ({componentes.length})
        </p>
        {componentes.map(c => {
          const r = recetasMap[c.idReceta];
          return (
            <div
              key={c.idReceta}
              onClick={() => onAbrirReceta?.(c.idReceta)}
              style={{
                padding: '10px 12px', borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface-strong)',
                marginBottom: 8, cursor: 'pointer',
                transition: 'border-color 120ms ease',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginRight: 8 }}>{c.tipo}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
                    {r?.nombre ?? c.idReceta}
                  </span>
                </div>
                {!c.obligatorio && (
                  <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 9999, background: 'var(--surface-alt)', color: 'var(--muted)', flexShrink: 0 }}>
                    Opcional
                  </span>
                )}
              </div>
              {r && (
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>
                  {r.proteina} · {r.tiempo} · {r.dificultad}
                </p>
              )}
              {c.notas && (
                <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0', fontStyle: 'italic' }}>
                  {c.notas}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Notas */}
      {(menu.paraJuanPablo || menu.paraFamilia || menu.notas) && (
        <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', marginBottom: 12 }}>
          {menu.paraJuanPablo && (
            <p style={{ fontSize: 13, margin: '0 0 8px' }}>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>Para JP: </span>
              {menu.paraJuanPablo}
            </p>
          )}
          {menu.paraFamilia && (
            <p style={{ fontSize: 13, margin: '0 0 8px' }}>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>Para la familia: </span>
              {menu.paraFamilia}
            </p>
          )}
          {menu.notas && (
            <p style={{ fontSize: 13, margin: 0 }}>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>Notas: </span>
              {menu.notas}
            </p>
          )}
        </div>
      )}

      {/* Acciones JP */}
      {isJP && (
        <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="primary" fullWidth disabled={loadingAccion === 'especial'} onClick={handleEspecial}>
            {loadingAccion === 'especial' ? '…' : 'Elegir como Especial'}
          </Button>
          <Button variant="secondary" fullWidth disabled={loadingAccion === 'enproceso'} onClick={handleEnProceso}>
            {loadingAccion === 'enproceso' ? '…' : 'Sumar como En proceso'}
          </Button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          background: toast.ok ? 'var(--ok-bg)' : 'var(--err-bg)',
          color: toast.ok ? 'var(--ok-text)' : 'var(--err-text)',
          padding: '10px 18px', borderRadius: 10, fontSize: 13,
          zIndex: 9999, maxWidth: '85%', textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,.18)',
        }}>
          {toast.text}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9998, padding: 16,
        }}>
          <div style={{
            maxWidth: 320, width: '100%',
            background: 'var(--surface-strong)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '18px 20px',
          }}>
            <p style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 16px', lineHeight: 1.5 }}>
              {confirm.mensaje}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setConfirm(null)}>Cancelar</Button>
              <Button variant="primary" onClick={confirm.accion}>Reemplazar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

window.DetalleMenuScreen = DetalleMenuScreen;
