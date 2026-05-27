// Buttons.jsx — primary / secondary / ghost button + icon variants

function Button({ variant = 'primary', size = 'md', children, onClick, disabled, fullWidth, style = {} }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, border: 0, borderRadius: 10,
    fontWeight: 500, fontFamily: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 120ms ease, color 120ms ease, transform 120ms ease',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };
  const sizes = {
    sm: { minHeight: 30, padding: '4px 10px', fontSize: 12 },
    md: { minHeight: 40, padding: '8px 16px', fontSize: 14 },
    lg: { minHeight: 44, padding: '10px 20px', fontSize: 15 },
  };
  const variants = {
    primary:   { background: 'var(--primary)',        color: 'var(--on-primary)' },
    secondary: { background: 'var(--surface-strong)', color: 'var(--text)', border: '1px solid var(--line)' },
    ghost:     { background: 'transparent',           color: 'var(--text)' },
    danger:    { background: 'transparent',           color: 'var(--err-text)' },
  };
  const [pressed, setPressed] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        ...base, ...sizes[size], ...variants[variant],
        transform: pressed && !disabled ? 'scale(0.97)' : 'scale(1)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

window.Button = Button;
