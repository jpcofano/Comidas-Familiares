// WeekStrip.jsx — 7-day chip strip for "esta semana"

function WeekStrip({ days, today, marked }) {
  // days: ['Lun', 'Mar', ...] or pass undefined to use defaults
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
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
      {list.map((d, i) => {
        const isToday = i === (today ?? 1);
        const hasMeal = markedSet.has(i);
        return (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            padding: '8px 0', borderRadius: 10,
            background: isToday ? 'var(--primary-soft)' : 'transparent',
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
            <span style={{
              width: 4, height: 4, borderRadius: '50%',
              background: hasMeal ? (isToday ? 'var(--primary)' : 'var(--line)') : 'transparent',
            }}/>
          </div>
        );
      })}
    </div>
  );
}

window.WeekStrip = WeekStrip;
