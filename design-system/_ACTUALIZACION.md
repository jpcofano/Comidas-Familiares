# Actualización del design system — qué cambió

Esta carpeta reemplaza por completo a la `design-system/` anterior del repo
(que era un snapshot viejo, pre-E8.2). Para actualizar:

```
rm -rf design-system        # borrá la vieja
# copiá esta carpeta como design-system/
```

## Cambios respecto a la versión anterior

- **`colors_and_type.css` al día**: ahora incluye el bloque real `[data-theme="dark"]`
  ("Cocina nocturna", primary dark `#e08a63`, toggle manual) — espejo de
  `src/styles/tokens.css`. Suma `--estrella` (dorado de ratings, E9.6) y los cuatro
  `--member-*` en light y dark (E8.2/E10).
- **Eliminado** el viejo `colors_and_type-dark.css` (draft `@media (prefers-color-scheme: dark)`):
  la decisión de producto lo reemplazó por el toggle manual con `[data-theme="dark"]`.
- **`ui_kits/mobile-app/` al día hasta E11**: incluye la nueva **tarjeta de macros por
  porción** (`RecetaDetalleParts.jsx` → `MacrosCard`/`MacrosMenuCard`) con tweak
  `macrosLayout` (Estrella / Tabla), más Perfil, Catálogo editable, ¿Qué cocino?,
  Historial rediseñado, Visibilidad y dark-mode toggle.

> La **fuente de verdad** de los tokens sigue siendo `src/styles/tokens.css`. Esta
> carpeta es el mirror de handoff; si divergen, gana `src/styles/tokens.css`.
