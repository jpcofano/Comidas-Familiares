// MemberAvatar.jsx — colored-initial circle per family member.
// Color-aware (E10.2): además de la paleta base, lee colores personalizados que
// cada miembro elige en su Perfil (Lote 10). App publica los colores en el store
// y los avatares se re-renderizan en historial, voto, plan cards y header.

const MEMBER_PALETTE = {
  juanpablo: { bg: '#8a4a2f', fg: '#fff', label: 'JP' },
  juanPablo: { bg: '#8a4a2f', fg: '#fff', label: 'JP' },
  maria:     { bg: '#74324a', fg: '#fff', label: 'M' },
  sofia:     { bg: '#3c4a6e', fg: '#fff', label: 'S' },
  federico:  { bg: '#2e5d2e', fg: '#fff', label: 'F' },
};

// Store mínimo de colores personalizados { key: '#hex' } + pub-sub.
const memberColorStore = {
  colors: {},
  listeners: new Set(),
  set(next) { this.colors = { ...this.colors, ...next }; this.listeners.forEach(fn => fn()); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
};
window.__memberColorStore = memberColorStore;

function useMemberColor(key) {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => memberColorStore.subscribe(force), []);
  return memberColorStore.colors[key];
}

function memberKey(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

function MemberAvatar({ name, size = 22, withName = false }) {
  const key = memberKey(name);
  const m = MEMBER_PALETTE[key] || { bg: 'var(--muted)', fg: '#fff', label: (name || '?').charAt(0).toUpperCase() };
  const custom = useMemberColor(key);
  const bg = custom || m.bg;
  const circle = (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: m.fg,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size <= 22 ? 10 : 11, fontWeight: 600,
      flexShrink: 0, letterSpacing: 0,
      transition: 'background 160ms ease',
    }}>{m.label}</span>
  );
  if (!withName) return circle;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {circle}
      <span style={{ fontSize: 13, color: 'var(--text)' }}>{name}</span>
    </span>
  );
}

function AvatarStack({ names, size = 22, max = 4 }) {
  const shown = names.slice(0, max);
  const overflow = names.length - shown.length;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {shown.map((n, i) => (
        <span key={n + i} style={{ marginLeft: i === 0 ? 0 : -6, border: '2px solid var(--surface-strong)', borderRadius: '50%' }}>
          <MemberAvatar name={n} size={size}/>
        </span>
      ))}
      {overflow > 0 && (
        <span style={{
          marginLeft: -6, width: size, height: size, borderRadius: '50%',
          background: 'var(--surface-alt)', color: 'var(--muted-strong)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, border: '2px solid var(--surface-strong)',
        }}>+{overflow}</span>
      )}
    </span>
  );
}

window.MemberAvatar = MemberAvatar;
window.AvatarStack = AvatarStack;
