// CatalogoIngredientesScreen.jsx — browsable + editable ingredient catalog.
// Search + góndola filter · grouped by góndola with letter-chips ·
// every ingredient is editable via a bottom-sheet editor (JP) · ambiguous
// imports surface in a "Por completar" section · add new ingredient.

const CATEGORIAS_ING = [
  'Verdura', 'Fruta', 'Carne', 'Pescado y marisco', 'Huevo', 'Lacteo',
  'Fiambre y embutido', 'Cereal y derivado', 'Legumbre', 'Semilla y fruto seco',
  'Hierba y especia', 'Condimento y aderezo', 'Aceite y grasa', 'Endulzante',
  'Caldo y fondo', 'Despensa varios', 'Utensilio',
];
const ROLES_ING = ['Proteina', 'Hidrato', 'Grasa', 'Fibra/Vegetal', 'Azucar/Dulce', 'Neutro'];
const GONDOLAS_ING = ['Verdulería', 'Carnicería', 'Pescadería', 'Fiambrería', 'Lácteos', 'Almacén', 'Panadería', 'Despensa / otros'];
const ORDEN_GONDOLA_ING = GONDOLAS_ING;

function GondolaChip({ gondola, size = 24 }) {
  const meta = (window.seccionMeta ? window.seccionMeta(gondola) : { letra: (gondola || '·').charAt(0), color: 'var(--muted-strong)' });
  return (
    <span style={{
      width: size, height: size, borderRadius: 7, flexShrink: 0,
      background: meta.color, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: '#fff', fontSize: size * 0.46, fontWeight: 700, lineHeight: 1,
    }}>{meta.letra}</span>
  );
}

function RolPill({ children }) {
  return (
    <span style={{
      fontSize: 11, padding: '1px 8px', borderRadius: 9999,
      background: 'var(--surface-alt)', color: 'var(--muted-strong)',
    }}>{children}</span>
  );
}

const ingSelectStyle = {
  width: '100%', padding: '9px 10px', fontSize: 13, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
  fontFamily: 'inherit', boxSizing: 'border-box',
};
const ingLabelStyle = { display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 };

// ─── Shared field group (used by inline editor + modal) ──────────────────────

function CamposIngrediente({ nombre, setNombre, categoria, setCategoria, gondola, setGondola, roles, toggleRol, showNombre }) {
  return (
    <>
      {showNombre && (
        <div style={{ marginBottom: 12 }}>
          <label style={ingLabelStyle}>Nombre</label>
          <input
            type="text" value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Ej. Pimentón ahumado"
            style={{ ...ingSelectStyle, background: 'var(--surface)' }}
          />
        </div>
      )}

      <label style={ingLabelStyle}>Categoría <span style={{ opacity: 0.7 }}>(qué ES)</span></label>
      <select value={categoria} onChange={e => setCategoria(e.target.value)} style={{ ...ingSelectStyle, marginBottom: 12 }}>
        {CATEGORIAS_ING.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <label style={ingLabelStyle}>Sección de góndola <span style={{ opacity: 0.7 }}>(DÓNDE se compra)</span></label>
      <select value={gondola} onChange={e => setGondola(e.target.value)} style={{ ...ingSelectStyle, marginBottom: 12 }}>
        {GONDOLAS_ING.map(g => <option key={g} value={g}>{g}</option>)}
      </select>

      <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--muted)' }}>Rol nutricional <span style={{ opacity: 0.7 }}>(qué APORTA — varios o ninguno)</span></p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ROLES_ING.map(rol => {
          const on = roles.includes(rol);
          return (
            <button key={rol} type="button" onClick={() => toggleRol(rol)} style={{
              padding: '5px 12px', fontSize: 12, borderRadius: 9999, cursor: 'pointer',
              border: '1px solid ' + (on ? 'var(--primary)' : 'var(--border)'),
              background: on ? 'var(--primary)' : 'var(--surface-strong)',
              color: on ? '#fff' : 'var(--text)', fontFamily: 'inherit',
            }}>{rol}</button>
          );
        })}
      </div>
    </>
  );
}

// ─── Inline editor for an ambiguous ingredient (completion flow) ─────────────

function EditorIngrediente({ ing, onGuardar }) {
  const [categoria, setCategoria] = React.useState(ing.categoria);
  const [gondola, setGondola] = React.useState(ing.gondola);
  const [roles, setRoles] = React.useState(ing.roles || []);
  const [guardando, setGuardando] = React.useState(false);
  const toggleRol = (rol) => setRoles(prev => prev.includes(rol) ? prev.filter(r => r !== rol) : [...prev, rol]);

  function handleGuardar() {
    setGuardando(true);
    setTimeout(() => {
      setGuardando(false);
      onGuardar({ ...ing, categoria, gondola, roles, ambiguo: false });
      window.__toast?.(`"${ing.nombre}" completado.`, true);
    }, 500);
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--warn-line)',
      borderRadius: 12, padding: '14px 16px', marginBottom: 10,
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{ing.nombre}</p>
      <p style={{ margin: '2px 0 12px', fontSize: 11, color: 'var(--muted)' }}>
        Importado como "{ing.canonico || ing.nombre.toLowerCase()}" · falta completar
      </p>
      <CamposIngrediente
        categoria={categoria} setCategoria={setCategoria}
        gondola={gondola} setGondola={setGondola}
        roles={roles} toggleRol={toggleRol}
      />
      <Button variant="primary" onClick={handleGuardar} disabled={guardando} style={{ width: '100%', marginTop: 14 }}>
        {guardando ? 'Guardando…' : 'Completar ingrediente'}
      </Button>
    </div>
  );
}

// ─── Bottom-sheet editor for any ingredient (edit or create) ─────────────────

// Recetas del catálogo que referencian este ingrediente (match por nombre).
function recetasQueUsan(ing, recetas) {
  const n = (ing.nombre || '').toLowerCase().trim();
  if (!n) return [];
  return (recetas || []).filter(r => {
    const textos = [
      ...((r.ingredientesDet || []).map(x => (x.texto || '').toLowerCase())),
      ...((r.ingredientes || []).map(x => String(x).toLowerCase())),
    ];
    return textos.some(t => t.includes(n));
  });
}

function EditorModal({ ing, recetas = [], catalogo = [], onAbrirReceta, onGuardar, onEliminar, onClose }) {
  const usadoEn = ing.id ? recetasQueUsan(ing, recetas) : [];
  const esNuevo = !ing.id;
  const [nombre, setNombre] = React.useState(ing.nombre || '');
  const [categoria, setCategoria] = React.useState(ing.categoria || 'Despensa varios');
  const [gondola, setGondola] = React.useState(ing.gondola || 'Despensa / otros');
  const [roles, setRoles] = React.useState(ing.roles || []);
  const [equis, setEquis] = React.useState(ing.equivalencias || []);
  const toggleRol = (rol) => setRoles(prev => prev.includes(rol) ? prev.filter(r => r !== rol) : [...prev, rol]);

  const nombrePorId = React.useMemo(() => {
    const m = {}; (catalogo || []).forEach(i => { m[i.id] = i.nombre; }); return m;
  }, [catalogo]);
  // Candidatos a sustituto: cualquier otro ingrediente del catálogo no agregado aún.
  const candidatos = (catalogo || []).filter(i => i.id !== ing.id && !equis.includes(i.id));
  const quitarEqui = (id) => setEquis(prev => prev.filter(x => x !== id));
  const agregarEqui = (id) => { if (id) setEquis(prev => [...prev, id]); };

  function handleGuardar() {
    const limpio = nombre.trim();
    if (!limpio) { window.__toast?.('Poné un nombre al ingrediente.', false); return; }
    onGuardar({ ...ing, nombre: limpio, categoria, gondola, roles, equivalencias: equis, ambiguo: false });
    window.__toast?.(esNuevo ? `"${limpio}" agregado al catálogo.` : `"${limpio}" actualizado.`, true);
    onClose();
  }

  const overlay = (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 70,
        background: 'rgba(0,0,0,0.45)',
        animation: 'cf-fade-in 160ms ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          maxHeight: '88%', overflowY: 'auto',
          background: 'var(--bg)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
          padding: '8px 18px 22px', boxShadow: '0 -8px 24px rgba(0,0,0,0.25)',
        }}
      >
        {/* grabber */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 12px' }}>
          <span style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--line)' }}/>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>
            {esNuevo ? 'Nuevo ingrediente' : 'Editar ingrediente'}
          </h2>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--surface-alt)', border: 0, color: 'var(--muted-strong)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="x" size={16}/>
          </button>
        </div>

        <CamposIngrediente
          nombre={nombre} setNombre={setNombre} showNombre
          categoria={categoria} setCategoria={setCategoria}
          gondola={gondola} setGondola={setGondola}
          roles={roles} toggleRol={toggleRol}
        />

        {/* Recetas que lo usan */}
        {!esNuevo && (
          <div style={{ marginTop: 20 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {usadoEn.length === 0
                ? 'No figura en ninguna receta todavía'
                : `En ${usadoEn.length} ${usadoEn.length === 1 ? 'receta' : 'recetas'}`}
            </p>
            {usadoEn.map(r => (
              <button
                key={r.id}
                onClick={() => { onClose(); onAbrirReceta?.(r); }}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  background: 'var(--surface-strong)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px', marginBottom: 8,
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 500, color: 'var(--text-strong)' }}>{r.nombre}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    {[r.cocina, r.proteina, r.tiempo].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <Icon name="chevron-right" size={16} style={{ color: 'var(--muted)', flexShrink: 0 }}/>
              </button>
            ))}
          </div>
        )}

        {/* Equivalencias / sustitutos */}
        {!esNuevo && (
          <div style={{ marginTop: 20 }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="swap" size={13} strokeWidth={2}/>Se puede reemplazar por
            </p>
            {equis.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {equis.map(id => (
                  <span key={id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 6px 4px 11px',
                    borderRadius: 9999, fontSize: 13, background: 'var(--accent-soft)', color: 'var(--accent)',
                  }}>
                    {nombrePorId[id] || id}
                    <button onClick={() => quitarEqui(id)} aria-label={`Quitar ${nombrePorId[id] || id}`} style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                      border: 0, background: 'transparent', color: 'var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
                    }}>
                      <Icon name="x" size={12}/>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={e => { agregarEqui(e.target.value); e.target.value = ''; }}
              style={{ ...ingSelectStyle, color: 'var(--muted)' }}
            >
              <option value="">+ Agregar sustituto…</option>
              {candidatos.map(i => <option key={i.id} value={i.id} style={{ color: 'var(--text)' }}>{i.nombre}</option>)}
            </select>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>
              Equivalencia general del catálogo (reusable en cualquier receta). Distinto de los
              sinónimos (otro nombre del mismo) y del “X o Y” propio de una receta.
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          {!esNuevo && onEliminar && (
            <button
              onClick={() => { onEliminar(ing); onClose(); }}
              aria-label="Eliminar"
              style={{
                flexShrink: 0, width: 46, borderRadius: 10, cursor: 'pointer',
                background: 'var(--err-bg)', border: '1px solid var(--err-line)', color: 'var(--err-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
              }}
            >
              <Icon name="trash" size={17}/>
            </button>
          )}
          <Button variant="primary" onClick={handleGuardar} style={{ flex: 1 }}>
            {esNuevo ? 'Agregar al catálogo' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );

  const mount = document.getElementById('device-stage') || document.body;
  return ReactDOM.createPortal(overlay, mount);
}

// ─── Catalog row ─────────────────────────────────────────────────────────────

function IngredienteRow({ ing, editable, onEdit }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={editable ? () => onEdit(ing) : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 4px', borderBottom: '1px solid var(--border-subtle)',
        cursor: editable ? 'pointer' : 'default',
        background: hover && editable ? 'var(--surface-alt)' : 'transparent',
        borderRadius: hover && editable ? 8 : 0, transition: 'background 120ms ease',
        margin: '0 -4px',
      }}
    >
      <GondolaChip gondola={ing.gondola}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: 'var(--text-strong)' }}>{ing.nombre}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{ing.categoria}</p>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 140 }}>
        {(ing.roles || []).map(r => <RolPill key={r}>{r}</RolPill>)}
      </div>
      {editable && (
        <span style={{ flexShrink: 0, color: 'var(--muted)', opacity: hover ? 1 : 0.35, transition: 'opacity 120ms ease' }}>
          <Icon name="pencil" size={15}/>
        </span>
      )}
    </div>
  );
}

// ─── Detección de duplicados ─────────────────────────────────────────────────
// Normaliza nombre: minúsculas, sin acentos, sin plural simple (trailing "s").
function normNombre(s) {
  return (s || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/s\b/g, '');
}
// Pares de ingredientes que parecen el mismo (nombre normalizado igual o prefijo).
function detectarDuplicados(items) {
  const pares = [];
  const completos = items.filter(i => !i.ambiguo);
  for (let a = 0; a < completos.length; a++) {
    for (let b = a + 1; b < completos.length; b++) {
      const na = normNombre(completos[a].nombre), nb = normNombre(completos[b].nombre);
      if (!na || !nb) continue;
      const igual = na === nb;
      const prefijo = na.length >= 3 && nb.length >= 3 && (na.startsWith(nb) || nb.startsWith(na));
      if (igual || prefijo) pares.push([completos[a], completos[b]]);
    }
  }
  return pares;
}

// ─── Sheet de fusión ─────────────────────────────────────────────────────────
function MergeSheet({ par, recetas = [], onConfirmar, onClose }) {
  const [a, b] = par;
  // Por defecto se conserva el más usado
  const [keepId, setKeepId] = React.useState((a.usos || 0) >= (b.usos || 0) ? a.id : b.id);
  const keep = keepId === a.id ? a : b;
  const drop = keepId === a.id ? b : a;

  const recetasDrop = recetasQueUsan(drop, recetas);
  const sinFinales = Array.from(new Set([
    ...(keep.sinonimos || []),
    ...(drop.sinonimos || []),
    drop.nombre,
  ].map(s => s).filter(s => normNombre(s) !== normNombre(keep.nombre))));

  function OpcionConservar({ ing }) {
    const sel = keepId === ing.id;
    return (
      <button onClick={() => setKeepId(ing.id)} style={{
        flex: 1, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
        background: sel ? 'var(--primary-soft)' : 'var(--surface-strong)',
        border: '1px solid ' + (sel ? 'var(--primary)' : 'var(--border)'),
        borderRadius: 12, padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
            border: '2px solid ' + (sel ? 'var(--primary)' : 'var(--muted)'),
            background: sel ? 'var(--primary)' : 'transparent',
            boxShadow: sel ? 'inset 0 0 0 2px var(--bg)' : 'none',
          }}/>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{ing.nombre}</span>
        </div>
        <p style={{ margin: '6px 0 0 24px', fontSize: 12, color: 'var(--muted)' }}>
          {ing.categoria} · {ing.gondola} · usado {ing.usos || 0}×
        </p>
      </button>
    );
  }

  const overlay = (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.45)' }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%', overflowY: 'auto',
        background: 'var(--bg)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '8px 18px 22px', boxShadow: '0 -8px 24px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 12px' }}>
          <span style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--line)' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>Fusionar duplicados</h2>
          <button onClick={onClose} aria-label="Cerrar" style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'var(--surface-alt)',
            border: 0, color: 'var(--muted-strong)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icon name="x" size={16}/></button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          Parecen el mismo ingrediente. Elegí cuál conservar; el otro se elimina y sus usos,
          sinónimos y recetas pasan al que queda.
        </p>

        <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Conservar</p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <OpcionConservar ing={a}/>
          <OpcionConservar ing={b}/>
        </div>

        {/* Resultado */}
        <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 18 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Después de fusionar</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Icon name="swap" size={14} color="var(--accent)"/>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>
              Se conserva <strong style={{ color: 'var(--text-strong)' }}>{keep.nombre}</strong>, se elimina <span style={{ textDecoration: 'line-through', color: 'var(--muted)' }}>{drop.nombre}</span>
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--muted)', lineHeight: 1.7 }}>
            <li>Usos combinados: <strong style={{ color: 'var(--text-strong)' }}>{(keep.usos || 0) + (drop.usos || 0)}×</strong></li>
            {recetasDrop.length > 0 && <li>{recetasDrop.length} {recetasDrop.length === 1 ? 'receta pasa' : 'recetas pasan'} a “{keep.nombre}”</li>}
            <li>“{drop.nombre}” queda como <strong style={{ color: 'var(--text-strong)' }}>sinónimo</strong></li>
            {sinFinales.length > 0 && <li>Sinónimos: {sinFinales.join(', ')}</li>}
          </ul>
        </div>

        <Button variant="primary" onClick={() => { onConfirmar(keep, drop, sinFinales); onClose(); }} style={{ width: '100%' }}>
          Fusionar en “{keep.nombre}”
        </Button>
      </div>
    </div>
  );
  const mount = document.getElementById('device-stage') || document.body;
  return ReactDOM.createPortal(overlay, mount);
}

function CatalogoIngredientesScreen({ ingredientes, recetas = [], isJP, onBack, onAbrirReceta }) {
  const [items, setItems] = React.useState(ingredientes || []);
  const [busqueda, setBusqueda] = React.useState('');
  const [gondolaFiltro, setGondolaFiltro] = React.useState('');
  const [editando, setEditando] = React.useState(null); // ingredient obj or {nuevo}
  const [fusionando, setFusionando] = React.useState(null); // [a, b] par a fusionar

  const duplicados = React.useMemo(() => (isJP ? detectarDuplicados(items) : []), [items, isJP]);

  function handleFusionar(keep, drop, sinFinales) {
    setItems(prev => prev
      .filter(i => i.id !== drop.id)
      .map(i => i.id === keep.id
        ? { ...i, usos: (keep.usos || 0) + (drop.usos || 0), sinonimos: sinFinales,
            equivalencias: Array.from(new Set([...(keep.equivalencias || []), ...(drop.equivalencias || [])].filter(x => x !== keep.id))) }
        : (i.equivalencias || []).includes(drop.id)
          ? { ...i, equivalencias: i.equivalencias.map(x => x === drop.id ? keep.id : x).filter((x, idx, arr) => arr.indexOf(x) === idx && x !== i.id) }
          : i));
    window.__toast?.(`Fusionado en “${keep.nombre}”.`, true);
  }

  const ambiguos = items.filter(i => i.ambiguo);
  const completos = items.filter(i => !i.ambiguo);

  function handleGuardar(actualizado) {
    setItems(prev => {
      const conId = actualizado.id ? actualizado : { ...actualizado, id: 'i' + Date.now() };
      const existe = prev.some(i => i.id === conId.id);
      let next = existe ? prev.map(i => i.id === conId.id ? conId : i) : [...prev, conId];
      // Equivalencias bidireccionales: si A puede reemplazarse por B, B también por A.
      const equis = conId.equivalencias || [];
      next = next.map(i => {
        if (i.id === conId.id) return i;
        const lista = i.equivalencias || [];
        const tiene = lista.includes(conId.id);
        const debería = equis.includes(i.id);
        if (debería && !tiene) return { ...i, equivalencias: [...lista, conId.id] };
        if (!debería && tiene) return { ...i, equivalencias: lista.filter(x => x !== conId.id) };
        return i;
      });
      return next;
    });
  }
  function handleEliminar(ing) {
    setItems(prev => prev
      .filter(i => i.id !== ing.id)
      .map(i => (i.equivalencias || []).includes(ing.id)
        ? { ...i, equivalencias: i.equivalencias.filter(x => x !== ing.id) }
        : i));
    window.__toast?.(`"${ing.nombre}" eliminado del catálogo.`, true);
  }
  function abrirNuevo() {
    setEditando({ nombre: '', categoria: 'Despensa varios', gondola: 'Despensa / otros', roles: [], usos: 0 });
  }

  const filtrados = completos.filter(i =>
    (!busqueda || i.nombre.toLowerCase().includes(busqueda.toLowerCase())) &&
    (!gondolaFiltro || i.gondola === gondolaFiltro)
  );

  const grupos = ORDEN_GONDOLA_ING
    .map(g => ({ gondola: g, items: filtrados.filter(i => i.gondola === g) }))
    .filter(grp => grp.items.length > 0);

  const gondolasPresentes = ORDEN_GONDOLA_ING.filter(g => completos.some(i => i.gondola === g));

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-3)' }}>
        <button onClick={onBack} aria-label="Volver" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 0, color: 'var(--muted)', cursor: 'pointer', padding: 4,
        }}>
          <Icon name="chevron-left" size={20}/>
        </button>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Catálogo</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', letterSpacing: '-0.01em', margin: '0 0 4px' }}>
            Ingredientes
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
            {completos.length} en el catálogo · ordenados por góndola
          </p>
        </div>
        {isJP && (
          <button onClick={abrirNuevo} style={{
            flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '7px 12px', background: 'var(--primary)', color: '#fff',
            borderRadius: 10, fontSize: 13, fontWeight: 500, border: 0, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <Icon name="plus" size={15}/>
            <span>Nuevo</span>
          </button>
        )}
      </div>

      {/* Posibles duplicados (JP) */}
      {isJP && duplicados.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            padding: '8px 12px', background: 'var(--info-bg)', border: '1px solid var(--info-line)', borderRadius: 10,
          }}>
            <Icon name="swap" size={15} color="var(--info-text)"/>
            <span style={{ fontSize: 13, color: 'var(--info-text)', fontWeight: 500 }}>
              {duplicados.length} {duplicados.length === 1 ? 'posible duplicado' : 'posibles duplicados'}
            </span>
          </div>
          {duplicados.map((par, i) => (
            <button key={i} onClick={() => setFusionando(par)} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 12px', marginBottom: 8,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 14, color: 'var(--text-strong)' }}>
                <span style={{ fontWeight: 500 }}>{par[0].nombre}</span>
                <span style={{ color: 'var(--muted)' }}>↔</span>
                <span style={{ fontWeight: 500 }}>{par[1].nombre}</span>
              </span>
              <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Revisar</span>
            </button>
          ))}
        </div>
      )}

      {/* Por completar (JP) */}
      {isJP && ambiguos.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
            padding: '8px 12px', background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', borderRadius: 10,
          }}>
            <Icon name="alert-triangle" size={15} color="var(--warn-text)"/>
            <span style={{ fontSize: 13, color: 'var(--warn-text)', fontWeight: 500 }}>
              {ambiguos.length} ingrediente{ambiguos.length !== 1 ? 's' : ''} por completar
            </span>
          </div>
          {ambiguos.map(ing => (
            <EditorIngrediente key={ing.id} ing={ing} onGuardar={handleGuardar}/>
          ))}
        </div>
      )}

      {/* Search + filter */}
      <input
        type="search"
        placeholder="Buscar ingrediente…"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 10,
          border: '1px solid var(--border)', fontSize: 13,
          background: 'var(--surface-strong)', color: 'var(--text)',
          boxSizing: 'border-box', marginBottom: 10, fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setGondolaFiltro('')} style={pillBtn(gondolaFiltro === '')}>Todas</button>
        {gondolasPresentes.map(g => (
          <button key={g} onClick={() => setGondolaFiltro(g === gondolaFiltro ? '' : g)} style={pillBtn(gondolaFiltro === g)}>
            {g}
          </button>
        ))}
      </div>

      {/* Catalog grouped */}
      {grupos.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)', fontSize: 13 }}>
          Ningún ingrediente coincide con la búsqueda.
        </p>
      ) : grupos.map(grp => (
        <div key={grp.gondola} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <GondolaChip gondola={grp.gondola} size={20}/>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {grp.gondola}
            </h2>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>· {grp.items.length}</span>
          </div>
          <div style={{
            background: 'var(--surface-strong)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '4px 16px',
          }}>
            {grp.items.map(ing => (
              <IngredienteRow key={ing.id} ing={ing} editable={isJP} onEdit={setEditando}/>
            ))}
          </div>
        </div>
      ))}

      {editando && (
        <EditorModal
          key={editando.id || 'nuevo'}
          ing={editando}
          recetas={recetas}
          catalogo={items}
          onAbrirReceta={onAbrirReceta}
          onGuardar={handleGuardar}
          onEliminar={handleEliminar}
          onClose={() => setEditando(null)}
        />
      )}

      {fusionando && (
        <MergeSheet
          par={fusionando}
          recetas={recetas}
          onConfirmar={handleFusionar}
          onClose={() => setFusionando(null)}
        />
      )}
    </>
  );
}

function pillBtn(active) {
  return {
    padding: '5px 12px', fontSize: 12, borderRadius: 9999, cursor: 'pointer',
    border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'),
    background: active ? 'var(--primary)' : 'var(--surface-strong)',
    color: active ? '#fff' : 'var(--muted-strong)', fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  };
}

window.CatalogoIngredientesScreen = CatalogoIngredientesScreen;
