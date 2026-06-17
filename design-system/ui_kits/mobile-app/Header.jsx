// Header.jsx — v2: tighter, with optional context line below title

function ThemeToggle() {
  const getInit = () => {
    try { return localStorage.getItem('cf-theme') === 'dark'; } catch (e) { return false; }
  };
  const [dark, setDark] = React.useState(getInit);

  React.useEffect(() => {
    const root = document.documentElement;
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('cf-theme', dark ? 'dark' : 'light'); } catch (e) {}
  }, [dark]);

  return (
    <button
      onClick={() => setDark(d => !d)}
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={dark ? 'Modo claro' : 'Modo oscuro'}
      style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'var(--surface-alt)', border: '1px solid var(--border)',
        color: 'var(--muted-strong)', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: 0,
      }}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={16} strokeWidth={1.9}/>
    </button>
  );
}

function Header({ nombre = 'Juan Pablo', subtitle, avatarColor, avatarInicial, onAvatarClick }) {
  const inicial = avatarInicial || (nombre || 'J').charAt(0).toUpperCase();
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
            width: 38, height: 38, borderRadius: '50%',
            background: 'var(--primary-soft)', color: 'var(--primary)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <PlatoMark size={23} variant="simple" strokeWidth={1.6}/>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle/>
          <button onClick={onAvatarClick} aria-label="Mi perfil" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 4px', background: 'transparent', border: 0,
            borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{
              width: 32, height: 32, borderRadius: '50%',
              background: avatarColor || 'var(--primary)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: 12, flexShrink: 0,
            }}>{inicial}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

window.Header = Header;
