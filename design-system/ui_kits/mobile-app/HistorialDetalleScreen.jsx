// HistorialDetalleScreen.jsx — read-only view of a single Historial entry

// Estrellas (escala 0–10 → 5 estrellas). Dorado cálido, coherente con la paleta.
const ESTRELLA_COLOR = 'oklch(0.76 0.14 78)';
function Estrellas({ value, size = 13 }) {
  const max = 5;
  const norm = (value / 10) * max;
  return (
    <span style={{ display: 'inline-flex', gap: 1, alignItems: 'center' }} aria-label={`${value} de 10`}>
      {Array.from({ length: max }, (_, i) => {
        const full = i + 1 <= norm;
        const half = !full && i + 0.5 <= norm;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
            <polygon
              points="12,2 15,9 22,9.3 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.3 9,9"
              fill={ESTRELLA_COLOR}
              opacity={full ? 1 : half ? 0.5 : 0.2}
            />
          </svg>
        );
      })}
    </span>
  );
}

function FotoDelPlato() {
  const [foto, setFoto] = React.useState(null);
  const inputRef = React.useRef(null);

  function pick(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFoto(URL.createObjectURL(f));
    e.target.value = '';
  }

  return (
    <div style={{
      background: 'var(--surface-strong)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '14px 16px', marginBottom: 12,
    }}>
      <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
        Foto del plato
      </p>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick}/>

      {foto ? (
        <>
          <img src={foto} alt="Foto del plato" style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block', marginBottom: 12 }}/>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => inputRef.current?.click()}>Cambiar foto</Button>
            <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => setFoto(null)}>Quitar foto</Button>
          </div>
        </>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            width: '100%', padding: '28px 16px', borderRadius: 'var(--radius-md)',
            border: '1.5px dashed var(--line)', background: 'var(--surface-alt)',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            color: 'var(--muted)',
          }}
        >
          <Icon name="upload" size={22}/>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Agregar foto del plato</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>JPG o PNG</span>
        </button>
      )}
    </div>
  );
}

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
        </p>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
          <Estrellas value={entry.promedio} size={16}/>
        </div>
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
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <Estrellas value={v} size={13}/>
                  <span style={{
                    fontSize: 18, fontWeight: 700, color: 'var(--text-strong)',
                    fontVariantNumeric: 'tabular-nums', minWidth: 20, textAlign: 'right',
                  }}>{v}</span>
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

      {/* Foto del plato */}
      <FotoDelPlato/>

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
