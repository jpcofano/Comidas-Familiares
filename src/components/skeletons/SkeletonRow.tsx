export function SkeletonRow() {
  return (
    <div className="sk-row" style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "10px 0", borderBottom: "1px solid var(--border-subtle)",
    }}>
      <div className="sk sk-circle" style={{ width: 32, height: 32, flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <div className="sk" style={{ height: 12, width: "60%" }} />
        <div className="sk" style={{ height: 10, width: "40%" }} />
      </div>
    </div>
  );
}
