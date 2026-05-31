export function SkeletonPlanCard() {
  return (
    <div style={{
      padding: 14,
      border: "1px solid var(--border)",
      borderRadius: 14,
      marginBottom: "var(--space-3)",
    }}>
      <div className="sk" style={{ height: 10, width: "40%", marginBottom: 10 }} />
      <div className="sk" style={{ height: 18, width: "75%", marginBottom: 8 }} />
      <div className="sk" style={{ height: 12, width: "50%", marginBottom: 14 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <div className="sk" style={{ height: 32, flex: 1, borderRadius: 10 }} />
        <div className="sk" style={{ height: 32, flex: 1, borderRadius: 10 }} />
      </div>
    </div>
  );
}
