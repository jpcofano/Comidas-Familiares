// BottomNav.jsx — fixed-bottom 4-tab nav using inline-SVG Icon component

function BottomNav({ active, onNavigate, isJP = true }) {
  const jpItems = [
    { id: 'home',       label: 'Inicio',     icon: 'home' },
    { id: 'biblioteca', label: 'Biblioteca', icon: 'book-open' },
    { id: 'compras',    label: 'Compras',    icon: 'shopping-bag' },
    { id: 'historial',  label: 'Historial',  icon: 'history' },
  ];
  const memberItems = [
    { id: 'home',       label: 'Mi semana',  icon: 'home' },
    { id: 'compras',    label: 'Compras',    icon: 'shopping-bag' },
    { id: 'pendientes', label: 'Pendientes', icon: 'clock' },
    { id: 'historial',  label: 'Historial',  icon: 'history' },
  ];
  const items = isJP ? jpItems : memberItems;

  return (
    <nav aria-label="Navegación principal" style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 20,
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4,
      padding: '8px 8px 12px',
      background: 'var(--bg)',
      borderTop: '1px solid var(--border)',
    }}>
      {items.map(it => {
        const isActive = it.id === active;
        return (
          <button
            key={it.id}
            onClick={() => onNavigate && onNavigate(it.id)}
            style={{
              minHeight: 56, padding: '8px 4px', borderRadius: 10,
              fontSize: 12, fontWeight: 500,
              background: isActive ? 'var(--primary-soft)' : 'transparent',
              color: isActive ? 'var(--primary)' : 'var(--muted)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 4, lineHeight: 1.1,
              border: 0, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Icon name={it.icon} size={20}/>
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

window.BottomNav = BottomNav;
