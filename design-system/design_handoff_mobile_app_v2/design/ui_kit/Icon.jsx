// Icon.jsx — inline-SVG version of the lucide icons we use.
// Replaces <i data-lucide> + lucide.createIcons() to avoid DOM mutation
// fighting React's reconciler (the bug the verifier caught).

const ICON_PATHS = {
  'home':          <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  'book-open':     <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>,
  'shopping-bag':  <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>,
  'history':       <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></>,
  'clock':         <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  'plus':          <><path d="M5 12h14"/><path d="M12 5v14"/></>,
  'chevron-left':  <path d="m15 18-6-6 6-6"/>,
  'chevron-right': <path d="m9 18 6-6-6-6"/>,
  'chevron-down':  <path d="m6 9 6 6 6-6"/>,
  'log-out':       <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  'chef-hat':      <><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/></>,
};

function Icon({ name, size = 20, strokeWidth = 2, style = {} }) {
  const children = ICON_PATHS[name];
  if (!children) return null;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

window.Icon = Icon;
