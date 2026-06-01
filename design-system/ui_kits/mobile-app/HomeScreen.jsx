// HomeScreen.jsx — v2: weekday strip + hero Especial + member avatars + progress bar

function PlanCard({ plan, featured, onCocinar, onVerReceta, onMoreActions }) {
  const canCocinar = ['Compra pendiente', 'Compra lista', 'Cocinando'].includes(plan.estado);
  return (
    <div style={{
      border: featured ? '2px solid var(--primary)' : '1px solid var(--border)',
      borderRadius: 14,
      background: 'var(--surface-strong)',
      overflow: 'hidden',
    }}>
      <div style={{ padding: featured ? '16px 18px 14px' : '14px 16px' }}>
        {featured && (
          <p style={{
            fontSize: 11, fontWeight: 700, color: 'var(--primary)',
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: 6,
          }}>{plan.contexto || 'Especial de la semana'}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <h3 style={{
            fontWeight: 600,
            fontSize: featured ? 18 : 15,
            color: 'var(--text-strong)',
            margin: 0, lineHeight: 1.2,
            letterSpacing: '-0.01em',
            textWrap: 'pretty',
          }}>{plan.nombre}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <EstadoBadge estado={plan.estado}/>
            <span style={{
              display: 'inline-block', padding: '2px 9px', borderRadius: 9999,
              fontSize: 12, fontWeight: 500,
              background: plan.diaChip ? 'var(--primary-soft)' : 'var(--surface-alt)',
              color: plan.diaChip ? 'var(--primary)' : 'var(--muted)',
            }}>{plan.diaChip || 'Sin día'}</span>
          </div>
        </div>

        {/* Metadata chips row */}
        {(plan.proteina || plan.tiempo || plan.dificultad) && (
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            gap: '4px 12px', marginTop: 8,
            fontSize: 13, color: 'var(--muted)',
          }}>
            {plan.proteina   && <span>{plan.proteina}</span>}
            {plan.tiempo     && <span>· {plan.tiempo}</span>}
            {plan.dificultad && <span>· {plan.dificultad}</span>}
          </div>
        )}

        {/* Cocineros row with avatars */}
        {plan.cocineros && plan.cocineros.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 12, padding: '10px 0 0',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <AvatarStack names={plan.cocineros} size={22}/>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {plan.cocineros.join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Action footer */}
      <div style={{
        display: 'flex', gap: 8,
        padding: '10px 18px 12px',
        background: 'var(--surface-alt)',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        {canCocinar && (
          <Button variant="primary" size="sm" onClick={onCocinar} style={{ flex: 1 }}>
            {plan.estado === 'Cocinando' ? 'Continuar cocinando' : 'Cocinar'}
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onVerReceta} style={{ flex: canCocinar ? '0 0 auto' : 1 }}>
          Ver receta
        </Button>
        <button
          onClick={onMoreActions}
          aria-label="Más acciones"
          style={{
            background: 'var(--surface-strong)', border: '1px solid var(--line)',
            borderRadius: 10, padding: '0 10px', cursor: 'pointer',
            color: 'var(--muted)', fontFamily: 'inherit', fontSize: 18, lineHeight: 1,
          }}
        >···</button>
      </div>
    </div>
  );
}

function CompraProgress({ pendientes, yaTengo, onIrCompras }) {
  const total = pendientes + yaTengo;
  const pct = total > 0 ? Math.round((yaTengo / total) * 100) : 0;
  return (
    <div onClick={onIrCompras} style={{
      padding: '14px 16px', background: 'var(--surface-strong)',
      border: '1px solid var(--border)', borderRadius: 14,
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
          Lista de compras
        </h3>
        <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500 }}>Ver todo →</span>
      </div>
      <div style={{
        height: 6, borderRadius: 9999,
        background: 'var(--surface-alt)',
        overflow: 'hidden', marginBottom: 8,
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: 'var(--ok-text)',
          transition: 'width 240ms ease',
        }}/>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
        <strong style={{ color: 'var(--text)' }}>{pendientes}</strong> pendientes · <strong style={{ color: 'var(--text)' }}>{yaTengo}</strong> ya tengo · {pct}%
      </p>
    </div>
  );
}

function SemanaBadge({ rango }) {
  return (
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', lineHeight: 1.2, marginBottom: 2 }}>
        Semana
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-strong)', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
        {rango}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 600, color: 'var(--muted)',
      textTransform: 'uppercase', letterSpacing: '.06em', margin: '4px 0 8px',
    }}>{children}</p>
  );
}

function HomeScreen({ planes, lista, onCocinar, onVerReceta, onIrCompras, onQueCocino, onAgregar }) {
  const especial   = planes.find(p => p.tipo === 'Especial');
  const extras     = planes.filter(p => p.tipo === 'Especial extra');
  const enProceso  = planes.filter(p => p.tipo === 'En proceso');
  const total      = planes.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Header: kicker + conteo + badge de semana ─────────── */}
      <section>
        <div style={{ marginBottom: 12 }}>
          <p style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 4px',
          }}>Esta semana</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>
              {total === 0 ? 'Sin comidas' : `${total} ${total === 1 ? 'comida' : 'comidas'}`}
            </h1>
            <SemanaBadge rango="26 may – 1 jun"/>
          </div>
        </div>
        <WeekStrip today={1} marked={[1, 2, 4]}/>
      </section>

      {/* ── Entrada: ¿qué cocino con lo que tengo? ──────── */}
      {onQueCocino && (
        <button type="button" onClick={onQueCocino} style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '13px 15px', textAlign: 'left', cursor: 'pointer',
          fontFamily: 'inherit', borderRadius: 14,
          background: 'var(--primary-soft)', border: '1px solid transparent',
        }}>
          <span style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: 'var(--primary)', color: 'var(--on-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="carrot" size={20}/></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: 'var(--primary-strong)', lineHeight: 1.2 }}>
              ¿Qué cocino con lo que tengo?
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--primary)', opacity: 0.85, lineHeight: 1.35, marginTop: 2 }}>
              Recetas según tu despensa
            </span>
          </span>
          <span style={{ color: 'var(--primary)', flexShrink: 0, display: 'inline-flex' }}>
            <Icon name="chevron-right" size={20}/>
          </span>
        </button>
      )}

      {/* ── Especial + extras (anidados bajo regla) ───────────── */}
      <section>
        {especial ? (
          <>
            <PlanCard
              plan={{ ...especial, contexto: 'Especial · Martes', diaChip: 'Mar 27' }}
              featured
              onCocinar={() => onCocinar(especial)}
              onVerReceta={() => onVerReceta(especial)}
              onMoreActions={() => {}}
            />
            <div style={{ marginLeft: 20, paddingLeft: 16, borderLeft: '3px solid var(--line)', marginTop: 12 }}>
              {extras.length > 0 && (
                <>
                  <SectionLabel>Extras</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {extras.map(p => (
                      <PlanCard key={p.id} plan={p}
                        onCocinar={() => onCocinar(p)} onVerReceta={() => onVerReceta(p)} onMoreActions={() => {}}/>
                    ))}
                  </div>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onAgregar} style={{ marginTop: extras.length > 0 ? 4 : 0 }}>
                + Sumar extra
              </Button>
            </div>
          </>
        ) : (
          <>
            <SectionLabel>Especial</SectionLabel>
            <Button variant="ghost" size="sm" onClick={onAgregar}>+ Elegir como Especial</Button>
          </>
        )}
      </section>

      {/* ── En proceso — siempre visible ──────────────────────── */}
      <section>
        <SectionLabel>En proceso</SectionLabel>
        {enProceso.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 4 }}>
            {enProceso.map(p => (
              <PlanCard key={p.id} plan={p}
                onCocinar={() => onCocinar(p)} onVerReceta={() => onVerReceta(p)} onMoreActions={() => {}}/>
            ))}
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={onAgregar}>+ Sumar en proceso</Button>
      </section>

      {/* ── Lista de compras con progreso ─────────────────────── */}
      {lista && (
        <CompraProgress
          pendientes={lista.pendientes}
          yaTengo={lista.yaTengo}
          onIrCompras={onIrCompras}
        />
      )}
    </div>
  );
}

window.HomeScreen = HomeScreen;
