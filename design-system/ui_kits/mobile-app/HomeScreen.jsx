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
          <EstadoBadge estado={plan.estado}/>
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

function HomeScreen({ planes, lista, onCocinar, onVerReceta, onIrCompras, onAgregar }) {
  const especial   = planes.find(p => p.tipo === 'Especial');
  const extras     = planes.filter(p => p.tipo === 'Especial extra');
  const enProceso  = planes.filter(p => p.tipo === 'En proceso');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Semana header ─────────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <h1 style={{ margin: 0 }}>Esta semana</h1>
          <span style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Semana 22
          </span>
        </div>
        <WeekStrip today={1} marked={[1, 2, 4]}/>
      </section>

      {/* ── Especial hero ─────────────────────────────────────── */}
      {especial && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PlanCard
            plan={{ ...especial, contexto: 'Especial · Martes' }}
            featured
            onCocinar={() => onCocinar(especial)}
            onVerReceta={() => onVerReceta(especial)}
            onMoreActions={() => {}}
          />

          {extras.length > 0 && (
            <div>
              <p style={{
                fontSize: 11, fontWeight: 600, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '.06em',
                margin: '4px 0 8px',
              }}>Extras</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {extras.map(p => (
                  <PlanCard
                    key={p.id} plan={p}
                    onCocinar={() => onCocinar(p)}
                    onVerReceta={() => onVerReceta(p)}
                    onMoreActions={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={onAgregar} style={{ alignSelf: 'flex-start' }}>
            + Sumar extra
          </Button>
        </section>
      )}

      {/* ── En proceso ────────────────────────────────────────── */}
      {enProceso.length > 0 && (
        <section>
          <p style={{
            fontSize: 11, fontWeight: 600, color: 'var(--muted)',
            textTransform: 'uppercase', letterSpacing: '.06em',
            margin: '0 0 8px',
          }}>En proceso</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {enProceso.map(p => (
              <PlanCard
                key={p.id} plan={p}
                onCocinar={() => onCocinar(p)}
                onVerReceta={() => onVerReceta(p)}
                onMoreActions={() => {}}
              />
            ))}
          </div>
        </section>
      )}

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
