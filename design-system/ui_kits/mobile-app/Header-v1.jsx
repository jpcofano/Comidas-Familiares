// Header.jsx — sticky app header with title + avatar

function Header({ nombre = 'Juan Pablo' }) {
  const inicial = (nombre || 'J').charAt(0).toUpperCase();
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-header)',
      padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h1 style={{
          fontSize: 17, fontWeight: 700, color: 'var(--primary)',
          letterSpacing: '-0.01em', margin: 0,
        }}>Comida Familiar</h1>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 8px', background: 'transparent', border: 0,
          borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 500, fontSize: 13, flexShrink: 0,
          }}>{inicial}</span>
          <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: 14 }}>{nombre}</span>
        </button>
      </div>
    </header>
  );
}

window.Header = Header;
