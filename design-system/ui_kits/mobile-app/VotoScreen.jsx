// VotoScreen.jsx — rate a cooked plan (1-10) + JP-only datos de cocción
// + read-only VistaEvaluada when plan.estado === 'Evaluada'

const NOMBRES_MIEMBROS = {
  juanpablo: 'Juan Pablo',
  maria: 'María',
  sofia: 'Sofía',
  federico: 'Federico',
};

const OCASIONES = ['Cena familiar', 'Con invitados', 'Cumpleaños', 'Celebración', 'Otra'];
const DIFICULTADES = ['Baja', 'Media', 'Media-alta', 'Alta'];

function resultadoTextual(promedio) {
  if (promedio >= 9)   return 'Excelente';
  if (promedio >= 7.5) return 'Muy bueno';
  if (promedio >= 6)   return 'Bueno';
  if (promedio >= 4)   return 'Regular';
  return 'Malísimo';
}

// ─── Progreso de votos ────────────────────────────────────────────────────────

function VotoProgress({ asignaciones, votos }) {
  const ids = asignaciones && asignaciones.length ? asignaciones : ['juanpablo', 'maria', 'sofia', 'federico'];
  return (
    <div style={{
      background: 'var(--surface-strong)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '12px 16px',
    }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
        Votos recibidos
      </p>
      {ids.map(id => {
        const ya = votos && votos[id] != null;
        return (
          <div key={id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 0', borderBottom: '1px solid var(--border-subtle)',
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <MemberAvatar name={id} size={20}/>
              <span style={{ fontSize: 13 }}>{NOMBRES_MIEMBROS[id] || id}</span>
            </span>
            {ya ? (
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: 'var(--ok-text)', background: 'var(--ok-bg)',
                padding: '2px 8px', borderRadius: 9999,
              }}>{votos[id]} / 10</span>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Pendiente</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── BackHeader (compartido entre vistas) ────────────────────────────────────

function VotoHeader({ title, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
      <button
        onClick={onBack}
        aria-label="Volver"
        style={{
          background: 'transparent', border: 0, padding: 4, cursor: 'pointer',
          color: 'var(--text-strong)', display: 'flex',
        }}
      >
        <Icon name="chevron-left" size={22}/>
      </button>
      <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-strong)', fontSize: 15 }}>{title}</p>
    </div>
  );
}

// ─── Vista evaluada (read-only) ──────────────────────────────────────────────

function VistaEvaluada({ plan, onBack }) {
  const votosArr = Object.values(plan.votos || {}).filter(v => v != null);
  const promedio = votosArr.length
    ? votosArr.reduce((a, b) => a + b, 0) / votosArr.length
    : 0;
  const resultado = plan.resultado || resultadoTextual(promedio);

  return (
    <>
      <VotoHeader title={`Resultado — ${plan.nombre}`} onBack={onBack}/>

      <div style={{
        textAlign: 'center', padding: '20px 16px',
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, marginBottom: 12,
      }}>
        <p style={{
          margin: 0, fontSize: 36, fontWeight: 700, color: 'var(--primary)',
          letterSpacing: '-0.02em',
        }}>{promedio.toFixed(1)} <span style={{ fontSize: 18, color: 'var(--muted)' }}>/ 10</span></p>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>{resultado}</p>
      </div>

      <div style={{
        background: 'var(--surface-strong)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 12,
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
          Calificaciones
        </p>
        {(plan.asignaciones || Object.keys(plan.votos || {})).map(id => {
          const v = plan.votos?.[id];
          const c = plan.comentarios?.[id];
          if (v == null) return null;
          return (
            <div key={id} style={{
              paddingBottom: 10, marginBottom: 10,
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <MemberAvatar name={id} size={20}/>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{NOMBRES_MIEMBROS[id] || id}</span>
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
                  {v} / 10
                </span>
              </div>
              {c && (
                <p style={{
                  margin: '6px 0 0', fontSize: 12, color: 'var(--muted)',
                  fontStyle: 'italic', lineHeight: 1.4,
                }}>“{c}”</p>
              )}
            </div>
          );
        })}
      </div>

      {plan.datosCocinero && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 12,
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
            Notas del cocinero
          </p>
          {plan.datosCocinero.ocasion && (
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Ocasión:</strong> {plan.datosCocinero.ocasion}
            </p>
          )}
          {plan.datosCocinero.repetir && (
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>¿La repetirías?</strong> {plan.datosCocinero.repetir}
            </p>
          )}
          {plan.datosCocinero.queSalioBien && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Qué salió bien:</strong> {plan.datosCocinero.queSalioBien}
            </p>
          )}
          {plan.datosCocinero.queCambiaria && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>Qué cambiaría:</strong> {plan.datosCocinero.queCambiaria}
            </p>
          )}
        </div>
      )}

      <Button variant="secondary" fullWidth onClick={onBack}>Volver</Button>
    </>
  );
}

// ─── Pantalla de votación (estado Cocinada) ──────────────────────────────────

function VotoScreen({ plan, miembroId, isJP, onBack, onGuardar }) {
  if (plan.estado === 'Evaluada') {
    return <VistaEvaluada plan={plan} onBack={onBack}/>;
  }

  const votoExistente = plan.votos?.[miembroId] ?? null;
  const comentarioExistente = plan.comentarios?.[miembroId] || '';

  const [puntaje, setPuntaje] = React.useState(votoExistente);
  const [comentario, setComentario] = React.useState(comentarioExistente);
  const [datos, setDatos] = React.useState(plan.datosCocinero || {
    ocasion: '', repetir: '', costoRealAprox: '', dificultadReal: '',
    queSalioBien: '', queCambiaria: '', notasFamiliares: '',
  });
  const [confirmando, setConfirmando] = React.useState(false);

  function setDato(k, v) { setDatos(p => ({ ...p, [k]: v })); }

  const fieldStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    borderRadius: 8, border: '1px solid var(--border)',
    background: 'var(--surface-strong)', color: 'var(--text)',
    fontSize: 13, fontFamily: 'inherit', resize: 'vertical',
  };
  const labelStyle = {
    display: 'block', marginBottom: 4,
    fontSize: 12, color: 'var(--muted)', fontWeight: 500,
  };

  return (
    <>
      <VotoHeader title={`Evaluar — ${plan.nombre}`} onBack={onBack}/>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <VotoProgress asignaciones={plan.asignaciones} votos={plan.votos}/>

        {/* Puntaje */}
        <div style={{
          background: 'var(--surface-strong)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
            Tu puntaje (1–10)
          </p>
          <SelectorPuntaje valor={puntaje} onChange={setPuntaje}/>
          {puntaje !== null && (
            <p style={{
              margin: '10px 0 0', textAlign: 'center',
              fontSize: 13, color: 'var(--muted)',
            }}>
              <strong style={{ color: 'var(--primary)' }}>{puntaje}</strong> / 10 — {resultadoTextual(puntaje)}
            </p>
          )}
        </div>

        {/* Comentario */}
        <div style={{
          background: 'var(--surface-strong)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
            Comentario <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional)</span>
          </p>
          <textarea
            value={comentario}
            onChange={e => setComentario(e.target.value)}
            placeholder="¿Qué te pareció?"
            rows={3}
            style={fieldStyle}
          />
        </div>

        {/* Datos de la cocción — solo JP */}
        {isJP && (
          <div style={{
            background: 'var(--surface-strong)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 500, color: 'var(--text-strong)' }}>
              Datos de la cocción
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Ocasión</label>
              <select value={datos.ocasion} onChange={e => setDato('ocasion', e.target.value)} style={fieldStyle}>
                <option value="">— Sin especificar —</option>
                {OCASIONES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>¿La repetirías?</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['Sí', 'No', ''].map(v => {
                  const active = datos.repetir === v;
                  return (
                    <button
                      key={v || 'nd'} type="button"
                      onClick={() => setDato('repetir', v)}
                      style={{
                        flex: 1, padding: '8px 10px', borderRadius: 8,
                        border: active ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: active ? 'var(--primary)' : 'var(--surface-strong)',
                        color: active ? '#fff' : 'var(--text)',
                        fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                        fontWeight: active ? 600 : 500,
                      }}
                    >{v || 'NS/NC'}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Dificultad real</label>
                <select value={datos.dificultadReal} onChange={e => setDato('dificultadReal', e.target.value)} style={fieldStyle}>
                  <option value="">—</option>
                  {DIFICULTADES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Costo aprox.</label>
                <input
                  type="text" placeholder="$8.000"
                  value={datos.costoRealAprox}
                  onChange={e => setDato('costoRealAprox', e.target.value)}
                  style={fieldStyle}
                />
              </div>
            </div>

            {[
              ['queSalioBien',    '¿Qué salió bien?'],
              ['queCambiaria',    '¿Qué cambiarías?'],
              ['notasFamiliares', 'Notas para la familia'],
            ].map(([k, label]) => (
              <div key={k} style={{ marginBottom: 10 }}>
                <label style={labelStyle}>{label}</label>
                <textarea
                  value={datos[k] || ''}
                  onChange={e => setDato(k, e.target.value)}
                  rows={2}
                  style={fieldStyle}
                />
              </div>
            ))}
          </div>
        )}

        {/* Acción */}
        {confirmando ? (
          <div style={{
            background: 'var(--surface-strong)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '14px 16px',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
              ¿Confirmás tu voto?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="primary" fullWidth onClick={() => onGuardar({ puntaje, comentario, datos })}>
                Sí, guardar
              </Button>
              <Button variant="secondary" fullWidth onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary" fullWidth
            disabled={puntaje === null}
            onClick={() => setConfirmando(true)}
          >
            Guardar voto
          </Button>
        )}

        {isJP && (
          <Button variant="secondary" fullWidth>
            Cerrar evaluación ahora
          </Button>
        )}
      </div>
    </>
  );
}

window.VotoScreen = VotoScreen;
window.VistaEvaluada = VistaEvaluada;
