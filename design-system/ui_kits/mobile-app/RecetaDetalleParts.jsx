// RecetaDetalleParts.jsx — rich building blocks for the recipe-detail screen.
// Ported from the live app (MetaCards, RecetaPill, IngredientesPorGondola,
// PasosPreview, CocinarSticky, AccionesPlan) and re-expressed fully on design
// tokens. Shared via window.* for the other Babel scripts.

// ─── Section meta — letter + colour for each ingredient role ─────────────────
// La receta agrupa por ROL del ingrediente (Principal, Base, Salsa…), no por
// góndola. Cada sección lleva una letra y un color propio para el chip.

const SECCION_META = {
  // Roles dentro de la receta
  'Principal':                   { letra: 'P', color: 'oklch(0.55 0.10 25)'  },
  'Ligado':                      { letra: 'L', color: 'oklch(0.62 0.08 60)'  },
  'Ligante':                     { letra: 'L', color: 'oklch(0.62 0.08 60)'  },
  'Base':                        { letra: 'B', color: 'oklch(0.58 0.07 130)' },
  'Base de sabor':               { letra: 'B', color: 'oklch(0.58 0.07 130)' },
  'Salsa':                       { letra: 'S', color: 'oklch(0.52 0.09 350)' },
  'Líquido de cocción':          { letra: 'L', color: 'oklch(0.56 0.06 250)' },
  'Condimentos':                 { letra: 'C', color: 'oklch(0.55 0.08 300)' },
  'Cocción':                     { letra: 'C', color: 'oklch(0.62 0.08 50)'  },
  'Guarnición baja en hidratos': { letra: 'G', color: 'oklch(0.58 0.07 160)' },
  'Guarnición':                  { letra: 'G', color: 'oklch(0.58 0.07 160)' },
  'Opcional familia':            { letra: 'O', color: 'oklch(0.60 0.03 90)'  },
  'Entrada':                     { letra: 'E', color: 'oklch(0.60 0.08 200)' },
  'Postre':                      { letra: 'D', color: 'oklch(0.62 0.09 350)' },
  'Bebida':                      { letra: 'B', color: 'oklch(0.56 0.06 250)' },
  // Góndolas (compatibilidad con datos viejos)
  'Carnicería':  { letra: 'C', color: 'oklch(0.55 0.10 25)'  },
  'Pescadería':  { letra: 'P', color: 'oklch(0.56 0.06 250)' },
  'Verdulería':  { letra: 'V', color: 'oklch(0.58 0.07 130)' },
  'Almacén':     { letra: 'A', color: 'oklch(0.62 0.08 60)'  },
  'Fiambrería':  { letra: 'F', color: 'oklch(0.52 0.09 350)' },
  'Lácteos':     { letra: 'L', color: 'oklch(0.62 0.08 50)'  },
  'Panadería':   { letra: 'P', color: 'oklch(0.65 0.07 50)'  },
};
function seccionMeta(seccion) {
  return SECCION_META[seccion] || {
    letra: (seccion || '·').trim().charAt(0).toUpperCase() || '·',
    color: 'var(--muted-strong)',
  };
}

// ─── MetaCards — Total / Porciones / Dificultad ──────────────────────────────

function MetaCard({ label, value, sub }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--surface-alt)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
    }}>
      <p style={{
        fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.08em', color: 'var(--muted)', margin: '0 0 4px',
      }}>{label}</p>
      <p style={{
        fontSize: 16, fontWeight: 700, color: 'var(--text-strong)',
        fontVariantNumeric: 'tabular-nums', margin: 0, lineHeight: 1.15,
        wordBreak: 'break-word',
      }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>{sub}</p>}
    </div>
  );
}

function MetaCards({ tiempoTotalLabel, tiempoActivoLabel, porcionesLabel, dificultad }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-4)' }}>
      <MetaCard label="Total" value={tiempoTotalLabel || '—'}
        sub={tiempoActivoLabel ? `${tiempoActivoLabel} activo` : undefined}/>
      <MetaCard label="Porciones" value={porcionesLabel || '—'}/>
      <MetaCard label="Dificultad" value={dificultad || '—'}/>
    </div>
  );
}

// ─── RecetaPill — compact tag w/ variants ────────────────────────────────────

function RecetaPill({ label, variant = 'neutral', icon }) {
  const V = {
    neutral: { bg: 'var(--surface-alt)',  color: 'var(--muted-strong)' },
    ok:      { bg: 'var(--ok-bg)',         color: 'var(--ok-text)' },
    info:    { bg: 'var(--info-bg)',       color: 'var(--info-text)' },
    accent:  { bg: 'var(--primary-soft)',  color: 'var(--primary)' },
  };
  const s = V[variant] || V.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 9999, fontSize: 12, fontWeight: 600,
      background: s.bg, color: s.color, whiteSpace: 'nowrap',
    }}>
      {icon && <Icon name={icon} size={12} strokeWidth={2}/>}
      {label}
    </span>
  );
}

// ─── Sustituciones (E9.2) ────────────────────────────────────────────────────
// Dos fuentes: `equivalencias` del catálogo (sustituto general, reutilizable) y
// `alternativas` de la receta (el "X o Y" propio de esta receta). En el código
// real el match es por idIngrediente; acá, sin IDs, se matchea por nombre.

function normNombre(s) {
  return (s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function sustitutosDeIngrediente(item, catPorNombre, catPorId) {
  const out = [];
  const visto = new Set();
  const push = (nombre, fuente) => {
    const k = normNombre(nombre);
    if (!nombre || visto.has(k)) return;
    visto.add(k); out.push({ nombre, fuente });
  };
  // 1) alternativas de la receta (nombres sueltos, "X o Y" de esta receta)
  (item.alternativas || []).forEach(n => push(n, 'receta'));
  // 2) equivalencias del catálogo (por nombre del ingrediente)
  const cat = catPorNombre[normNombre(item.texto)];
  if (cat && cat.equivalencias) {
    cat.equivalencias.forEach(id => {
      const eq = catPorId[id];
      if (eq) push(eq.nombre, 'catalogo');
    });
  }
  return out;
}

function SustitutoLinea({ subs, estilo }) {
  if (!subs.length) return null;
  if (estilo === 'chip') {
    return (
      <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
        {subs.map((s, i) => (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
            borderRadius: 9999, fontSize: 11, fontWeight: 600,
            background: 'var(--accent-soft)', color: 'var(--accent)',
          }}>
            <Icon name="swap" size={10}/> {s.nombre}
          </span>
        ))}
      </span>
    );
  }
  // inline (default): "o {X} o {Y}"
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 3, fontSize: 12, color: 'var(--accent)' }}>
      <Icon name="swap" size={11}/>
      <span style={{ lineHeight: 1.35 }}>
        o {subs.map(s => s.nombre).join(' o ')}
      </span>
    </span>
  );
}

// ─── IngredientesPorGondola ──────────────────────────────────────────────────

function IngredientesPorGondola({ ingredientes, catalogo = [], mostrarSubs = true, subsEstilo = 'inline' }) {
  // Mapas de catálogo para resolver sustitutos por nombre / id
  const catPorNombre = {}; const catPorId = {};
  catalogo.forEach(c => { catPorNombre[normNombre(c.nombre)] = c; catPorId[c.id] = c; });

  // Group preserving first-seen order of sections
  const order = [];
  const groups = {};
  ingredientes.forEach(ing => {
    const sec = ing.seccion || '';
    if (!groups[sec]) { groups[sec] = []; order.push(sec); }
    groups[sec].push(ing);
  });

  return (
    <div>
      {order.map((sec, gi) => (
        <div key={sec || gi} style={{ marginTop: gi === 0 ? 0 : 'var(--space-4)' }}>
          {sec && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-2)' }}>
              <span style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: seccionMeta(sec).color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1,
              }}>{seccionMeta(sec).letra}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
                textTransform: 'uppercase', color: 'var(--muted)',
              }}>{sec}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.6 }}>
                {groups[sec].length}
              </span>
            </div>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {groups[sec].map((ing, idx) => {
              const subs = mostrarSubs ? sustitutosDeIngrediente(ing, catPorNombre, catPorId) : [];
              return (
                <li key={idx} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 0',
                  borderTop: idx === 0 ? 'none' : '1px solid var(--border-subtle)',
                  fontSize: 13, color: ing.opcional ? 'var(--muted)' : 'var(--text)',
                }}>
                  <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span>
                      {ing.texto}
                      {ing.opcional && (
                        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>(opcional)</span>
                      )}
                    </span>
                    {subs.length > 0 && <SustitutoLinea subs={subs} estilo={subsEstilo}/>}
                  </span>
                  <span style={{
                    color: 'var(--muted-strong)', flexShrink: 0,
                    marginLeft: 'var(--space-3)', fontVariantNumeric: 'tabular-nums',
                  }}>{[ing.cantidad, ing.unidad].filter(Boolean).join(' ')}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ─── PasosPreview — first 3 + expand, riesgos banner, punto clave / error ────

function PasoNum({ n }) {
  return (
    <span style={{
      flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
      background: 'var(--primary-soft)', color: 'var(--primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600,
    }}>{n}</span>
  );
}

function MiniNote({ tone, icon, children }) {
  const T = {
    ok:   { bg: 'var(--ok-bg)',   color: 'var(--ok-text)' },
    warn: { bg: 'var(--warn-bg)', color: 'var(--warn-text)' },
  }[tone];
  return (
    <div style={{
      display: 'flex', gap: 6, alignItems: 'flex-start',
      background: T.bg, color: T.color, borderRadius: 8,
      padding: '6px 9px', marginTop: 6, fontSize: 12, lineHeight: 1.4,
    }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function PasosPreview({ pasos, riesgos }) {
  const [expandido, setExpandido] = React.useState(false);
  const sorted = pasos.map((p, i) => ({ ...p, n: i + 1 }));
  const visibles = expandido ? sorted : sorted.slice(0, 3);
  const restantes = sorted.length - 3;

  return (
    <div>
      {riesgos && (
        <div style={{
          padding: '10px 12px', background: 'var(--warn-bg)',
          border: '1px solid var(--warn-line)', borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-3)', display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--warn-text)', lineHeight: 1.4 }}>{riesgos}</p>
        </div>
      )}

      <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {visibles.map(paso => (
          <li key={paso.n} style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <PasoNum n={paso.n}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                  {paso.titulo && (
                    <p style={{ margin: 0, flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.3 }}>
                      {paso.titulo}
                    </p>
                  )}
                  {paso.tiempo && (
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                      {paso.tiempo}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55, margin: 0 }}>{paso.desc}</p>
                {paso.puntoClave && <MiniNote tone="ok"   icon="✓">{paso.puntoClave}</MiniNote>}
                {paso.errorComun && <MiniNote tone="warn" icon="⚠">{paso.errorComun}</MiniNote>}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {!expandido && restantes > 0 && (
        <button onClick={() => setExpandido(true)} style={{
          width: '100%', background: 'transparent', border: 0, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 13, color: 'var(--primary)',
          fontWeight: 500, padding: '8px 0', marginTop: 'var(--space-1)',
        }}>
          Ver los {restantes} {restantes === 1 ? 'paso restante' : 'pasos restantes'} ↓
        </button>
      )}
    </div>
  );
}

// ─── AccionesPlan (JP) — add recipe to the week's plan ───────────────────────

function AccionBtn({ label, loading, disabled, onClick }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', padding: '12px 14px', marginBottom: 'var(--space-2)',
        borderRadius: 'var(--radius-md)',
        background: hover && !disabled ? 'rgba(138,74,47,.16)' : 'var(--primary-soft)',
        border: '1px solid transparent', cursor: disabled ? 'default' : 'pointer',
        opacity: loading ? 0.6 : 1, textAlign: 'left', fontFamily: 'inherit',
        fontSize: 13, fontWeight: 600, color: 'var(--primary)',
        transition: 'background 120ms ease',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
      {loading && <Spinner size={13} color="var(--primary)"/>}
      <span>{loading ? 'Agregando…' : label}</span>
    </button>
  );
}

function AccionesPlan({ acciones, loadingAccion, onAccion }) {
  const disponibles = acciones.filter(a => a.puede);
  if (disponibles.length === 0) return null;
  return (
    <section style={{ marginBottom: 'var(--space-3)' }}>
      <p style={{
        fontSize: 12, fontWeight: 600, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 'var(--space-2)',
      }}>Agregar al plan de la semana</p>
      {disponibles.map(a => (
        <AccionBtn key={a.key} label={a.label}
          loading={loadingAccion === a.key}
          disabled={loadingAccion !== null}
          onClick={() => onAccion(a.key)}/>
      ))}
    </section>
  );
}

// ─── CocinarSticky — bottom CTA ──────────────────────────────────────────────

function CocinarSticky({ onClick, label = 'Empezar a cocinar' }) {
  const [pressed, setPressed] = React.useState(false);
  return (
    <div style={{
      position: 'sticky', bottom: 0, marginTop: 'var(--space-6)',
      padding: '12px 0 4px',
      background: 'linear-gradient(180deg, rgba(253,250,246,0) 0%, var(--bg) 38%)',
      zIndex: 10,
    }}>
      <button
        onClick={onClick}
        onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={{
          width: '100%', border: 0, cursor: 'pointer', fontFamily: 'inherit',
          background: 'var(--primary)', color: 'var(--on-primary)',
          boxShadow: '0 6px 18px rgba(138,74,47,.28)',
          fontSize: 14, fontWeight: 600, padding: '15px 16px',
          borderRadius: 'var(--radius-lg)',
          transform: pressed ? 'scale(0.98)' : 'scale(1)',
          transition: 'transform 120ms ease',
        }}>{label}</button>
    </div>
  );
}

// ─── Spinner — shared inline loading glyph ───────────────────────────────────

function Spinner({ size = 16, color = 'var(--primary)' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `2px solid ${color}`, borderTopColor: 'transparent',
      borderRadius: '50%', animation: 'cf-spin 0.7s linear infinite',
      verticalAlign: 'middle',
    }}/>
  );
}

// keyframes (inject once)
if (!document.getElementById('cf-spin-kf')) {
  const st = document.createElement('style');
  st.id = 'cf-spin-kf';
  st.textContent = '@keyframes cf-spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(st);
}

// ─── SustitutosRecap (E9.2) — para el paso a paso ────────────────────────────
// Junta todos los ingredientes de la receta que tienen sustituto y los lista en
// una tira compacta, para tenerlos a mano mientras se cocina.

function recopilarSustitutos(receta, catalogo = []) {
  const catPorNombre = {}; const catPorId = {};
  catalogo.forEach(c => { catPorNombre[normNombre(c.nombre)] = c; catPorId[c.id] = c; });
  const items = receta.ingredientesDet || [];
  return items
    .map(it => ({ texto: it.texto, subs: sustitutosDeIngrediente(it, catPorNombre, catPorId) }))
    .filter(x => x.subs.length > 0);
}

function SustitutosRecap({ receta, catalogo }) {
  const [abierto, setAbierto] = React.useState(false);
  const lista = recopilarSustitutos(receta, catalogo);
  if (!lista.length) return null;
  return (
    <div style={{
      marginBottom: 12, background: 'var(--accent-soft)', borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      <button type="button" onClick={() => setAbierto(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
        <Icon name="swap" size={15} color="var(--accent)"/>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
          Sustitutos a mano ({lista.length})
        </span>
        <span style={{ color: 'var(--accent)', transform: abierto ? 'rotate(180deg)' : 'none', transition: 'transform 180ms ease', display: 'inline-flex' }}>
          <Icon name="chevron-down" size={16}/>
        </span>
      </button>
      {abierto && (
        <ul style={{ listStyle: 'none', margin: 0, padding: '0 14px 12px' }}>
          {lista.map((x, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--text)', padding: '4px 0', lineHeight: 1.4 }}>
              <strong style={{ fontWeight: 600 }}>{x.texto}</strong>
              <span style={{ color: 'var(--muted)' }}> — o {x.subs.map(s => s.nombre).join(' o ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Macros por porción (E11.3) ──────────────────────────────────────────────
// Espejo de `macrosDeReceta()` del código: hidratos netos = número estrella,
// el resto en secundario, y SIEMPRE la cobertura ("estimado sobre N de M").
// Cobertura 0 → estado vacío discreto (sin números engañosos).
//
// Shape esperado en receta.macros:
//   { porPorcion:{kcal,carbohidratos,proteinas,grasas,fibra},
//     hidratosNetos, porciones, conDatos, total }

function fmtG(n)  { return `${(Math.round(n * 10) / 10).toLocaleString('es-AR')} g`; }
function fmtKcal(n){ return `${Math.round(n)}`; }

function MacroStat({ label, value, sub }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-strong)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{value}</p>
      <p style={{ margin: '1px 0 0', fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}{sub ? ` ${sub}` : ''}</p>
    </div>
  );
}

function CoberturaPie({ conDatos, total }) {
  const parcial = conDatos < total;
  return (
    <p style={{
      margin: '12px 0 0', fontSize: 11, lineHeight: 1.4,
      color: parcial ? 'var(--warn-text)' : 'var(--muted)',
      display: 'flex', alignItems: 'flex-start', gap: 5,
    }}>
      <Icon name={parcial ? 'alert-triangle' : 'info'} size={12} style={{ flexShrink: 0 }}/>
      <span>{parcial ? 'Parcial · estimado' : 'Estimado'} sobre {conDatos} de {total} ingredientes.</span>
    </p>
  );
}

function MacrosCard({ macros, layout = 'estrella' }) {
  const sinDatos = !macros || !macros.total || !macros.conDatos;

  // Estado vacío (cobertura 0) — discreto, sin números.
  if (sinDatos) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px dashed var(--border)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'var(--surface-alt)', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><Icon name="info" size={16}/></span>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>
          Sin datos de macros para esta receta todavía.
        </p>
      </div>
    );
  }

  const m = macros.porPorcion;
  const netos = fmtG(macros.hidratosNetos);

  // ── Layout TABLA: fila pareja, hidratos netos resaltado ──────────────────
  if (layout === 'tabla') {
    return (
      <div style={{
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px 16px', marginBottom: 12,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Macros estimadas por porción
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 8px' }}>
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'baseline', gap: 8,
            background: 'var(--primary-soft)', borderRadius: 10, padding: '8px 12px' }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{netos}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Hidratos netos</span>
          </div>
          <MacroStat label="kcal"      value={fmtKcal(m.kcal)}/>
          <MacroStat label="Proteínas" value={fmtG(m.proteinas)}/>
          <MacroStat label="Grasas"    value={fmtG(m.grasas)}/>
          <MacroStat label="Fibra"     value={fmtG(m.fibra)}/>
          <MacroStat label="Hidratos"  value={fmtG(m.carbohidratos)} sub="tot."/>
        </div>
        <CoberturaPie conDatos={macros.conDatos} total={macros.total}/>
      </div>
    );
  }

  // ── Layout ESTRELLA (default): hero hidratos netos + secundarios ─────────
  return (
    <div style={{
      background: 'var(--surface-strong)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 18px 16px', marginBottom: 12,
    }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        Macros estimadas por porción
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 34, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.02em' }}>{netos}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Hidratos netos</span>
      </div>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--muted)' }}>
        carbohidratos − fibra · lo que cuenta para keto
      </p>

      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }}/>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 8px' }}>
        <MacroStat label="kcal"      value={fmtKcal(m.kcal)}/>
        <MacroStat label="Proteínas" value={fmtG(m.proteinas)}/>
        <MacroStat label="Grasas"    value={fmtG(m.grasas)}/>
        <MacroStat label="Fibra"     value={fmtG(m.fibra)}/>
        <MacroStat label="Hidratos"  value={fmtG(m.carbohidratos)} sub="tot."/>
      </div>

      <CoberturaPie conDatos={macros.conDatos} total={macros.total}/>
    </div>
  );
}

// Agregado de macros para un plan-menú: suma porPorcion de cada componente.
// "Una porción del menú completo (todos los componentes)".
function macrosDeMenu(menu, mapReceta) {
  let kcal = 0, carbohidratos = 0, proteinas = 0, grasas = 0, fibra = 0;
  let compConDatos = 0;
  const comps = menu.componentes || [];
  comps.forEach(c => {
    const r = mapReceta[c.recetaId];
    const mm = r && r.macros;
    if (!mm || !mm.conDatos || !mm.porPorcion) return;
    kcal += mm.porPorcion.kcal; carbohidratos += mm.porPorcion.carbohidratos;
    proteinas += mm.porPorcion.proteinas; grasas += mm.porPorcion.grasas;
    fibra += mm.porPorcion.fibra;
    compConDatos++;
  });
  return {
    porPorcion: { kcal, carbohidratos, proteinas, grasas, fibra },
    hidratosNetos: Math.max(0, carbohidratos - fibra),
    compConDatos, compTotal: comps.length,
  };
}

function MacrosMenuCard({ macros, layout = 'estrella' }) {
  if (!macros || macros.compConDatos === 0) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1px dashed var(--border)',
        borderRadius: 14, padding: '14px 18px', marginBottom: 12,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: 'var(--surface-alt)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="info" size={16}/></span>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4 }}>
          Todavía no hay datos de macros para los componentes de este menú.
        </p>
      </div>
    );
  }
  const m = macros.porPorcion;
  const parcial = macros.compConDatos < macros.compTotal;
  return (
    <div style={{
      background: 'var(--surface-strong)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 18px 16px', marginBottom: 12,
    }}>
      <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        Macros del menú · una porción completa
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: layout === 'tabla' ? 22 : 34, fontWeight: 800, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1, letterSpacing: '-.02em' }}>{fmtG(macros.hidratosNetos)}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>Hidratos netos</span>
      </div>
      <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--muted)' }}>
        suma de todos los componentes del menú
      </p>
      <div style={{ height: 1, background: 'var(--border-subtle)', margin: '14px 0' }}/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 8px' }}>
        <MacroStat label="kcal"      value={fmtKcal(m.kcal)}/>
        <MacroStat label="Proteínas" value={fmtG(m.proteinas)}/>
        <MacroStat label="Grasas"    value={fmtG(m.grasas)}/>
        <MacroStat label="Fibra"     value={fmtG(m.fibra)}/>
        <MacroStat label="Hidratos"  value={fmtG(m.carbohidratos)} sub="tot."/>
      </div>
      <p style={{
        margin: '12px 0 0', fontSize: 11, lineHeight: 1.4,
        color: parcial ? 'var(--warn-text)' : 'var(--muted)',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <Icon name={parcial ? 'alert-triangle' : 'info'} size={12}/>
        Estimado sobre {macros.compConDatos} de {macros.compTotal} componentes.
      </p>
    </div>
  );
}

Object.assign(window, {
  MetaCards, RecetaPill, IngredientesPorGondola,
  PasosPreview, AccionesPlan, CocinarSticky, Spinner,
  seccionMeta, SustitutosRecap,
  MacrosCard, MacrosMenuCard, macrosDeMenu,
});
