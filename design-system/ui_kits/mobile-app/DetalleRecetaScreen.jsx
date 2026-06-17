// DetalleRecetaScreen.jsx — recipe detail, synced forward to match the live app:
// meta cards · plan actions (JP) · pills · góndola-grouped ingredients ·
// step preview with risk banner + punto clave/error común · cook's tip ·
// sticky "Empezar a cocinar". Actions fire a toast (window.__toast).

function BackBar({ tipo, onBack }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
      <button onClick={onBack} aria-label="Volver" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 0, color: 'var(--muted)',
        cursor: 'pointer', padding: 4, fontFamily: 'inherit',
      }}>
        <Icon name="chevron-left" size={20}/>
      </button>
      {tipo && <span style={{ fontSize: 13, color: 'var(--muted)' }}>{tipo}</span>}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 var(--space-3)' }}>
      {children}
    </h2>
  );
}

function DetalleCard({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface-strong)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 18px', marginBottom: 12, ...style,
    }}>{children}</div>
  );
}

const RECETA_COCINAS = [
  'Argentina', 'Italiana', 'Española', 'Francesa', 'Mediterránea',
  'China', 'Japonesa', 'Coreana', 'Tailandesa', 'India', 'Mexicana',
  'Peruana', 'Árabe / Medio Oriente', 'Estadounidense', 'Otra',
];
const RECETA_ESCENARIOS = ['Noche de a dos', 'Cocina rápida', 'Cena Especial', 'Celebración'];
const RECETA_PROTEINAS = ['Vacuna', 'Cerdo', 'Cordero', 'Aves', 'Pescado', 'Mariscos', 'Huevos', 'Legumbres', 'Semillas', 'Frutos secos', 'Vegetal'];
const RECETA_DIFICULTADES = ['Baja', 'Media', 'Media-alta', 'Alta'];
const RECETA_COSTOS = ['Bajo', 'Medio', 'Medio/Alto', 'Alto'];
const RECETA_NOCHE = ['Sí', 'No', 'Adaptable'];

function clasifField(label, value, setValue, options, placeholder) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</label>
      <select value={value || ''} onChange={e => setValue(e.target.value)} style={{
        width: '100%', padding: '9px 10px', fontSize: 13, borderRadius: 8,
        border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
        fontFamily: 'inherit', boxSizing: 'border-box',
      }}>
        <option value="">{placeholder || '—'}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Editor de clasificación (bottom-sheet, JP) ──────────────────────────────
function RecetaClasifSheet({ receta, onGuardar, onClose }) {
  const [cocina, setCocina] = React.useState(receta.cocina || '');
  const [escenarioUso, setEscenario] = React.useState(receta.escenarioUso || '');
  const [estilo, setEstilo] = React.useState(receta.estilo || '');
  const [proteina, setProteina] = React.useState(receta.proteina || '');
  const [dificultad, setDificultad] = React.useState(receta.dificultad || '');
  const [costo, setCosto] = React.useState(receta.costoEstimado || '');
  const [noche, setNoche] = React.useState(receta.aptoNocheDeADos || '');
  const [sinLacteos, setSinLacteos] = React.useState(!!receta.sinLacteos);
  const [sinHidratos, setSinHidratos] = React.useState(!!receta.sinHidratos);

  function handleGuardar() {
    onGuardar({
      ...receta,
      cocina: cocina || undefined,
      escenarioUso: escenarioUso || receta.escenarioUso,
      estilo: estilo || receta.estilo,
      proteina: proteina || receta.proteina,
      dificultad: dificultad || receta.dificultad,
      costoEstimado: costo || receta.costoEstimado,
      aptoNocheDeADos: noche || receta.aptoNocheDeADos,
      sinLacteos, sinHidratos,
    });
    window.__toast?.(`Clasificación de "${receta.nombre}" actualizada.`, true);
    onClose();
  }

  const toggle = (on, set, label) => (
    <button type="button" onClick={() => set(!on)} style={{
      flex: 1, padding: '9px 8px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
      border: '1px solid ' + (on ? 'var(--primary)' : 'var(--border)'),
      background: on ? 'var(--primary)' : 'var(--surface-strong)',
      color: on ? '#fff' : 'var(--text)', fontFamily: 'inherit',
    }}>{label}</button>
  );

  const overlay = (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 70,
      background: 'rgba(0,0,0,0.45)', animation: 'cf-fade-in 160ms ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%', overflowY: 'auto',
        background: 'var(--bg)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '8px 18px 22px', boxShadow: '0 -8px 24px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 12px' }}>
          <span style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--line)' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>Editar clasificación</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--surface-alt)', border: 0, color: 'var(--muted-strong)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="x" size={16}/></button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--muted)' }}>{receta.nombre}</p>

        {clasifField('Cocina de origen', cocina, setCocina, RECETA_COCINAS, 'Sin clasificar')}
        {clasifField('Escenario de uso', escenarioUso, setEscenario, RECETA_ESCENARIOS)}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Estilo</label>
          <input type="text" value={estilo} onChange={e => setEstilo(e.target.value)} placeholder="Ej. De olla, mediterráneo…" style={{
            width: '100%', padding: '9px 10px', fontSize: 13, borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}/>
        </div>
        {clasifField('Proteína principal', proteina, setProteina, RECETA_PROTEINAS)}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>{clasifField('Dificultad', dificultad, setDificultad, RECETA_DIFICULTADES)}</div>
          <div style={{ flex: 1 }}>{clasifField('Costo', costo, setCosto, RECETA_COSTOS)}</div>
        </div>
        {clasifField('Apto noche de a dos', noche, setNoche, RECETA_NOCHE)}

        <p style={{ margin: '4px 0 6px', fontSize: 11, color: 'var(--muted)' }}>Dieta</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {toggle(sinLacteos, setSinLacteos, 'Sin lácteos')}
          {toggle(sinHidratos, setSinHidratos, 'Sin hidratos')}
        </div>

        <Button variant="primary" onClick={handleGuardar} style={{ width: '100%' }}>Guardar clasificación</Button>
      </div>
    </div>
  );
  const mount = document.getElementById('device-stage') || document.body;
  return ReactDOM.createPortal(overlay, mount);
}

function DetalleRecetaScreen({ receta, isJP, catalogo = [], mostrarSubs = true, subsEstilo = 'inline', macrosLayout = 'estrella', puedeCocinar = true, onBack, onCocinar, onElegirComoEspecial, onSumarExtra, onGuardarReceta }) {
  const [editandoClasif, setEditandoClasif] = React.useState(false);
  const [loadingAccion, setLoadingAccion] = React.useState(null);

  const ingredientes = receta.ingredientesDet || [];
  const pasos = receta.pasos || [];

  function handleAccion(key) {
    setLoadingAccion(key);
    setTimeout(() => {
      setLoadingAccion(null);
      if (key === 'especial') {
        window.__toast?.(`"${receta.nombre}" agregada como Especial.`, true);
        onElegirComoEspecial?.();
      } else if (key === 'extra') {
        window.__toast?.(`"${receta.nombre}" sumada como Especial extra.`, true);
        onSumarExtra?.();
      } else {
        window.__toast?.(`"${receta.nombre}" sumada como En proceso.`, true);
      }
    }, 700);
  }

  const acciones = [
    { key: 'especial',  label: 'Elegir como Especial',      puede: true },
    { key: 'extra',     label: 'Sumar como Especial extra',  puede: true },
    { key: 'enproceso', label: 'Sumar como En proceso',      puede: true },
  ];

  return (
    <div>
      <BackBar tipo={receta.tipo} onBack={onBack}/>

      {/* Título + por qué especial */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.2, letterSpacing: '-.02em', margin: '0 0 var(--space-2)', flex: 1 }}>
            {receta.nombre}
          </h1>
          {isJP && (
            <button onClick={() => setEditandoClasif(true)} aria-label="Editar clasificación" style={{
              flexShrink: 0, marginTop: 2, display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 11px', background: 'var(--surface-strong)', border: '1px solid var(--border)',
              borderRadius: 9999, color: 'var(--text-strong)', fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <Icon name="pencil" size={13}/>Editar
            </button>
          )}
        </div>
        {receta.porQueEspecial && (
          <p style={{ fontSize: 13, color: 'var(--muted-strong)', fontStyle: 'italic', margin: 0, lineHeight: 1.5 }}>
            {receta.porQueEspecial}
          </p>
        )}
      </div>

      {/* Meta cards */}
      <MetaCards
        tiempoTotalLabel={receta.tiempoTotalLabel || receta.tiempo}
        tiempoActivoLabel={receta.tiempoActivoLabel}
        porcionesLabel={receta.porcionesLabel}
        dificultad={receta.dificultad}
      />

      {/* Acciones de plan (solo JP) */}
      {isJP && (
        <AccionesPlan acciones={acciones} loadingAccion={loadingAccion} onAccion={handleAccion}/>
      )}

      {/* Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 'var(--space-5)' }}>
        {receta.cocina
          ? <RecetaPill label={receta.cocina} icon="globe" variant="accent"/>
          : isJP && (
            <button onClick={() => setEditandoClasif(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
              borderRadius: 9999, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: 'var(--warn-bg)', color: 'var(--warn-text)', border: '1px dashed var(--warn-line)',
            }}>
              <Icon name="globe" size={12}/>Sin clasificar · completar
            </button>
          )}
        {receta.proteina    && <RecetaPill label={receta.proteina} variant="accent"/>}
        {receta.escenarioUso && <RecetaPill label={receta.escenarioUso}/>}
        {receta.estilo      && <RecetaPill label={receta.estilo}/>}
        {receta.costoEstimado && <RecetaPill label={`Costo ${receta.costoEstimado}`}/>}
        {receta.sinLacteos  && <RecetaPill label="Sin lácteos" variant="ok"/>}
        {receta.sinHidratos && <RecetaPill label="Sin hidratos" variant="info"/>}
        {receta.aptoNocheDeADos === 'Sí' && <RecetaPill label="Noche de a dos ✓" variant="info"/>}
      </div>

      {/* Macros estimadas por porción (E11.3) */}
      <MacrosCard macros={receta.macros} layout={macrosLayout}/>

      {/* Ingredientes */}
      {ingredientes.length > 0 && (
        <DetalleCard>
          <SectionTitle>Ingredientes</SectionTitle>
          <IngredientesPorGondola ingredientes={ingredientes} catalogo={catalogo} mostrarSubs={mostrarSubs} subsEstilo={subsEstilo}/>
        </DetalleCard>
      )}

      {/* Preparación */}
      {pasos.length > 0 && (
        <DetalleCard>
          <SectionTitle>Preparación</SectionTitle>
          <PasosPreview pasos={pasos} riesgos={receta.riesgos}/>
        </DetalleCard>
      )}

      {/* Tip del cocinero */}
      {receta.notasCocinero && (
        <DetalleCard>
          <SectionTitle>Tip del cocinero</SectionTitle>
          <p style={{ fontSize: 13, color: 'var(--muted-strong)', fontStyle: 'italic', margin: 0, lineHeight: 1.55 }}>
            {receta.notasCocinero}
          </p>
        </DetalleCard>
      )}

      {/* Estado vacío si la receta no tiene contenido cargado */}
      {ingredientes.length === 0 && pasos.length === 0 && (
        <DetalleCard style={{ textAlign: 'center', padding: '32px 20px' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            Esta receta todavía no tiene ingredientes ni pasos cargados.
          </p>
        </DetalleCard>
      )}

      {/* Sticky cocinar — solo cuando hay un plan asignado para cocinar.
         En “Mis recetas” (exploración) el miembro no lo ve; cocina desde Mi semana. */}
      {puedeCocinar && <CocinarSticky onClick={onCocinar}/>}

      {editandoClasif && (
        <RecetaClasifSheet
          receta={receta}
          onGuardar={(upd) => onGuardarReceta?.(upd)}
          onClose={() => setEditandoClasif(false)}
        />
      )}
    </div>
  );
}

window.DetalleRecetaScreen = DetalleRecetaScreen;
