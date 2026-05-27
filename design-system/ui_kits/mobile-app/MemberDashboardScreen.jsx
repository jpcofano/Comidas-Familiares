// MemberDashboardScreen.jsx — non-JP home view: Mi semana, Pendientes, Mi historial

function GreetingCard({ nombre, semana, miembroId }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px',
      background: 'var(--surface-strong)',
      border: '1px solid var(--border)',
      borderRadius: 14,
    }}>
      <MemberAvatar name={miembroId} size={44}/>
      <div style={{ minWidth: 0, flex: 1 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-strong)' }}>
          Hola, {nombre}
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>
          Semana del {semana}
        </p>
      </div>
    </div>
  );
}

function MiPlanRow({ plan, onCocinar, onVerReceta }) {
  const canCocinar = ['Compra pendiente', 'Compra lista', 'Cocinando'].includes(plan.estado);
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 8, padding: '12px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-strong)', fontSize: 14 }}>
          {plan.nombre}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {plan.tipo} · {plan.tiempo}
        </p>
      </div>
      <EstadoBadge estado={plan.estado}/>
      {canCocinar && (
        <Button variant="primary" size="sm" onClick={onCocinar}>
          {plan.estado === 'Cocinando' ? 'Continuar' : 'Cocinar'}
        </Button>
      )}
      {!canCocinar && (
        <Button variant="secondary" size="sm" onClick={onVerReceta}>Ver</Button>
      )}
    </div>
  );
}

function PendienteVotoRow({ plan, onEvaluar }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 8, padding: '12px 0',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-strong)', fontSize: 14 }}>
          {plan.nombre}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          Cocinada · esperando tu nota
        </p>
      </div>
      <Button variant="primary" size="sm" onClick={onEvaluar}>Evaluar</Button>
    </div>
  );
}

function MiHistorialRow({ entry, miembroId, onOpen }) {
  const miNota = entry.calificaciones?.[miembroId];
  return (
    <div
      onClick={onOpen}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 8, padding: '10px 0',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-strong)', fontWeight: 500 }}>
          {entry.nombreSeleccion}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {entry.fechaRealizada}{entry.resultado ? ` · ${entry.resultado}` : ''}
        </p>
      </div>
      {miNota != null && (
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--primary)',
          padding: '4px 10px', borderRadius: 9999, background: 'var(--primary-soft)',
        }}>{miNota} / 10</span>
      )}
    </div>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <section style={{
      background: 'var(--surface-strong)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: '14px 16px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        marginBottom: 6,
      }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function MemberDashboardScreen({
  nombre, miembroId, semana,
  misPlanes, pendientes, historial,
  onCocinar, onVerReceta, onEvaluar, onOpenHistorial, onIrAHistorial,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GreetingCard nombre={nombre} miembroId={miembroId} semana={semana}/>

      <SectionCard title="Mi semana">
        {misPlanes.length === 0 ? (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            No tenés platos asignados esta semana.
          </p>
        ) : (
          misPlanes.map(p => (
            <MiPlanRow
              key={p.id} plan={p}
              onCocinar={() => onCocinar(p)}
              onVerReceta={() => onVerReceta(p)}
            />
          ))
        )}
      </SectionCard>

      <SectionCard title="Pendientes de evaluar">
        {pendientes.length === 0 ? (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            No hay platos esperando tu nota.
          </p>
        ) : (
          pendientes.map(p => (
            <PendienteVotoRow
              key={p.id} plan={p}
              onEvaluar={() => onEvaluar(p)}
            />
          ))
        )}
      </SectionCard>

      <SectionCard
        title="Mi historial"
        action={
          historial.length > 0 && (
            <button
              onClick={onIrAHistorial}
              style={{
                background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                color: 'var(--primary)', fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
              }}
            >Ver todo →</button>
          )
        }
      >
        {historial.length === 0 ? (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--muted)' }}>
            Todavía no evaluaste ningún plato.
          </p>
        ) : (
          historial.slice(0, 4).map(h => (
            <MiHistorialRow
              key={h.idHist} entry={h} miembroId={miembroId}
              onOpen={() => onOpenHistorial(h)}
            />
          ))
        )}
      </SectionCard>
    </div>
  );
}

window.MemberDashboardScreen = MemberDashboardScreen;
