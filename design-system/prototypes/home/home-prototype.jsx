// home-prototype.jsx — Pantalla principal con WeekStrip mejorado
// Cambios:
// 1. "Semana 22" upper right del header (más visible)
// 2. Indicador de comida en el día = icono de plato, no un dot

function Plate({ size = 12, filled = false, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'block' }}>
      <circle cx="6" cy="6" r="5" stroke={color} strokeWidth="1.3" fill={filled ? color : 'none'}/>
      {!filled && <circle cx="6" cy="6" r="2" fill={color}/>}
    </svg>
  );
}

function WeekStripNew({ today = 1, marked = [1, 2, 4], onPick }) {
  const days = [
    { letter: 'L', label: 'Lun', n: 26 },
    { letter: 'M', label: 'Mar', n: 27 },
    { letter: 'M', label: 'Mié', n: 28 },
    { letter: 'J', label: 'Jue', n: 29 },
    { letter: 'V', label: 'Vie', n: 30 },
    { letter: 'S', label: 'Sáb', n: 31 },
    { letter: 'D', label: 'Dom', n: 1  },
  ];
  const markedSet = new Set(marked);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
      {days.map((d, i) => {
        const isToday = i === today;
        const hasMeal = markedSet.has(i);
        return (
          <button
            key={i}
            onClick={() => onPick?.(i)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              padding: '8px 0 7px', borderRadius: 12, border: 'none',
              background: isToday ? 'var(--primary-soft)' : 'transparent',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: isToday ? 'var(--primary)' : 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{d.letter}</span>
            <span style={{
              fontSize: 16, fontWeight: isToday ? 700 : 500,
              color: isToday ? 'var(--primary)' : 'var(--text-strong)',
              fontVariantNumeric: 'tabular-nums', lineHeight: 1,
            }}>{d.n}</span>
            <span style={{ height: 14, display: 'flex', alignItems: 'center' }}>
              {hasMeal && (
                <Plate
                  size={13}
                  filled={isToday}
                  color={isToday ? 'var(--primary)' : 'var(--muted)'}
                />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Tiny week badge for the header right
function SemanaBadge({ rango }) {
  return (
    <div style={{ textAlign: 'right', lineHeight: 1.1, flexShrink: 0 }}>
      <p style={{
        margin: 0, fontSize: 10, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>Semana</p>
      <p style={{
        margin: '4px 0 0', fontSize: 12, fontWeight: 600,
        color: 'var(--text-strong)', letterSpacing: '-0.005em',
        whiteSpace: 'nowrap',
      }}>{rango}</p>
    </div>
  );
}

// ─── HomeScreen ────────────────────────────────────────────────

const PLANES = [
  { id: 1, tipo: 'Especial', dia: 'Mar', nombre: 'Pollo al horno con papas', estado: 'Compra lista', proteina: 'Pollo', tiempo: '1 h 10 min', cocineros: ['Caro'] },
  { id: 2, tipo: 'Especial extra', dia: 'Mié', nombre: 'Tallarines bolognesa', estado: 'Compra pendiente', proteina: 'Carne', tiempo: '45 min', cocineros: ['JP'] },
  { id: 3, tipo: 'En proceso', dia: 'Vie', nombre: 'Milanesas con puré', estado: 'Cocinando', proteina: 'Carne', tiempo: '50 min', cocineros: ['JP', 'Caro'] },
];

function HomePrototype() {
  const [picked, setPicked] = React.useState(1);

  return (
    <div style={{
      paddingTop: 56, paddingBottom: 80, minHeight: '100%',
      background: 'var(--bg)', fontFamily: 'var(--font-sans)',
    }}>
      {/* APP CHROME — fake header for context */}
      <FakeHeader/>

      <div style={{ padding: '14px 20px 0' }}>
        {/* ── Hero: Esta semana + Semana 22 ─────────────── */}
        <div style={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', gap: 16, marginBottom: 14,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{
              margin: 0, fontSize: 11, fontWeight: 600,
              color: 'var(--muted)', textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>Esta semana</p>
            <h1 style={{
              margin: '4px 0 0', fontSize: 20, fontWeight: 700,
              color: 'var(--text-strong)', lineHeight: 1.15,
              letterSpacing: '-0.015em', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>3 comidas planeadas</h1>
          </div>
          <SemanaBadge rango="26 may – 1 jun"/>
        </div>

        <WeekStripNew today={picked} marked={[1, 2, 4]} onPick={setPicked}/>
      </div>

      {/* Especial hero */}
      <div style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PlanCardSimple plan={PLANES[0]} featured/>

        <p style={{
          margin: '8px 0 4px', fontSize: 11, fontWeight: 600,
          color: 'var(--muted)', textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>Extras</p>
        <PlanCardSimple plan={PLANES[1]}/>

        <p style={{
          margin: '14px 0 4px', fontSize: 11, fontWeight: 600,
          color: 'var(--muted)', textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>En proceso</p>
        <PlanCardSimple plan={PLANES[2]}/>

        {/* Compras tile */}
        <div style={{
          marginTop: 8, padding: '14px 16px',
          background: 'var(--surface-strong)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 14, display: 'flex',
          flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>
              Lista de compras
            </h3>
            <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Ver todo →</span>
          </div>
          <div style={{
            height: 6, borderRadius: 9999, background: 'var(--surface-alt)', overflow: 'hidden',
          }}>
            <div style={{ width: '38%', height: '100%', background: 'var(--ok-text)' }}/>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            <b style={{ color: 'var(--text)' }}>10</b> pendientes · <b style={{ color: 'var(--text)' }}>6</b> ya tengo · 38%
          </p>
        </div>
      </div>
    </div>
  );
}

function FakeHeader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 16px 12px', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--primary-soft)', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', color: 'var(--primary)',
        }}>
          <Plate size={14}/>
        </span>
        <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--primary)', letterSpacing: '-0.01em' }}>
          Comida Familiar
        </h1>
      </div>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'var(--primary)', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
      }}>J</div>
    </div>
  );
}

function PlanCardSimple({ plan, featured }) {
  return (
    <div style={{
      borderRadius: 14, padding: featured ? '16px 18px' : '14px 16px',
      background: 'var(--surface-strong)',
      border: featured ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
    }}>
      {featured && (
        <p style={{
          margin: '0 0 6px', fontSize: 11, fontWeight: 700,
          color: 'var(--primary)', textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>Especial · {plan.dia}</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <h3 style={{
          margin: 0, fontSize: featured ? 17 : 15, fontWeight: 700,
          color: 'var(--text-strong)', letterSpacing: '-0.01em', lineHeight: 1.2,
        }}>{plan.nombre}</h3>
        <span style={{
          padding: '3px 8px', borderRadius: 6,
          background: plan.estado === 'Cocinando' ? 'var(--warn-bg)' :
                      plan.estado === 'Compra lista' ? 'var(--ok-bg)' :
                                                       'var(--surface-alt)',
          color: plan.estado === 'Cocinando' ? 'var(--warn-text)' :
                 plan.estado === 'Compra lista' ? 'var(--ok-text)' : 'var(--muted)',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.02em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>{plan.estado}</span>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted)' }}>
        {plan.proteina} · {plan.tiempo} · {plan.cocineros.join(', ')}
      </p>
    </div>
  );
}

window.HomePrototype = HomePrototype;
window.Plate = Plate;
