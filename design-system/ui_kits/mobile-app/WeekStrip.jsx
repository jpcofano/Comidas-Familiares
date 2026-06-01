// WeekStrip.jsx — 7-day strip. Los días con comida muestran el mismo punto
// relleno que el día de hoy (color primary). Alineado con el git.

function Plate({ size = 12, color = 'var(--primary)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: 'block', color }}>
      <circle cx="6" cy="6" r="5" fill="currentColor"/>
    </svg>
  );
}

function WeekStrip({ days, today, marked }) {
  const defaults = [
    { letter: 'L', label: 'Lun', n: 26 },
    { letter: 'M', label: 'Mar', n: 27 },
    { letter: 'M', label: 'Mié', n: 28 },
    { letter: 'J', label: 'Jue', n: 29 },
    { letter: 'V', label: 'Vie', n: 30 },
    { letter: 'S', label: 'Sáb', n: 31 },
    { letter: 'D', label: 'Dom', n:  1 },
  ];
  const list = days || defaults;
  const markedSet = new Set(marked || []);
  const todayIdx = today ?? 1;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
      {list.map((d, i) => {
        const isToday = i === todayIdx;
        const hasMeal = markedSet.has(i);
        return (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '8px 0', borderRadius: 10,
            background: isToday ? 'var(--primary-soft)' : 'transparent',
            color: isToday ? 'var(--primary)' : 'var(--muted)',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 500,
              color: isToday ? 'var(--primary)' : 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '.05em',
            }}>{d.letter}</span>
            <span style={{
              fontSize: 15, fontWeight: isToday ? 700 : 500,
              color: isToday ? 'var(--primary)' : 'var(--text-strong)',
            }}>{d.n}</span>
            {hasMeal ? <Plate size={16} color="var(--primary)"/> : <div style={{ height: 16 }}/>}
          </div>
        );
      })}
    </div>
  );
}

window.WeekStrip = WeekStrip;
