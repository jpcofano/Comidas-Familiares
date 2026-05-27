// HomeScreen.jsx — JP home: Especial + extras + en proceso + lista de compras

function PlanCard({ plan, featured, onCocinar, onVerReceta, onMarcarCocinada, onDescartar }) {
  const canCocinar = ['Compra pendiente', 'Compra lista', 'Cocinando'].includes(plan.estado);
  return (
    <div style={{
      border: featured ? '2px solid var(--primary)' : '1px solid var(--border)',
      borderRadius: featured ? 14 : 10,
      padding: featured ? 16 : '12px 16px',
      background: 'var(--surface-strong)',
      marginBottom: 12,
    }}>
      {featured && (
        <p style={{
          fontSize: 12, fontWeight: 700, color: 'var(--primary)',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          marginBottom: 8,
        }}>Especial de la semana</p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontWeight: 500, fontSize: featured ? 15 : 14,
            color: 'var(--text-strong)', margin: 0,
          }}>{plan.nombre}</p>
        </div>
        <EstadoBadge estado={plan.estado}/>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {canCocinar && <Button variant="primary" size="sm" onClick={onCocinar}>
          {plan.estado === 'Cocinando' ? 'Continuar cocinando' : 'Cocinar'}
        </Button>}
        {canCocinar && <Button variant="secondary" size="sm" onClick={onMarcarCocinada}>Marcar Cocinada</Button>}
        <Button variant="secondary" size="sm" onClick={onVerReceta}>Ver receta</Button>
        <Button variant="danger" size="sm" onClick={onDescartar} style={{ marginLeft: 'auto' }}>Descartar</Button>
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Quiénes cocinan este plato</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
          {plan.cocineros.join(', ')}
        </p>
      </div>
    </div>
  );
}

function HomeScreen({ planes, lista, onCocinar, onVerReceta, onIrCompras, onAgregar }) {
  const especial   = planes.find(p => p.tipo === 'Especial');
  const extras     = planes.filter(p => p.tipo === 'Especial extra');
  const enProceso  = planes.filter(p => p.tipo === 'En proceso');

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 20px 24px',
    }}>
      <h2 style={{ marginBottom: 16 }}>Esta semana</h2>

      {especial && (
        <section style={{ marginBottom: 8 }}>
          <PlanCard
            plan={especial}
            featured
            onCocinar={() => onCocinar(especial)}
            onVerReceta={() => onVerReceta(especial)}
            onMarcarCocinada={() => {}}
            onDescartar={() => {}}
          />
          <div style={{ marginLeft: 20, paddingLeft: 16, borderLeft: '3px solid var(--line)' }}>
            {extras.length > 0 && (
              <>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 8px' }}>Extras</p>
                {extras.map(p => (
                  <PlanCard
                    key={p.id} plan={p}
                    onCocinar={() => onCocinar(p)}
                    onVerReceta={() => onVerReceta(p)}
                    onMarcarCocinada={() => {}}
                    onDescartar={() => {}}
                  />
                ))}
              </>
            )}
            <Button variant="ghost" size="sm" onClick={onAgregar}>+ Sumar extra</Button>
          </div>
        </section>
      )}

      {enProceso.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>En proceso</p>
          {enProceso.map(p => (
            <PlanCard
              key={p.id} plan={p}
              onCocinar={() => onCocinar(p)}
              onVerReceta={() => onVerReceta(p)}
              onMarcarCocinada={() => {}}
              onDescartar={() => {}}
            />
          ))}
        </section>
      )}

      {lista && (
        <section style={{
          marginTop: 20, padding: '12px 16px',
          background: 'var(--surface-alt)',
          borderRadius: 10,
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Lista de compras</p>
            <a onClick={onIrCompras} style={{ fontSize: 12, color: 'var(--primary)', cursor: 'pointer' }}>Ver todo →</a>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text)' }}>
            <strong>{lista.pendientes}</strong> pendientes · <strong>{lista.yaTengo}</strong> ya tengo
          </p>
        </section>
      )}
    </div>
  );
}

window.HomeScreen = HomeScreen;
