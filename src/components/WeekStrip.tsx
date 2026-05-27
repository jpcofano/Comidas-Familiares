// src/components/WeekStrip.tsx — tira de 7 días sobre Home
// El título / badge se renderea en el componente padre (HomeJP).
// Días con comida muestran <Plate>; hoy = relleno, otro día = outlined + punto centro.

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"] as const;
const DAY_LABELS  = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

interface DayItem { letter: string; label: string; n: number }

interface WeekStripProps {
  semanaInicio: string; // "YYYY-MM-DD" (lunes)
  marked?: number[];    // índices 0-6 (lun=0) con comida planeada
}

// ── Icono plato ───────────────────────────────────────────────────────────────

function Plate({ size = 12, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      style={{ display: 'block' }}
    >
      <circle
        cx="6" cy="6" r="5"
        stroke="currentColor"
        strokeWidth="1.3"
        fill={filled ? 'currentColor' : 'none'}
      />
      {!filled && <circle cx="6" cy="6" r="2" fill="currentColor" />}
    </svg>
  );
}

export function WeekStrip({ semanaInicio, marked = [] }: WeekStripProps) {
  const lunes = new Date(semanaInicio + "T12:00:00");

  const days: DayItem[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return { letter: DAY_LETTERS[i], label: DAY_LABELS[i], n: d.getDate() };
  });

  const todayStr = (() => {
    const now = new Date();
    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
  })();

  const todayIdx = days.findIndex((_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-") === todayStr;
  });

  const markedSet = new Set(marked);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(7, 1fr)",
      gap: 4,
      marginBottom: 16,
    }}>
      {days.map((d, i) => {
        const isToday = i === todayIdx;
        const hasMeal = markedSet.has(i);
        const accentColor = isToday ? "var(--primary)" : "var(--muted)";

        return (
          <div key={i} style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "8px 0",
            borderRadius: 10,
            background: isToday ? "var(--primary-soft)" : "transparent",
            color: accentColor,
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 500,
              color: isToday ? "var(--primary)" : "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".05em",
            }}>
              {d.letter}
            </span>
            <span style={{
              fontSize: 15,
              fontWeight: isToday ? 700 : 500,
              color: isToday ? "var(--primary)" : "var(--text-strong)",
            }}>
              {d.n}
            </span>
            {hasMeal ? (
              <Plate filled={isToday} size={12} />
            ) : (
              <div style={{ height: 12 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
