// DetalleMenuScreen.jsx — menu detail, ported from the live app's DetalleMenu.tsx.
// Metadata card · derived chips · componentes (recipes with role letter-chips) ·
// notes · JP actions (Elegir como Especial / Sumar como En proceso).

function MenuBackBar({ onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
      <button onClick={onBack} aria-label="Volver" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 0, color: 'var(--muted)',
        cursor: 'pointer', padding: 4, fontFamily: 'inherit',
      }}>
        <Icon name="chevron-left" size={20}/>
      </button>
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Menú</span>
    </div>
  );
}

function MenuDetCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface-strong)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 18px', marginBottom: 12, ...style,
    }}>{children}</div>
  );
}

function MenuChip({ children, bg = 'var(--surface-alt)', color = 'var(--muted-strong)' }) {
  return (
    <span style={{
      fontSize: 12, padding: '2px 9px', borderRadius: 9999,
      background: bg, color, whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

// Letter chip for a component role — reuses the shared seccionMeta() map.
function RoleChip({ tipo }) {
  const meta = (window.seccionMeta ? window.seccionMeta(tipo) : { letra: (tipo || '·').charAt(0), color: 'var(--muted-strong)' });
  return (
    <span style={{
      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
      background: meta.color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1,
    }}>{meta.letra}</span>
  );
}

function MenuComponenteRow({ comp, receta, onAbrir }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={() => receta && onAbrir(receta)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', textAlign: 'left', cursor: receta ? 'pointer' : 'default',
        background: hover ? 'var(--surface-alt)' : 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 10,
        padding: '10px 12px', marginBottom: 8, fontFamily: 'inherit',
        transition: 'background 120ms ease', display: 'block',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <RoleChip tipo={comp.tipo}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{comp.tipo}</span>
            {!comp.obligatorio && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 9999,
                background: 'var(--surface-alt)', color: 'var(--muted)',
              }}>Opcional</span>
            )}
          </div>
          <p style={{ margin: '1px 0 0', fontSize: 14, fontWeight: 500, color: 'var(--text-strong)' }}>
            {receta ? receta.nombre : comp.recetaId}
          </p>
          {receta && (
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              {receta.proteina} · {receta.tiempo} · {receta.dificultad}
            </p>
          )}
        </div>
        {receta && (
          <span style={{ color: 'var(--muted)', flexShrink: 0, opacity: hover ? 1 : 0.5, transition: 'opacity 120ms ease' }}>
            <Icon name="chevron-right" size={16}/>
          </span>
        )}
      </div>
      {comp.notas && (
        <p style={{ margin: '6px 0 0 32px', fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.4 }}>
          {comp.notas}
        </p>
      )}
    </button>
  );
}

function NotaLinea({ etiqueta, children }) {
  return (
    <p style={{ fontSize: 13, margin: '0 0 8px', color: 'var(--text)', lineHeight: 1.5 }}>
      <span style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: 6 }}>{etiqueta}</span>
      {children}
    </p>
  );
}

function DetalleMenuScreen({ menu, recetas, isJP, macrosLayout = 'estrella', onBack, onAbrirReceta }) {
  const [loadingAccion, setLoadingAccion] = React.useState(null);
  const mapReceta = React.useMemo(() => {
    const m = {};
    (recetas || []).forEach(r => { m[r.id] = r; });
    return m;
  }, [recetas]);

  const comps = [...(menu.componentes || [])].sort((a, b) => a.orden - b.orden);
  const d = menu.derived || {};

  function handleAccion(key) {
    setLoadingAccion(key);
    setTimeout(() => {
      setLoadingAccion(null);
      if (key === 'especial') window.__toast?.(`"${menu.nombre}" elegido como Especial.`, true);
      else window.__toast?.(`"${menu.nombre}" sumado como En proceso.`, true);
    }, 700);
  }

  const hayNotas = menu.paraJuanPablo || menu.paraFamilia || menu.notasOcasion || menu.notas;

  return (
    <>
      <MenuBackBar onBack={onBack}/>

      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.01em', margin: '0 0 12px', lineHeight: 1.15 }}>
        {menu.nombre}
      </h1>

      {/* Metadata */}
      <MenuDetCard>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <MenuChip>{menu.escenarioUso}</MenuChip>
          {menu.estado && <MenuChip bg="var(--info-bg)" color="var(--info-text)">{menu.estado}</MenuChip>}
        </div>

        {menu.descripcion && (
          <p style={{ fontSize: 14, color: 'var(--text)', margin: '0 0 12px', lineHeight: 1.55, textWrap: 'pretty' }}>
            {menu.descripcion}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menu.estilo && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>{menu.estilo}</p>}
          {menu.climaDelMenu && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Clima: {menu.climaDelMenu}</p>}
          {menu.idealPara && <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Ideal para: {menu.idealPara}</p>}
        </div>

        {/* Derived */}
        <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {d.tiempo && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.tiempo} total</span>}
          {d.dificultad && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.dificultad}</span>}
          {d.costo && <span style={{ fontSize: 12, color: 'var(--muted)' }}>Costo {d.costo}</span>}
          {d.porciones && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{d.porciones} porciones</span>}
        </div>
        {(d.sinLacteos || d.hidratos) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {d.sinLacteos && <MenuChip bg="var(--ok-bg)" color="var(--ok-text)">Sin lácteos</MenuChip>}
            {d.hidratos && <MenuChip>Con hidratos</MenuChip>}
          </div>
        )}

        {menu.riesgos && (
          <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--warn-text)', lineHeight: 1.45 }}>⚠ {menu.riesgos}</p>
          </div>
        )}
      </MenuDetCard>

      {/* Componentes */}
      <MenuDetCard>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 12px' }}>
          Componentes ({comps.length})
        </h2>
        {comps.map((comp, i) => (
          <MenuComponenteRow key={i} comp={comp} receta={mapReceta[comp.recetaId]} onAbrir={onAbrirReceta}/>
        ))}
      </MenuDetCard>

      {/* Macros del menú completo (E11.3) */}
      <MacrosMenuCard macros={macrosDeMenu(menu, mapReceta)} layout={macrosLayout}/>

      {/* Notas */}
      {hayNotas && (
        <MenuDetCard>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 12px' }}>Notas</h2>
          {menu.paraJuanPablo && <NotaLinea etiqueta="Para JP">{menu.paraJuanPablo}</NotaLinea>}
          {menu.paraFamilia && <NotaLinea etiqueta="Para la familia">{menu.paraFamilia}</NotaLinea>}
          {menu.notasOcasion && <NotaLinea etiqueta="Ocasión">{menu.notasOcasion}</NotaLinea>}
          {menu.notas && <NotaLinea etiqueta="Notas">{menu.notas}</NotaLinea>}
        </MenuDetCard>
      )}

      {/* Acciones JP */}
      {isJP && (
        <MenuDetCard style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="primary" onClick={() => handleAccion('especial')} disabled={loadingAccion != null}>
            {loadingAccion === 'especial' ? '…' : 'Elegir como Especial'}
          </Button>
          <Button variant="secondary" onClick={() => handleAccion('enproceso')} disabled={loadingAccion != null}>
            {loadingAccion === 'enproceso' ? '…' : 'Sumar como En proceso'}
          </Button>
        </MenuDetCard>
      )}
    </>
  );
}

window.DetalleMenuScreen = DetalleMenuScreen;
