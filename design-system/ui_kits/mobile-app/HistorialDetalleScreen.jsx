// HistorialDetalleScreen.jsx — read-only view of a single Historial entry

function HistorialDetalleScreen({ entry, onBack, onVerReceta }) {
  const calif = entry.calificaciones || {};
  const comm  = entry.comentarios   || {};
  const ids   = Object.keys(calif);

  return (
    <>
      <VotoHeader title={entry.nombreSeleccion} onBack={onBack}/>

      {/* Hero score */}
      <div style={{
        textAlign: 'center', padding: '20px 16px',
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, marginBottom: 12,
      }}>
        <p style={{
          margin: 0, fontSize: 36, fontWeight: 700, color: 'var(--primary)',
          letterSpacing: '-0.02em',
        }}>
          {entry.promedio.toFixed(1)}
          <span style={{ fontSize: 18, color: 'var(--muted)', fontWeight: 400 }}> / 10</span>
        </p>
        {entry.resultado && (
          <div style={{ marginTop: 8 }}>
            <ResultadoBadge resultado={entry.resultado}/>
          </div>
        )}
        <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--muted)' }}>
          {entry.fechaRealizada}{entry.ocasion ? ` · ${entry.ocasion}` : ''}
        </p>
      </div>

      {/* Calificaciones por miembro */}
      <div style={{
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 12,
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
          Calificaciones
        </p>
        {ids.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Sin votos registrados.</p>
        ) : ids.map((id, idx) => {
          const v = calif[id];
          const c = comm[id];
          return (
            <div key={id} style={{
              paddingBottom: 10, marginBottom: 10,
              borderBottom: idx === ids.length - 1 ? 'none' : '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <MemberAvatar name={id} size={22}/>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{NOMBRES_MIEMBROS[id] || id}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
                  {v} / 10
                </span>
              </div>
              {c && (
                <p style={{
                  margin: '6px 0 0 30px', fontSize: 12, color: 'var(--muted)',
                  fontStyle: 'italic', lineHeight: 1.4,
                }}>“{c}”</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Notas del cocinero (opcional) */}
      {(entry.queSalioBien || entry.queCambiaria || entry.notasFamiliares || entry.repetir || entry.costoRealAprox || entry.dificultadReal) && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 12,
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
            Notas del cocinero
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entry.repetir && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>¿Repetir?</strong> {entry.repetir}
              </p>
            )}
            {entry.dificultadReal && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Dificultad real:</strong> {entry.dificultadReal}
              </p>
            )}
            {entry.costoRealAprox && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Costo aprox.:</strong> {entry.costoRealAprox}
              </p>
            )}
            {entry.queSalioBien && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text)' }}>Qué salió bien:</strong> {entry.queSalioBien}
              </p>
            )}
            {entry.queCambiaria && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text)' }}>Qué cambiaría:</strong> {entry.queCambiaria}
              </p>
            )}
            {entry.notasFamiliares && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>
                <strong style={{ color: 'var(--text)' }}>Notas para la familia:</strong> {entry.notasFamiliares}
              </p>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {onVerReceta && entry.idReceta && (
          <Button variant="secondary" fullWidth onClick={() => onVerReceta(entry.idReceta)}>
            Ver receta
          </Button>
        )}
        <Button variant="secondary" fullWidth onClick={onBack}>Volver</Button>
      </div>
    </>
  );
}

window.HistorialDetalleScreen = HistorialDetalleScreen;
