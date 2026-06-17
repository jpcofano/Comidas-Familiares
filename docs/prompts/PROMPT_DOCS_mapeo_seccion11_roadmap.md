# PROMPT DOCS — MAPEO: agregar §11 Roadmap de funcionalidades futuras

> **Tipo:** documentación pura. **Solo toca `docs/MAPEO_FIRESTORE.md`. Cero código.**
> **MAPEO vigente:** v1.8.2 (o v1.9.0 si ya se ejecutó E7.9 — ver nota de versión abajo).

## Por qué

JP definió una lista de 15 funcionalidades candidatas a futuro + algunas agregadas en revisión. El Lote 1 (memoria de cocción + notas de receta + wake lock) se ejecuta ya como E7.9. El resto se registra acá como **roadmap ordenado por prioridad**, para que quede en la fuente de verdad y no se pierda.

Esta sección §11 es **un backlog priorizado, no un compromiso de fechas.** Cada ítem se activa cuando aparezca ganas/necesidad. Varios solapan con entradas viejas de §9 (futuro genérico) — donde solapan, §11 manda y se referencia §9.

## Nota de versión

- Si E7.9 (Lote 1) **todavía no se ejecutó**: este prompt agrega §11 y bumpea el MAPEO de v1.8.2 a **v1.8.3** (cambio solo-docs).
- Si E7.9 **ya se ejecutó** (MAPEO ya en v1.9.0): agregar §11 sin re-bumpear; dejar v1.9.0 y solo anotar en el header que se agregó el roadmap §11. **Verificá la versión actual del header antes de tocar nada y reportala.**

## Cambio único — agregar §11 al final, antes de "## Cierre"

Insertar esta sección completa entre el final de §10 y "## Cierre":

```
---

## 11. Roadmap de funcionalidades futuras (backlog priorizado)

Lista de mejoras candidatas, definidas por JP. **No es compromiso de fecha** — cada ítem
se activa cuando aparezca necesidad o ganas. Todas son **$0 / plan Spark** salvo donde se
indique. Ordenadas por lotes según afinidad de código y prioridad. El Lote 1 ya está en
ejecución como E7.9.

Donde un ítem solapa con una entrada de §9 (futuro genérico), §11 es la versión vigente
y más concreta; §9 queda como referencia histórica.

### Lote 1 — Aprendizaje (EN EJECUCIÓN — E7.9)

Cierra el loop de feedback de la app. Ver §10.8.

- **1.1 Memoria de cocción.** Al cocinar, mostrar lo aprendido la última vez
  (queCambiaria / queSalioBien / último puntaje). Usa datos existentes. *El favorito de
  JP: convierte el historial en aprendizaje real, es lo que hace "la app de TU familia".*
- **1.2 Notas persistentes de receta** (`notasCocina`). Conocimiento operativo estable de
  la familia sobre la receta (ajustes de horno, "duplicar el ajo"). Complementa 1.1: una
  es feedback de UNA cocción, la otra es saber estable de la receta.
- **1.3 Wake Lock.** Pantalla siempre encendida al cocinar. ~20 líneas. Se usa siempre.

### Lote 2 — Compartir (sobre E7.8, la foto ya existe)

Comparten el truco de canvas / Web Share. Hacer después de tener fotos cargadas.

- **2.1 Tarjeta del plato para compartir.** Generar en canvas un JPEG (foto + nombre +
  promedio + resultado) y compartir por WhatsApp / Web Share. NO necesita Storage ni URLs
  públicas — se genera en el momento, igual que el og-image de E7.7. Esfuerzo medio. *Pedido
  por JP previamente; la foto de E7.8 lo deja a un paso.*
- **2.2 Galería / "qué comimos".** Línea de tiempo visual de los platos cocinados (foto +
  nombre + fecha). Memoria afectiva, no analítica (eso es D.3). Casi gratis sobre E7.8.
- **2.3 Compartir lista de compras por WhatsApp.** Texto plano de los items pendientes
  agrupados por góndola → `wa.me/?text=…`. Tiny, uso práctico altísimo y recurrente (cada
  semana alguien va al súper).

### Lote 3 — Decidir qué cocinar

Consumen las mismas señales (puntaje, última fecha, proteína). Calcular una vez, servir a
los tres. **Mantener chicos a propósito:** una frase, una alerta, un número. En el momento
en que pidan "configuración" o "filtros", eso ya es D.3 (§9.1, postergado) — parar ahí.

- **3.1 Sugeridor semanal.** "Gustó mucho (9) y no la hacés hace 2 meses" / "hace 3 semanas
  que no comen pescado". Combina alto ultimoPuntaje + ultimaEvaluacion vieja + variedad de
  proteína. Resuelve la fricción real de toda familia: decidir. (Solapa con §9.5 — esta es
  la versión concreta y liviana; §9.5 hablaba de endpoint server-side, que NO hace falta.)
- **3.2 Alerta de variedad / rotación de proteína.** Al armar la semana, avisar "llevás 3
  platos de pollo". Esfuerzo mínimo.
- **3.3 "Sorprendeme".** Pick aleatorio ponderado por puntaje, para cuando nadie decide.
  Una tarde de trabajo.
- **3.4 Perfil de gustos por miembro.** Derivado del map `votos`/`calificaciones`: "a Sofía
  le gustan los guisos", "Federico baja los pescados". Sirve para planificar y detectar
  patrones. JP confirmó que no hay problema social: cada uno sabe qué no le gusta, nadie se
  ofende. Mantener en tono descriptivo-amable.

### Lote 4 — Planificar

Tocan el plan y la receta.

- **4.1 Vista calendario de la semana.** Grilla L–D donde se ven/arrastran los planes a cada
  día. Cierra lo que el campo `fecha` (E7.1) empezó y nunca tuvo UI de calendario.
- **4.2 Escalado de porciones.** El formato es 4 porciones; un selector "cocinar para 6/8"
  que multiplica cantidades. Encaja con el modelo de cantidades concretas. (Solapa
  parcialmente con §9.8 "noche de a dos", que también ajusta porciones.)
- **4.3 Mise en place.** Antes de los pasos guiados, un checklist "tené listo esto" con los
  ingredientes. Reduce el caos de buscar cosas a mitad de receta.

### Lote 5 — Compras y plata

- **5.1 Despensa persistente.** Lista fija de básicos (sal, aceite, ajo) que se auto-marcan
  como "ya tengo" y no ensucian la compra semanal. Hoy `yaTengo` es por lista.
- **5.2 Seguimiento de gasto simple.** Sumar `costoRealAprox` por semana/mes con tendencia
  básica ("este mes X, el anterior Y"). NO el dashboard pesado (eso es D.3, §9.1). (Solapa
  con §9.7 — esta es la versión liviana, sin form de precio por ingrediente.)

### Lote 6 — Misceláneos / valor afectivo

- **6.1 "Cocinado por" / contador de cocineros.** Quién cocinó cuánto, usando `cocineros`
  del plan. Gamificación suave, sin competencia tóxica.
- **6.2 Lista "quiero probar" / wishlist.** Recetas marcadas como "alguna vez" sin
  comprometerlas a una semana. Cajón de candidatas, reduce fricción de "vi algo rico pero
  no es para esta semana".

### ⚠️ Con advertencia — evaluar costo real antes de comprometer

- **7.1 Estacionalidad.** Tag de temporada + filtro/sugerencia según el mes (estaciones de
  Buenos Aires: guisos en julio, ensaladas en enero). **Advertencia:** el feature es $0,
  pero el DATO no. Las recetas tienen hoy `temporadaIdeal` como **texto libre** (ej.
  "Otoño / invierno"), no un tag estructurado filtrable. Para que el filtro funcione hay
  que normalizar ese campo en TODAS las recetas existentes (trabajo manual de JP, receta
  por receta) o aceptar un parser frágil sobre el texto libre. Muchos platos son
  todo-el-año, lo que diluye el valor. **Antes de hacerlo, decidir si se va a sostener el
  tagging.** Si no, no vale la pena.

- **7.2 "¿Qué hay en la heladera?" (búsqueda inversa).** Marcar ingredientes que tenés →
  qué podés cocinar. **Advertencia: es de otra categoría, no un feature — es un
  mini-proyecto.** Requiere indexar ingredientes normalizados de todas las recetas y
  resolver matching parcial (¿"carne picada" matchea "carne molida"?). El matcher de
  sinónimos de E3.4.9 ayudaría pero no alcanza. Además el payoff es incierto: ¿cuántas
  veces por mes alguien busca así en vez de abrir la biblioteca? **No hacer salvo que la
  familia la pida explícitamente y con insistencia.** Tal vez nunca.

### Postergado sin urgencia (decisiones ya tomadas, fuera de §11)

- **Push notifications (E6.2 / §9.3).** Esperando decisión Camino A (Blaze) vs B (in-app).
- **Dashboard de historial avanzado (D.3 / §9.1).** La pantalla actual alcanza. Requiere
  pasar por Claude Design primero.
- **Importador con foto/OCR (§9.4), backup/export (§9.10), invitados con scope (§9.11),
  multi-semana (§9.2).** Opcionales sin compromiso.

### Criterio transversal

Varios ítems (3.1, 3.4, 5.2) son features de *insight* que calculan algo sobre el
historial. Hay una tentación natural de que crezcan hacia el dashboard pesado D.3
(postergado por buenas razones). **Mantenerlos chicos a propósito:** una frase, una alerta,
un número, sin configuración ni filtros. El momento en que uno necesita "ajustes", ya cruzó
a D.3 — y D.3 está postergado.
```

## Criterio de aceptación

1. Reportá la versión del header ANTES de tocar (v1.8.2 o v1.9.0) y la decisión de bump tomada.
2. Pegá la §11 completa tal como quedó insertada.
3. Confirmá que quedó ubicada entre §10 y "## Cierre".
4. Confirmá que NO se tocó ninguna otra sección (§9 queda como está, solo referenciada desde §11).

## Fuera de scope

- No tocar código.
- No modificar §9 (queda como referencia histórica; §11 la referencia donde solapa).
- No reordenar las prioridades que definió JP.

## Commit

```
Docs: MAPEO §11 — roadmap de funcionalidades futuras (backlog priorizado)
```
