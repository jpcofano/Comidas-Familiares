# PROMPT DOCS — Agregar 4 ideas al backlog (MAPEO §11, sin prioridad)

> Pegar a Claude Code. **Solo toca `docs/MAPEO_FIRESTORE.md`** — no hay cambios de código.
> Registrar 4 funcionalidades propuestas en el backlog §11, todas **sin prioridad / futuro**.

## Qué hacer

En `docs/MAPEO_FIRESTORE.md`, dentro de `## 11. Backlog`, agregar una subsección nueva
**antes** del bloque "**Postergado sin urgencia:**", con este contenido (respetar el estilo
de las demás entradas del §11):

```markdown
### Ideas a futuro — Aprovechar macros y datos existentes (sin prioridad)

Funcionalidades propuestas en revisión de diseño post-E11/E12. Ninguna tiene fecha ni
prioridad; se activan cuando aparezca ganas/necesidad. Todas se apoyan en datos que la app
**ya tiene** (planes de la semana, `macrosDeReceta`, `vecesCocinada`/`ultimoPuntaje`,
despensa de E9.3, historial), así que no requieren modelo nuevo salvo donde se indica.

- **F1 — Resumen de macros de la semana.** Tarjeta en la Home de JP (o pantalla propia) que
  suma los planes activos de la semana y muestra **netos promedio por día**, proteína total y
  un mini-gráfico de barras por día. Puro cálculo sobre `macrosDeReceta` + planes; sin modelo
  nuevo. Es la consecuencia natural de E11. **Candidata más fuerte.**
- **F2 — "Buenas y olvidadas" / sugeridor semanal.** Al planificar, sección con recetas bien
  puntuadas (`ultimoPuntaje` alto) que no se cocinan hace X (`vecesCocinada` / fecha). Rescata
  joyas del historial y combate la repetición. Solapa con la idea "3.1 Sugeridor semanal" del
  roadmap viejo — unificar bajo F2 si se implementa.
- **F3 — Despensa ↔ lista de compras conectada.** Los ítems que ya están en la despensa de
  E9.3 (`localStorage["cf-despensa"]`) aparecen pre-tildados ("ya tengo") al armar la lista de
  compras. Una sola fuente de verdad de qué hay en casa. Bajo riesgo. Relacionado con la nota
  "despensa persistente" de §1.2.E9.3.
- **F4 — Tips de la familia en la receta.** Al votar/evaluar, capturar un texto corto
  ("la próxima: menos sal / 10 min más"). Los tips se acumulan y se muestran arriba del paso a
  paso la próxima vez que alguien cocina esa receta. Requiere un campo nuevo (p.ej.
  `tips[]` en la receta o en el historial) — definir shape cuando se priorice.
```

## Cierre

- Actualizá la línea de **Estado** al final del documento ("**Estado en v2.6.0:** …") para
  mencionar que el §11 incorpora 4 ideas a futuro (F1–F4) sin prioridad. No cambiar el resto.
- Commit: `docs: backlog §11 — 4 ideas a futuro (resumen macros semanal, sugeridor, despensa↔compras, tips) sin prioridad`.
- `git push`. No build ni deploy (solo docs).
