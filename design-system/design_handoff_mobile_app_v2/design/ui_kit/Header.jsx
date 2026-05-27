// Header.jsx — v2: tighter, with optional context line below title

function Header({ nombre = 'Juan Pablo', subtitle }) {
  const inicial = (nombre || 'J').charAt(0).toUpperCase();
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      boxShadow: 'var(--shadow-header)',
      padding: '10px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span aria-hidden style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--primary-soft)', color: 'var(--primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon name="chef-hat" size={16} strokeWidth={1.6}/>
          </span>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              fontSize: 16, fontWeight: 700, color: 'var(--primary)',
              letterSpacing: '-0.01em', margin: 0, lineHeight: 1.1,
            }}>Comida Familiar</h1>
            {subtitle && (
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '2px 0 0' }}>{subtitle}</p>
            )}
          </div>
        </div>

        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 4px', background: 'transparent', border: 0,
          borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <span style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 500, fontSize: 13, flexShrink: 0,
          }}>{inicial}</span>
        </button>
      </div>
    </header>
  );
}

window.Header = Header;
