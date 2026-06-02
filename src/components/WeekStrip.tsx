// src/components/WeekStrip.tsx — tira de 7 días.
//
// Modo JP (props originales): semanaInicio + marked[] → plato relleno primary.
// Modo miembro (props opcionales): misDias + diasConComida + memberColor →
//   - misDias → plato relleno en memberColor (hoy: pastilla memberColor + texto blanco)
//   - diasConComida \ misDias → punto neutro chico (var(--border))
//   - leyenda debajo si showLegend=true

const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"] as const;
const DAY_LABELS  = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

interface DayItem { letter: string; label: string; n: number }

interface WeekStripProps {
  semanaInicio: string;   // "YYYY-MM-DD" (lunes)
  marked?: number[];      // modo JP: índices 0-6 con comida (legacy)
  // ── Modo miembro ──
  misDias?: Set<number>;        // mis días de cocina → plato memberColor
  diasConComida?: Set<number>;  // todos los días con plan → punto neutro si no es mío
  memberColor?: string;         // p.ej. "var(--member-maria)"
  showLegend?: boolean;
}

function Plate({ size = 12, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" style={{ display: "block" }}>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" fill={filled ? "currentColor" : "none"} />
      {!filled && <circle cx="6" cy="6" r="2" fill="currentColor" />}
    </svg>
  );
}

function NeutralDot() {
  return (
    <div style={{ height: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--border)" }} />
    </div>
  );
}

export function WeekStrip({
  semanaInicio,
  marked = [],
  misDias,
  diasConComida,
  memberColor,
  showLegend = false,
}: WeekStripProps) {
  const memberMode = misDias !== undefined && diasConComida !== undefined;
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
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {days.map((d, i) => {
          const isToday = i === todayIdx;

          // ── Modo miembro ───────────────────────────────────────────────────
          if (memberMode) {
            const esMioDia  = misDias!.has(i);
            const hayComida = diasConComida!.has(i);
            const accentColor = memberColor ?? "var(--primary)";

            const bgColor   = isToday && esMioDia  ? accentColor
                            : isToday && hayComida ? "var(--primary-soft)"
                            : isToday              ? "var(--primary-soft)"
                            : "transparent";
            const letterCol = isToday && esMioDia  ? "rgba(255,255,255,.8)"
                            : isToday              ? "var(--primary)"
                            : "var(--muted)";
            const numCol    = isToday && esMioDia  ? "#fff"
                            : isToday              ? "var(--primary)"
                            : "var(--text-strong)";
            const dotColor  = esMioDia ? accentColor : "var(--muted)";

            return (
              <div key={i} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 4, padding: "8px 0", borderRadius: 10, background: bgColor,
              }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: letterCol, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  {d.letter}
                </span>
                <span style={{ fontSize: 15, fontWeight: isToday ? 700 : 500, color: numCol }}>
                  {d.n}
                </span>
                {esMioDia ? (
                  <span style={{ color: dotColor }}><Plate filled size={12} /></span>
                ) : hayComida ? (
                  <NeutralDot />
                ) : (
                  <div style={{ height: 12 }} />
                )}
              </div>
            );
          }

          // ── Modo JP (legacy) ───────────────────────────────────────────────
          const hasMeal = markedSet.has(i);
          const accentColor = isToday ? "var(--primary)" : "var(--muted)";
          return (
            <div key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 4, padding: "8px 0", borderRadius: 10,
              background: isToday ? "var(--primary-soft)" : "transparent",
              color: accentColor,
            }}>
              <span style={{ fontSize: 10, fontWeight: 500, color: isToday ? "var(--primary)" : "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {d.letter}
              </span>
              <span style={{ fontSize: 15, fontWeight: isToday ? 700 : 500, color: isToday ? "var(--primary)" : "var(--text-strong)" }}>
                {d.n}
              </span>
              {hasMeal ? (
                <span style={{ color: "var(--primary)" }}><Plate filled={hasMeal} size={12} /></span>
              ) : (
                <div style={{ height: 12 }} />
              )}
            </div>
          );
        })}
      </div>

      {showLegend && memberMode && (
        <div style={{
          marginTop: 10, paddingTop: 8,
          borderTop: "1px solid var(--border-subtle)",
          display: "flex", gap: "var(--space-4)", justifyContent: "center",
        }}>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: memberColor ?? "var(--primary)", lineHeight: 1 }}>●</span> Cocinás vos
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: "var(--border)", lineHeight: 1 }}>●</span> Hay comida
          </span>
        </div>
      )}
    </div>
  );
}
