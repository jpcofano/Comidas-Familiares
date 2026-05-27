// src/components/WeekStrip.tsx — tira de 7 días sobre Home

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"] as const;
const DAY_LABELS  = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

interface DayItem { letter: string; label: string; n: number }

interface WeekStripProps {
  semanaInicio: string; // "YYYY-MM-DD" (lunes)
  marked?: number[];    // índices 0-6 (lun=0) con comida planeada
}

function getISOWeek(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const jan4 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
}

export function WeekStrip({ semanaInicio, marked = [] }: WeekStripProps) {
  const lunes = new Date(semanaInicio + "T12:00:00");

  const days: DayItem[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return { letter: DAY_LETTERS[i], label: DAY_LABELS[i], n: d.getDate() };
  });

  const weekNumber = getISOWeek(lunes);

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
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-") === todayStr;
  });

  const markedSet = new Set(marked);

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginBottom: 12,
      }}>
        <h1 style={{ margin: 0 }}>Esta semana</h1>
        <span style={{
          fontSize: "var(--fs-xs)", color: "var(--muted)",
          textTransform: "uppercase", letterSpacing: ".06em",
        }}>
          Semana {weekNumber}
        </span>
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
        gap: 4, marginBottom: 16,
      }}>
        {days.map((d, i) => {
          const isToday = i === todayIdx;
          const hasMeal = markedSet.has(i);
          return (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              padding: "8px 0", borderRadius: 10,
              background: isToday ? "var(--primary-soft)" : "transparent",
            }}>
              <span style={{
                fontSize: 10, fontWeight: 500,
                color: isToday ? "var(--primary)" : "var(--muted)",
                textTransform: "uppercase", letterSpacing: ".05em",
              }}>{d.letter}</span>
              <span style={{
                fontSize: 15, fontWeight: isToday ? 700 : 500,
                color: isToday ? "var(--primary)" : "var(--text-strong)",
              }}>{d.n}</span>
              <span style={{
                width: 4, height: 4, borderRadius: "50%",
                background: hasMeal ? (isToday ? "var(--primary)" : "var(--line)") : "transparent",
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
