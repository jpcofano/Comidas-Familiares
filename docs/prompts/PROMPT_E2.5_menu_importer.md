# PROMPT E2.5 — Importador de menús

> Etapa 2.5 del plan de migración (ver `MAPEO_FIRESTORE.md` §2.3, §3.5, §3.8, §7.2).
> Pegar este archivo completo a Claude Code en la terminal del repo.

---

## 1. Contexto

Migración de **Comida Familiar** de Apps Script + Google Sheets a Firebase + React +
Vite. Fuente de verdad del modelo: `MAPEO_FIRESTORE.md`.

Estado del repo al arrancar este prompt:

- E1.0–E1.2 cerradas: bootstrap config, auth + whitelist, layout + routing (incluye
  React Router con las rutas de `MAPEO §5.1` y la bottom-nav portada de `Styles.html`).
- E2.1 cerrada: types en `src/types/models.ts` (incluye el type `Menu` con
  `componentes[]`) + helpers de canonicalización (`normalizeText`, `parseTime`,
  `parseRange`).
- E2.2 cerrada: data layer completo. **`src/data/menus.ts`** ya existe y expone
  funciones tipadas para leer/escribir menús + `deriveMenuMetadata()`.
- E2.3 cerrada: Security Rules. Las rules permiten `read, write` en `/menus` y
  `/recetas` a cualquier miembro de la whitelist.
- E2.4 cerrada: seeds en producción — 78 recetas, 5 menús, 21 componentes.
- E2.6 cerrada: índices Firestore declarados y Enabled.

Esta etapa implementa el **importador de menús**: una pantalla donde JP pega (o sube)
un TXT con formato `#MENU` + `#COMPONENTES`, el sistema lo parsea, resuelve cada
componente contra `/recetas`, valida, y si todo está bien crea el doc en `/menus`.

Es el último ladrillo de la Etapa 2. Es un feature real (pantalla + lógica de
parseo), no infraestructura.

**Antecedente:** el importador de *recetas* del Apps Script viejo (`80_Importador.gs`,
flujo frontend "Recetas → + Importar") ya funciona con la misma filosofía: textarea +
parseo de TXT estructurado + reporte de resultado. El importador de menús sigue ese
mismo patrón conceptual, adaptado al formato `#MENU`.

---

## 2. Formato del TXT (de `MAPEO_FIRESTORE.md` §3.5)

```
#MENU
nombre: Español de mar
nombreCanonico: (auto si vacío)
descripcion: Menú de mar con entrada de langostinos...
escenarioUso: Noche de a dos
climaDelMenu: Restaurante (texto libre)
idealPara: Sábado especial / invitados
estilo: Español / mediterráneo
estado: Para probar
aptoNocheDeADos: Sí
hidratoOpcional: Arroz blanco o pan aparte
paraJuanPablo: Zarzuela sola, sin arroz ni pan
paraFamilia: Arroz blanco o pan para acompañar
riesgos: Coordinar tiempos de mariscos
notas: Muy especial
notasOcasion: Mantener arroz o pan aparte

#COMPONENTES
orden | tipo        | idReceta_o_nombre        | obligatorio | notas
1     | Entrada     | Langostinos al ajillo    | Sí          | Sin manteca
2     | Principal   | REC-0102                 | Sí          |
3     | Postre      | Crema catalana           | No          | Si hay tiempo
```

---

## 3. Decisiones zanjadas (no re-litigar)

1. **Carga del TXT — dos vías.** La pantalla ofrece **ambas**: (a) un `textarea`
   donde pegar el TXT, y (b) un selector de archivo que acepta `.txt` y vuelca su
   contenido al mismo `textarea`. Es decir, la subida de archivo solo rellena el
   textarea; el parseo siempre opera sobre el texto. Una sola fuente de verdad
   interna (el contenido del textarea), dos formas de llenarlo.

2. **Ruta propia, accesible desde la navegación.** La pantalla vive en una ruta
   propia (sugerido `/menus/importar`, pero usá la convención de routing que ya
   definió E1.2) y debe ser **alcanzable desde la UI** — no una ruta oculta. Agregá
   el punto de entrada de la forma menos invasiva posible: idealmente un botón
   "+ Importar" en la pantalla/sección de menús, o un ítem en la nav, siguiendo el
   patrón del importador de recetas ("Recetas → + Importar"). Si tocar la bottom-nav
   es invasivo, un botón en la pantalla de listado de menús alcanza. Solo modo JP la
   ve (los miembros no importan menús — ver `MAPEO §5.1`, `menus` es JP-only).

3. **Escritura vía el data layer de E2.2.** El importador NO habla con el SDK de
   Firestore directamente. Usa las funciones de `src/data/menus.ts` (y
   `src/data/recetas.ts` para resolver componentes). Si falta una función que el
   importador necesita (ej. "buscar receta por nombreCanonico", "obtener próximo
   idMenu libre"), agregala a esos módulos siguiendo el estilo del resto del data
   layer — NO la metas dentro del componente de pantalla.

4. **Vocabulario de `componentes[].tipo` — cuidado.** El type `Menu` de E2.1 define
   `componentes[].tipo` como `"Entrada" | "Principal" | "Acompañamiento" | "Postre"`
   (ver `MAPEO §2.3`). Este vocabulario es **distinto** del `tipoItem` de recetas
   (`"Receta principal"`, etc.). El importador parsea el `tipo` del TXT y lo guarda
   tal cual en `componentes[].tipo` — NO lo traduce a `tipoItem`. Validá que el valor
   del TXT esté dentro del enum de 4 valores; si no, es error de validación.

5. **Modelo M (de `MAPEO §2.3` y §3.8).** El doc `/menus/{id}` que crea el importador
   contiene SOLO metadata propia + el array `componentes[]` de referencias. **No
   persiste** tiempos, dificultad ni `sinLacteos`/`hidratos` agregados — esos se
   derivan al vuelo con `deriveMenuMetadata()` (E2.2). El shape exacto a escribir es
   el de `MAPEO §2.3` / el type `Menu` de E2.1. Si la tuple del TXT sugiriera un
   campo que el type no tiene, no se persiste.

6. **Resolución de componentes (de `MAPEO §3.5`).** Para cada fila de
   `#COMPONENTES`, el campo `idReceta_o_nombre` se resuelve así:
   - Empieza con `REC-` → match exacto por `idReceta` contra `/recetas`.
   - Si no → match por `nombreCanonico` (aplicando `normalizeText` de E2.1) contra
     `/recetas`. Si hay **más de un match** → error (`Componente "X" ambiguo: N
     recetas coinciden`).
   - Si no encuentra ninguna → error: `Componente "X" no encontrado. Importar
     primero la receta.`
   - Si el campo trae **ambos** separados por `/` (`REC-0102 / Langostinos al
     ajillo`) → cross-check: el ID y el nombre deben apuntar a la misma receta. Si
     no coinciden → error.

7. **Validaciones obligatorias del `#MENU` (de `MAPEO §3.5`).** El menú se rechaza
   si falta: `nombre`, `escenarioUso`, o **al menos un componente con
   `tipo === "Principal"` y `obligatorio === "Sí"`**.

8. **Anti-duplicado (de `MAPEO §3.5`).** No crear el menú si ya existe un
   `idMenu` igual o un `nombreCanonico` igual en `/menus`. En ese caso → reportar
   como "duplicado", no como error.

9. **Defaults al cargar menú (de `MAPEO §3.5`):**
   - `estado` → `"Para probar"` si no viene.
   - `idMenu` ausente / `"AUTO"` → próximo `MENU-XXXX` libre
     (`max(idMenu MENU-*) + 1`, padded a 4 dígitos). La lógica de "próximo ID libre"
     va en el data layer (decisión 3), no en la pantalla.
   - `obligatorio` de un componente → `"Sí"` si no viene.
   - `nombreCanonico` → si viene vacío, se deriva de `nombre` con `normalizeText`.
   - Campos opcionales (`aptoNocheDeADos`, `paraJuanPablo`, etc.) → vacío si no vienen.
   - `fechaCreacion` / `ultimaModificacion` → `serverTimestamp()`.

10. **Idioma:** inglés en infraestructura (nombres de funciones, helpers de parseo),
    español en dominio y en todos los textos de la UI. Igual que el resto del repo.

11. **Diseño de la pantalla.** Seguí los tokens de diseño portados en E1.2
    (`Styles.html`: primary `#74324a`, cards sin sombra, etc.). La pantalla es
    **simple**: textarea + botón de subir archivo + botón "Importar" + área de
    resultado. No hace falta nada más elaborado — `MAPEO §7.2` dice "pantalla simple
    primero". NO se integra todavía al flujo de creación de planes (eso es Etapa 5).

---

## 4. Tareas

### 4.1 Lógica de parseo (`src/` — módulo, no componente)

- Creá un módulo de parseo de menús (ej. `src/import/parseMenu.ts` o donde el repo
  ubique lógica pura — seguí la convención existente; el importador de E2.1/E2.2
  puede dar referencia).
- Función que recibe el TXT como string y devuelve un resultado tipado (usá el
  `Result` de `src/lib/result.ts` de E2.2): o bien el menú parseado + componentes
  resueltos, o bien la lista de errores de validación.
- El parseo cubre: separar `#MENU` de `#COMPONENTES`, leer los pares `clave: valor`
  del bloque `#MENU`, leer la tabla pipe-delimited de `#COMPONENTES`, aplicar
  defaults (decisión 9), validar (decisiones 4, 7), resolver componentes
  (decisión 6).
- La resolución de componentes necesita leer `/recetas` — esta parte es async y usa
  el data layer. Estructurá el módulo para que la parte pura (parseo de texto) sea
  testeable sin Firestore, y la parte de resolución/escritura sea aparte.

### 4.2 Funciones de data layer que falten

- Revisá `src/data/menus.ts` y `src/data/recetas.ts`. Si el importador necesita
  funciones que no existen (buscar receta por `nombreCanonico`, obtener próximo
  `MENU-XXXX` libre, chequear existencia de `idMenu`/`nombreCanonico`, crear menú),
  agregalas ahí con el estilo del resto del data layer.

### 4.3 Pantalla de importación

- Componente de pantalla en la ruta propia (decisión 2).
- `textarea` para pegar el TXT + input `type="file"` que acepte `.txt` y vuelque el
  contenido al textarea (decisión 1).
- Botón "Importar" que dispara parseo + resolución + escritura.
- Área de resultado que muestra, según el caso:
  - Éxito: `idMenu` creado, nombre, cantidad de componentes resueltos.
  - Duplicado: el menú ya existe (con su `idMenu`/`nombreCanonico`).
  - Errores: lista clara de cada error de validación o de resolución, con el texto
    de los mensajes de `MAPEO §3.5` (decisión 6).
- Manejo de estados de carga (parseando / escribiendo) y de error de red.

### 4.4 Punto de entrada en la navegación

- Agregá el acceso a la pantalla (decisión 2), visible solo en modo JP.

### 4.5 Tests

- Tests de la parte **pura** del parseo (separación de bloques, lectura de pares,
  tabla de componentes, defaults, validaciones de formato). No requieren emulador ni
  Firestore — son lógica pura, van junto a los 84 tests de E2.2 y deben sumar a ese
  set sin romperlo.
- Casos mínimos a cubrir: TXT bien formado; falta `nombre`; falta `escenarioUso`;
  sin componente `Principal` obligatorio; `tipo` de componente fuera del enum;
  componente con cross-check `REC-/nombre` que no coincide; `idMenu` AUTO; defaults
  aplicados.
- La resolución contra `/recetas` y la escritura pueden no tener test automatizado
  en esta etapa si requieren emulador — en ese caso, documentá la verificación
  manual en el reporte.

### 4.6 Build + deploy

- `npm run build` sin errores.
- Deploy a producción: `firebase deploy --only hosting`.

---

## 5. Criterios de aceptación

1. Existe un módulo de parseo de menús con la parte pura testeable sin Firestore.
2. La pantalla de importación existe en una ruta propia, accesible desde la UI en
   modo JP, con textarea + carga de archivo `.txt` + botón Importar + área de
   resultado.
3. El parseo aplica defaults, validaciones y resolución de componentes según
   `MAPEO §3.5` (decisiones 4, 6, 7, 9).
4. `componentes[].tipo` usa el enum de 4 valores de `MAPEO §2.3`, no el `tipoItem`
   de recetas.
5. El menú creado respeta el modelo M (sin campos derivados persistidos) y el type
   `Menu` de E2.1.
6. Anti-duplicado por `idMenu` y `nombreCanonico` funciona; un menú ya existente se
   reporta como duplicado, no como error.
7. La escritura pasa por el data layer (`src/data/menus.ts`), no por el SDK directo.
8. Tests de parseo puro en verde, sumados al set de E2.2 sin romper los 84
   existentes (total nuevo > 84).
9. `npm run build` sin errores.
10. Deploy a producción exitoso.
11. Verificación funcional: importar un menú de prueba desde producción crea el doc
    en `/menus` (ver reporte).
12. Commits con prefijo `Stage 2.5:` + push.

---

## 6. Qué NO tocar

- **`firestore.rules`** (E2.3), **`firestore.indexes.json`** (E2.6),
  **`scripts/*`** (E1.0/E2.4): fuera de scope, no se tocan.
- **El data layer de E2.2**: se *extiende* con funciones nuevas si hacen falta
  (decisión 3/4.2), pero NO se modifican las funciones existentes ni `result.ts` ni
  `firebase.ts`.
- **Los types de E2.1**: el importador los *usa*. Si el type `Menu` pareciera
  insuficiente para representar el TXT, NO lo extiendas por tu cuenta — reportalo y
  pará.
- **Los 84 tests de E2.2 y los 31 de E2.3**: no se editan ni se mueven. Los tests
  nuevos se suman.
- **El flujo de creación de planes / selección de menú como plan**: eso es Etapa 5.
  El importador solo crea el doc en `/menus`, nada más.
- **Otras pantallas** (home, recetas, compras, etc.): fuera de scope.
- **El seed `Migracion/30_Seeds.gs`**: solo lectura, no se toca.

---

## 7. Antes de cerrar — reporte esperado

- Tabla de criterios de aceptación (1–12) con estado.
- Ruta final de la pantalla y cómo se llega a ella desde la UI.
- Funciones nuevas agregadas al data layer (si hubo).
- Cantidad de tests nuevos y total del set (debe ser > 84).
- Resultado de la verificación funcional: el TXT de prueba usado y el `idMenu`
  creado en producción.
- Cualquier discrepancia encontrada entre `MAPEO §2.3 / §3.5` y el type `Menu` real
  de E2.1.
- Cualquier `// TODO` que haya quedado en código.
- Lista de commits `Stage 2.5:`.
- Recordatorio para JP: abrir la pantalla en `https://comida-familiar.web.app`,
  importar un menú de prueba, y confirmar en Firebase Console que el doc aparece en
  `/menus` con sus `componentes[]` resueltos.
