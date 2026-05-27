// LoginScreen.jsx — landing/auth screen

function LoginScreen({ onSignIn }) {
  return (
    <div style={{
      minHeight: '100%', display: 'grid', placeItems: 'center',
      padding: 'var(--space-6)', background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: 380, background: 'var(--surface-strong)',
        border: '1px solid var(--border)', borderRadius: 20,
        padding: '32px 24px', textAlign: 'center',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <div aria-hidden style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--primary-soft)', color: 'var(--primary)',
          display: 'grid', placeItems: 'center', marginBottom: 8,
        }}>
          <Icon name="plato-vapor" size={36} strokeWidth={1.6}/>
        </div>
        <h1 style={{ margin: 0 }}>Comida Familiar</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
          Planificación semanal de comidas para la familia Cofano
        </p>
        <Button variant="primary" fullWidth onClick={onSignIn}>
          Entrar con Google
        </Button>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
