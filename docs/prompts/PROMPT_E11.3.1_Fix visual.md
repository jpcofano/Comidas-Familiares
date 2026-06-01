Implementá E11.3 (UI de macros) siguiendo docs/prompts/PROMPT_E11.3_macros_ui.md.
La lógica (E11.1) y los datos (E11.2) ya están; falta solo la UI.

Antes de codear, pegame el diagnóstico que pide el prompt:
1) cómo DetalleReceta.tsx obtiene el catálogo hoy (¿getCatalogo(), prop, o no lo carga?),
2) el orden de secciones del detalle (hero, meta, pills, ingredientes, pasos, acciones, sticky),
3) el patrón de un filtro existente en filtros.ts (esKeto/proteina).

Decisiones de diseño ya validadas en el prototipo del design system (MacrosCard):
- Hidratos netos = número estrella: grande, var(--primary), con bajada
  "carbohidratos − fibra · lo que cuenta para keto".
- Secundarios en grilla 3-col: kcal, Proteínas, Grasas, Fibra, Hidratos totales.
- Cobertura SIEMPRE en el pie: "Estimado sobre N de M ingredientes"; si es parcial,
  tono var(--warn-text) con prefijo "Parcial · estimado".
- Cobertura 0 → estado vacío discreto (borde punteado): "Sin datos de macros para
  esta receta todavía." Nunca 0 g engañosos.
- Ubicación: después de las MetaCards/pills, antes de Ingredientes.
- Reusá macrosDeReceta() tal cual; match por idIngrediente (no por nombre).

Tareas: 1) tarjeta en DetalleReceta.tsx; 2) agregado por porción del menú completo
(suma de componentes) en SeleccionarComponenteMenu.tsx/DetalleMenu.tsx; 3) OPCIONAL
filtro "hidratos netos ≤ N g" en Biblioteca (recetas sin datos NO matchean) — si suma
riesgo, dejala como E11.4 pendiente.

Cierre: commits "Stage 11.3:", actualizá MAPEO_FIRESTORE.md (§5 + cerrar E11.3 en §11),
npm run build && firebase deploy --only hosting, git push.