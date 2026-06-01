// MemberDashboardScreen.jsx — member home: Mi semana · Pendientes · Mi historial.
// Refined: loading skeleton + empty + error states, pressable rows w/ hover,
// and two layout options for "Mi semana" (rows | cards) driven by `layout`.

// ─── Greeting ────────────────────────────────────────────────────────────────

function GreetingCard({ nombre, semana, pendientesCount, onVerPendientes }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '2px 2px 0',
    }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 22, color: 'var(--text-strong)', letterSpacing: '-0.01em', lineHeight: 1.15 }}>Hola, {nombre}</h2>
        <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>Semana del {semana}</p>
      </div>
      {pendientesCount > 0 && (
        <button
          onClick={onVerPendientes}
          onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
          style={{
            flexShrink: 0, fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
            color: 'var(--warn-text)',
            background: hover ? 'var(--warn-line)' : 'var(--warn-bg)',
            border: '1px solid var(--warn-line)', borderRadius: 9999,
            padding: '5px 12px', cursor: 'pointer',
            transition: 'background 120ms ease',
          }}
        >{pendientesCount} por votar</button>
      )}
    </div>
  );
}

// ─── Pressable row wrapper (microinteraction) ────────────────────────────────

function PressRow({ onClick, children, style = {} }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 8, padding: '12px 10px', margin: '0 -10px',
        borderRadius: 10,
        background: hover && onClick ? 'var(--surface-alt)' : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 120ms ease',
        ...style,
      }}>{children}</div>
  );
}

// ─── Mi semana — ROW layout ──────────────────────────────────────────────────

function MiPlanRow({ plan, onCocinar, onVerReceta }) {
  const canCocinar = ['Compra pendiente', 'Compra lista', 'Cocinando'].includes(plan.estado);
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 8, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-strong)', fontSize: 14 }}>{plan.nombre}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{plan.tipo} · {plan.tiempo}</p>
      </div>
      <EstadoBadge estado={plan.estado}/>
      {canCocinar
        ? <Button variant="primary" size="sm" onClick={onCocinar}>{plan.estado === 'Cocinando' ? 'Continuar' : 'Cocinar'}</Button>
        : <Button variant="secondary" size="sm" onClick={onVerReceta}>Ver</Button>}
    </div>
  );
}

// ─── Mi semana — CARD layout (alt) ───────────────────────────────────────────

function MiPlanCard({ plan, onCocinar, onVerReceta }) {
  const canCocinar = ['Compra pendiente', 'Compra lista', 'Cocinando'].includes(plan.estado);
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 12,
      padding: '12px 14px', marginBottom: 8, background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-strong)', fontSize: 14, flex: 1 }}>{plan.nombre}</p>
        <EstadoBadge estado={plan.estado}/>
      </div>
      <p style={{ margin: '4px 0 10px', fontSize: 12, color: 'var(--muted)' }}>{plan.tipo} · {plan.tiempo}</p>
      {canCocinar
        ? <Button variant="primary" size="sm" fullWidth onClick={onCocinar}>{plan.estado === 'Cocinando' ? 'Continuar cocción' : 'Cocinar'}</Button>
        : <Button variant="secondary" size="sm" fullWidth onClick={onVerReceta}>Ver receta</Button>}
    </div>
  );
}

// ─── Pendientes ──────────────────────────────────────────────────────────────

function PendienteVotoRow({ plan, onEvaluar }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: 8, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-strong)', fontSize: 14 }}>{plan.nombre}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>Cocinada · esperando tu nota</p>
      </div>
      <Button variant="primary" size="sm" onClick={onEvaluar}>Evaluar</Button>
    </div>
  );
}

// ─── Historial ───────────────────────────────────────────────────────────────

function MiHistorialRow({ entry, miembroId, onOpen }) {
  const miNota = entry.calificaciones?.[miembroId];
  return (
    <PressRow onClick={onOpen} style={{ borderBottom: '1px solid var(--border-subtle)', borderRadius: 0, margin: 0, padding: '10px 0' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-strong)', fontWeight: 500 }}>{entry.nombreSeleccion}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {entry.fechaRealizada}{entry.resultado ? ` · ${entry.resultado}` : ''}
        </p>
      </div>
      {miNota != null && (
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', padding: '4px 10px', borderRadius: 9999, background: 'var(--primary-soft)' }}>
          {miNota}
        </span>
      )}
    </PressRow>
  );
}

// ─── Section card ────────────────────────────────────────────────────────────

function SectionCard({ title, action, children }) {
  return (
    <section style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-strong)' }}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyHint({ children }) {
  return <p style={{ margin: '8px 0 2px', fontSize: 13, color: 'var(--muted)' }}>{children}</p>;
}

// ─── Skeleton loaders ────────────────────────────────────────────────────────

function SkeletonLine({ w = '100%', h = 12 }) {
  return <div style={{ width: w, height: h, borderRadius: 6, background: 'var(--surface-alt)', animation: 'cf-pulse 1.3s ease-in-out infinite' }}/>;
}
function SkeletonDashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 2px 0' }}>
        <SkeletonLine w="45%" h={22}/>
        <SkeletonLine w="35%" h={13}/>
      </div>
      {[0, 1].map(i => (
        <div key={i} style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkeletonLine w="35%" h={14}/>
          <SkeletonLine w="80%"/><SkeletonLine w="65%"/>
        </div>
      ))}
    </div>
  );
}
if (!document.getElementById('cf-pulse-kf')) {
  const st = document.createElement('style');
  st.id = 'cf-pulse-kf';
  st.textContent = '@keyframes cf-pulse{0%,100%{opacity:1}50%{opacity:.45}}';
  document.head.appendChild(st);
}

// ─── Screen ──────────────────────────────────────────────────────────────────

function MemberDashboardScreen({
  nombre, miembroId, semana,
  misPlanes, pendientes, historial,
  loading, error,
  layout = 'rows',
  onCocinar, onVerReceta, onEvaluar, onOpenHistorial, onIrAHistorial, onReintentar,
}) {
  if (loading) return <SkeletonDashboard/>;

  if (error) {
    return (
      <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--err-line)', borderRadius: 14, padding: '28px 20px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--err-text)' }}>No se pudo cargar tu semana</p>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>Revisá la conexión e intentá de nuevo.</p>
        <Button variant="secondary" size="sm" onClick={onReintentar}>Reintentar</Button>
      </div>
    );
  }

  const PlanComp = layout === 'cards' ? MiPlanCard : MiPlanRow;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <GreetingCard nombre={nombre} semana={semana} pendientesCount={pendientes.length} onVerPendientes={() => pendientes[0] && onEvaluar(pendientes[0])}/>

      <SectionCard title="Mi semana">
        {misPlanes.length === 0
          ? <EmptyHint>No tenés platos asignados esta semana.</EmptyHint>
          : misPlanes.map(p => (
              <PlanComp key={p.id} plan={p} onCocinar={() => onCocinar(p)} onVerReceta={() => onVerReceta(p)}/>
            ))}
      </SectionCard>

      <SectionCard title="Pendientes de evaluar">
        {pendientes.length === 0
          ? <EmptyHint>No hay platos esperando tu nota.</EmptyHint>
          : pendientes.map(p => (
              <PendienteVotoRow key={p.id} plan={p} onEvaluar={() => onEvaluar(p)}/>
            ))}
      </SectionCard>

      <SectionCard
        title="Mi historial"
        action={historial.length > 0 && (
          <button onClick={onIrAHistorial} style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', color: 'var(--primary)', fontSize: 12, fontWeight: 500, fontFamily: 'inherit' }}>
            Ver todo →
          </button>
        )}
      >
        {historial.length === 0
          ? <EmptyHint>Todavía no evaluaste ningún plato.</EmptyHint>
          : historial.slice(0, 4).map(h => (
              <MiHistorialRow key={h.idHist} entry={h} miembroId={miembroId} onOpen={() => onOpenHistorial(h)}/>
            ))}
      </SectionCard>
    </div>
  );
}

window.MemberDashboardScreen = MemberDashboardScreen;
