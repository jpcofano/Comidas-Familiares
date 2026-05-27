// detalle-receta.jsx — DetalleReceta v2
// Mejoras vs actual:
// 1. Hero con título + meta clave en 3 columnas (tiempo total · porciones · dificultad)
// 2. Ingredientes agrupados por GÓNDOLA (matching la canon de Lista de Compras)
// 3. Pasos preview (3) + link "Ver los N pasos completos" → Cocinar
// 4. Acciones JP en un sheet plegable, no 3 botones gigantes apilados

const SECCIONES_DETALLE = {
  'Verdulería': { color: 'oklch(0.62 0.07 130)', letra: 'V' },
  'Carnicería': { color: 'oklch(0.55 0.10 25)',  letra: 'C' },
  'Lácteos':    { color: 'oklch(0.78 0.04 90)',  letra: 'L' },
  'Almacén':    { color: 'oklch(0.62 0.08 60)',  letra: 'A' },
  'Panadería':  { color: 'oklch(0.65 0.07 50)',  letra: 'P' },
};
const ORDEN_DETALLE = ['Verdulería', 'Carnicería', 'Lácteos', 'Almacén', 'Panadería'];

function GondolaChipD({ seccion, size = 22 }) {
  const meta = SECCIONES_DETALLE[seccion] || { color: 'var(--muted)', letra: '·' };
  return (
    <span style={{
      width: size, height: size, borderRadius: size <= 18 ? 5 : 7,
      background: meta.color, color: '#fff',
      fontSize: size * 0.55, fontWeight: 700, lineHeight: 1,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{meta.letra}</span>
  );
}

function MetaCard({ label, value, sub }) {
  return (
    <div style={{
      flex: 1, padding: '12px 10px', borderRadius: 12,
      background: 'var(--surface-alt)',
      textAlign: 'center', lineHeight: 1.1,
      minWidth: 0,
    }}>
      <p style={{
        margin: 0, fontSize: 9.5, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>{label}</p>
      <p style={{
        margin: '6px 0 1px', fontSize: 18, fontWeight: 700,
        color: 'var(--text-strong)', letterSpacing: '-0.015em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{value}</p>
      {sub && (
        <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{sub}</p>
      )}
    </div>
  );
}

function Pill({ children, variant = 'neutral' }) {
  const tones = {
    neutral: { bg: 'var(--surface-alt)', color: 'var(--muted-strong)' },
    ok:      { bg: 'var(--ok-bg)',       color: 'var(--ok-text)' },
    info:    { bg: 'var(--info-bg)',     color: 'var(--info-text)' },
    accent:  { bg: 'var(--accent-soft)', color: 'var(--accent)' },
  };
  const t = tones[variant];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '4px 10px',
      borderRadius: 999, background: t.bg, color: t.color,
      whiteSpace: 'nowrap', letterSpacing: '-0.005em',
    }}>{children}</span>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 12, padding: '0 0 10px', borderBottom: '1px solid var(--border-subtle)',
      marginBottom: 12,
    }}>
      <h2 style={{
        margin: 0, fontSize: 11, fontWeight: 700,
        color: 'var(--muted)', textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>{children}</h2>
      {right}
    </div>
  );
}

function DetalleReceta({ receta, isJP = true, onCocinar, onBack }) {
  const [accionesOpen, setAccionesOpen] = React.useState(false);
  const [pasosExpand, setPasosExpand]   = React.useState(false);

  // Group ingredientes by góndola in canonical order
  const ingredientesPorGondola = React.useMemo(() => {
    const map = new Map();
    for (const ing of receta.ingredientes) {
      const sec = ing.seccion || 'Otros';
      if (!map.has(sec)) map.set(sec, []);
      map.get(sec).push(ing);
    }
    const out = [];
    for (const sec of ORDEN_DETALLE) {
      if (map.has(sec)) out.push({ seccion: sec, items: map.get(sec) });
    }
    if (map.has('Otros')) out.push({ seccion: 'Otros', items: map.get('Otros') });
    return out;
  }, [receta]);

  const pasosOrdenados = [...receta.pasos].sort((a, b) => a.nroPaso - b.nroPaso);
  const pasosVisibles  = pasosExpand ? pasosOrdenados : pasosOrdenados.slice(0, 3);

  return (
    <div style={{
      paddingTop: 56, paddingBottom: 110, minHeight: '100%',
      background: 'var(--bg)', fontFamily: 'var(--font-sans)',
    }}>
      {/* HEADER chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px 4px',
      }}>
        <button onClick={onBack} aria-label="Volver" style={{
          background: 'transparent', border: 'none', padding: 8,
          color: 'var(--text)', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span style={{
          fontSize: 11, fontWeight: 600, color: 'var(--muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>{receta.tipoItem}</span>
      </div>

      {/* HERO photo slot */}
      <div style={{
        margin: '8px 16px 0', height: 180, borderRadius: 18,
        background: 'linear-gradient(135deg, oklch(0.62 0.08 60) 0%, oklch(0.55 0.10 25) 100%)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          color: 'rgba(255, 255, 255, 0.6)', fontSize: 11,
          textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600,
        }}>FOTO DE LA RECETA</span>
        {/* subtle texture */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 50%)',
        }}/>
      </div>

      {/* TITLE + descripción */}
      <div style={{ padding: '20px 20px 0' }}>
        <h1 style={{
          margin: 0, fontSize: 24, fontWeight: 700,
          color: 'var(--text-strong)', letterSpacing: '-0.02em',
          lineHeight: 1.15,
        }}>{receta.nombre}</h1>
        {receta.porQueEspecial && (
          <p style={{
            margin: '8px 0 0', fontSize: 14, color: 'var(--muted-strong)',
            lineHeight: 1.5, fontStyle: 'italic',
          }}>{receta.porQueEspecial}</p>
        )}
      </div>

      {/* META 3 cards */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 8 }}>
        <MetaCard label="Total" value={receta.tiempoTotalLabel}
                  sub={receta.tiempoActivoLabel ? `${receta.tiempoActivoLabel} activo` : ''}/>
        <MetaCard label="Porciones" value={receta.porcionesLabel}/>
        <MetaCard label="Dificultad" value={receta.dificultad}/>
      </div>

      {/* TAGS row */}
      <div style={{
        padding: '14px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 6,
      }}>
        <Pill variant="accent">{receta.proteinaPrincipal}</Pill>
        <Pill>{receta.escenarioUso}</Pill>
        {receta.estilo && <Pill>{receta.estilo}</Pill>}
        {receta.tecnicaPrincipal && <Pill>{receta.tecnicaPrincipal}</Pill>}
        <Pill>Costo {receta.costoEstimado.toLowerCase()}</Pill>
        {receta.sinLacteos && <Pill variant="ok">Sin lácteos</Pill>}
        {!receta.hidratos && <Pill variant="info">Sin hidratos</Pill>}
        {receta.aptoNocheDeADos === 'Sí' && <Pill variant="info">Noche de a dos</Pill>}
      </div>

      {/* INGREDIENTES — agrupado por góndola */}
      <div style={{ padding: '24px 20px 0' }}>
        <SectionTitle right={
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
            {receta.ingredientes.length} items
          </span>
        }>Ingredientes</SectionTitle>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ingredientesPorGondola.map((g) => (
            <div key={g.seccion}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <GondolaChipD seccion={g.seccion} size={20}/>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: 'var(--muted)', textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>{g.seccion}</span>
                <span style={{
                  fontSize: 11, color: 'var(--muted)', fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums', marginLeft: 'auto',
                }}>{g.items.length}</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {g.items.map((ing, i) => (
                  <li key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '8px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    fontSize: 14, color: ing.opcional ? 'var(--muted)' : 'var(--text)',
                  }}>
                    <span>{ing.textoOriginal}{ing.opcional ? ' (opcional)' : ''}</span>
                    <span style={{
                      color: 'var(--text-strong)', fontWeight: 600,
                      flexShrink: 0, marginLeft: 12,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {ing.cantidadLabel} <span style={{ fontWeight: 500, color: 'var(--muted)' }}>{ing.unidad}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* PASOS — preview */}
      <div style={{ padding: '28px 20px 0' }}>
        <SectionTitle right={
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
            {pasosOrdenados.length} pasos
          </span>
        }>Preparación</SectionTitle>

        {receta.riesgos && (
          <div style={{
            marginBottom: 14, padding: '10px 12px',
            background: 'var(--warn-bg)', borderRadius: 10,
            border: '1px solid var(--warn-line, var(--border))',
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 14 }}>⚠</span>
            <p style={{ margin: 0, fontSize: 12.5, color: 'var(--warn-text)', lineHeight: 1.4 }}>
              {receta.riesgos}
            </p>
          </div>
        )}

        <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {pasosVisibles.map((paso) => (
            <li key={paso.nroPaso} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--primary-soft)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                }}>{paso.nroPaso}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                    <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: 'var(--text-strong)', flex: 1, lineHeight: 1.3 }}>
                      {paso.titulo}
                    </p>
                    {paso.tiempoEstimadoLabel && (
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                        {paso.tiempoEstimadoLabel}
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
                    {paso.detalle}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {!pasosExpand && pasosOrdenados.length > 3 && (
          <button onClick={() => setPasosExpand(true)} style={{
            width: '100%', marginTop: 6, padding: '10px',
            background: 'transparent', border: '1px dashed var(--border)',
            borderRadius: 10, color: 'var(--primary)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}>
            Ver los {pasosOrdenados.length - 3} pasos restantes ↓
          </button>
        )}
      </div>

      {/* NOTAS */}
      {receta.notas && (
        <div style={{ padding: '24px 20px 0' }}>
          <SectionTitle>Tip del cocinero</SectionTitle>
          <p style={{
            margin: 0, fontSize: 14, color: 'var(--text)',
            lineHeight: 1.55, fontStyle: 'italic',
          }}>{receta.notas}</p>
        </div>
      )}

      {/* JP only — Acciones plegables */}
      {isJP && (
        <div style={{ padding: '28px 16px 0' }}>
          <button
            onClick={() => setAccionesOpen(!accionesOpen)}
            style={{
              width: '100%', padding: '14px 16px',
              background: 'var(--surface-strong)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ textAlign: 'left' }}>
              <span style={{
                display: 'block', fontSize: 13, fontWeight: 700,
                color: 'var(--text-strong)',
              }}>Agregar al plan de la semana</span>
              <span style={{
                display: 'block', fontSize: 11, color: 'var(--muted)',
                marginTop: 2, fontWeight: 500,
              }}>3 opciones disponibles</span>
            </span>
            <span style={{
              color: 'var(--muted)', fontSize: 18,
              transform: accionesOpen ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 180ms ease',
            }}>›</span>
          </button>
          {accionesOpen && (
            <div style={{ marginTop: 8, padding: '4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <AccionRow label="Elegir como Especial"
                         hint="La estrella de la semana — un único Especial por semana."
                         onClick={() => alert('elegirComoEspecial')}/>
              <AccionRow label="Sumar como Especial extra"
                         hint="Agrega como acompañante del especial actual."
                         disabled
                         razon="Primero tenés que elegir un especial."
                         onClick={() => {}}/>
              <AccionRow label="Sumar como En proceso"
                         hint="Plato de prueba — viene de tu lista de pendientes."
                         onClick={() => alert('sumarComoEnProceso')}/>
            </div>
          )}
        </div>
      )}

      {/* STICKY bottom — Cocinar */}
      {isJP && (
        <div style={{
          position: 'sticky', bottom: 0, padding: '12px 16px 20px',
          background: 'linear-gradient(180deg, rgba(253,250,246,0) 0%, var(--bg) 35%)',
          marginTop: 28,
        }}>
          <button onClick={onCocinar} style={{
            width: '100%', padding: '15px 16px', borderRadius: 14,
            background: 'var(--primary)', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: 15, fontWeight: 700,
            boxShadow: '0 6px 18px rgba(138, 74, 47, 0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Empezar a cocinar
          </button>
        </div>
      )}
    </div>
  );
}

function AccionRow({ label, hint, disabled, razon, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 14px', borderRadius: 12,
      background: disabled ? 'var(--surface-alt)' : 'var(--primary-soft)',
      border: '1px solid transparent',
      cursor: disabled ? 'default' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      textAlign: 'left', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <span style={{
        fontSize: 14, fontWeight: 700,
        color: disabled ? 'var(--muted)' : 'var(--primary)',
      }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 500,
        color: 'var(--muted)', lineHeight: 1.4,
      }}>{disabled ? razon : hint}</span>
    </button>
  );
}

window.DetalleReceta = DetalleReceta;
