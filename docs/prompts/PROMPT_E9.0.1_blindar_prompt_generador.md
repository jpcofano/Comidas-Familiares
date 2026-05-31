# PROMPT E9.1 — Blindar el prompt del generador de recetas (categorías cerradas, ingredientes extensibles)

> **App:** Comida Familiar — proyecto Firebase `comida-familiar`.
> **MAPEO vigente:** confirmar número exacto al abrir.
> **Depende de:** E9.0 ya aplicado (proteínas jerárquicas de 10 hojas + diccionario canónico de 265 ingredientes).
> **Archivo a tocar:** `scripts/seed-config-importador.ts` (constante `PROMPT_LLM`) → re-seed `/config/importador.promptLLM`.
> **Adjunto:** `diccionario_canonico.json` (para extraer la lista de ingredientes sugeridos).

## Qué resuelve

El `PROMPT_LLM` actual es el texto que JP pega en ChatGPT/Claude **antes** de importar
una receta. Hoy tiene dos huecos que generan basura de datos:

1. **`proteinaPrincipal` desactualizado:** todavía lista los 13 valores viejos
   (`Pollo, Fiambre, Mixta, Vegetariana...`). Debe pasar a las **10 hojas de E9.0**.
2. **Ingredientes libres → duplicados:** el LLM inventa nombres ("Muslos de pollo",
   "Líquidos") que el matcher literal no encuentra, y crea ingredientes nuevos en vez de
   matchear los existentes. Hay que darle el **vocabulario canónico como preferencia**.

## Principio rector (NO encerrar ingredientes)

La distinción es deliberada y debe quedar clara en el prompt:

- **Campos de CLASIFICACIÓN → CERRADOS.** El LLM elige solo de la lista. Nunca inventa.
  Aplica a: `tipoItem`, `proteinaPrincipal`, `escenarioUso`, `dificultad`, `costoEstimado`,
  `aptoNocheDeADos`, `climaDelPlato`, `pensadaPara`, `cocina`.
- **INGREDIENTES → ABIERTOS pero GUIADOS.** El LLM **prefiere** el nombre canónico si el
  ingrediente ya existe (reduce duplicados), pero **si no está, lo agrega** — y al
  agregarlo, lo clasifica con las **dimensiones cerradas** (categoria/rol/góndola).
  El ingrediente nunca se fuerza a un match malo ni se descarta.

## Cambios concretos al `PROMPT_LLM`

### 1. Actualizar la línea `proteinaPrincipal`

Reemplazar la lista vieja por:

```
proteinaPrincipal: [uno de exactamente: Vacuna, Cerdo, Cordero, Aves, Pescado, Mariscos, Huevos, Legumbres, Semillas, Frutos secos, Vegetal]
```

Agregar nota debajo:
```
  (Vacuna/Cerdo/Cordero = carnes rojas · Aves = pollo/pavo/pato · Vegetal = sin proteína animal, p.ej. guarniciones y postres)
```

### 2. Agregar campos de dieta (de E9.0)

Después de `hidratos:`, agregar:
```
esVegetariano: [Sí o No — Sí si no lleva ninguna proteína animal]
```
(`esKeto` se deriva en la app desde `hidratos`, no lo pide el LLM.)

### 3. Bloque nuevo de INGREDIENTES con vocabulario canónico

Insertar **antes** de la sección `#INGREDIENTES` del formato, un bloque de instrucciones:

```
══════════════════════════════════════════════
REGLAS PARA INGREDIENTES (importante — evita duplicados):

1. USÁ EL NOMBRE CANÓNICO si el ingrediente ya existe en la lista de abajo.
   Ejemplos: escribí "Tomate" (no "tomatito", "tomate perita", "tomates");
   "Pollo" o el corte exacto (no "muslos de pollo" como sección);
   "Aceite de oliva" (no "un chorrito de oliva").

2. SI EL INGREDIENTE NO ESTÁ en la lista, agregalo igual con su nombre claro
   en singular y sin marca. NO lo fuerces a parecerse a otro. Pero clasificalo
   SIEMPRE con las tres dimensiones cerradas de abajo (categoria, rol, góndola).

3. El campo "seccion" del ingrediente (Principal, Base de sabor, etc.) es la
   sección DENTRO de la receta — no confundir con la góndola.

DIMENSIONES CERRADAS PARA CLASIFICAR INGREDIENTES (elegí solo de estas):

categoria (17): Aceite y grasa · Caldo y fondo · Carne · Cereal y derivado ·
  Condimento y aderezo · Despensa varios · Endulzante · Fiambre y embutido ·
  Fruta · Hierba y especia · Huevo · Lacteo · Legumbre · Pescado y marisco ·
  Semilla y fruto seco · Utensilio · Verdura

rolNutricional (6): Proteina · Neutro · Grasa · Fibra/Vegetal · Hidrato · Azucar/Dulce

seccionGondola (9): Verduleria · Carniceria · Pescaderia · Fiambreria ·
  Lacteos y frescos · Almacen / secos · Panaderia · Despensa / otros · Bazar / otros

CRITERIOS (igual que el diccionario canónico):
- categoria por uso culinario, no botánico (palta y tomate = Verdura).
- productos compuestos por su forma final (passata = Despensa, no Verdura).
- rol independiente de categoria (palta = Verdura pero rol Grasa).
- góndola por dónde se compra.

INGREDIENTES CANÓNICOS DISPONIBLES (preferí estos nombres si aplican):
[INSERTAR AQUÍ la lista de nombres canónicos del diccionario, agrupada por categoria.
 Code la genera desde diccionario_canonico.json — campo nombrePreferido.
 Formato compacto: "Carne: Bondiola, Carré de cerdo, Chorizo, ... · Verdura: Acelga, Ajo, ..."]
══════════════════════════════════════════════
```

### 4. Extender el formato `#INGREDIENTES` con las 3 dimensiones

Hoy el formato de ingrediente no pide categoria/rol/góndola. Para que un ingrediente
nuevo se pueda clasificar sin intervención, agregar columnas opcionales al final:

```
seccion | ingrediente | preparacion | cantidad | unidad | opcional | notas | categoria | rolNutricional | seccionGondola
```

Instrucción: las últimas 3 columnas **solo se completan si el ingrediente es nuevo**
(no está en la lista canónica). Si es canónico, se dejan vacías — la app las toma del
diccionario. Esto evita que el LLM pise la clasificación de ingredientes ya establecidos.

### 5. Actualizar el EJEMPLO del prompt

Ajustar el ejemplo "Pollo al curry rojo": `proteinaPrincipal: Aves` (era `Pollo`),
agregar `esVegetariano: No`, y mostrar un ingrediente nuevo con sus 3 dimensiones
completas y uno canónico con las 3 vacías, para que el patrón quede claro.

## Diagnóstico previo obligatorio

Antes de reescribir, Code debe pegar:
- El `promptLLM` actual completo desde `/config/importador` (Console).
- Confirmar que el parser (`src/import/parseReceta.ts`) tolera las 3 columnas nuevas
  opcionales sin romper imports viejos (retrocompatibilidad: filas sin esas columnas
  siguen funcionando).

## Reglas de aceptación (evidencia copy-paste)

- Pegar el `promptLLM` nuevo y confirmar que `proteinaPrincipal` lista las 10 hojas.
- Probar el prompt con UNA receta real (pegarla en el LLM) y mostrar que: (a) usó nombres
  canónicos donde existían, (b) un ingrediente nuevo trae sus 3 dimensiones.
- Importar esa receta y confirmar en Console que no se crearon ingredientes duplicados
  de los que ya existían en el diccionario.

## Sincronización (recordatorio E5.2)

Este cambio toca el punto (3) de los 4 de sincronización de proteínas. Confirmar que los
otros 3 (`models.ts`, `/config/diccionarios.proteinas`, parser) ya quedaron alineados
en E9.0. El re-seed se corre con `--force` (sobreescribe el promptLLM existente).

## MAPEO_FIRESTORE.md (mismo commit)

Entrada **E9.1**: el prompt del generador ahora embebe el vocabulario canónico.
Documentar la distinción clave: clasificación cerrada / ingredientes extensibles con
dimensiones cerradas. Esto cierra el loop del matcher (un ingrediente nuevo entra ya
clasificado, no como ambiguo a resolver después).

## Commit sugerido

`Stage 9.1: prompt importador con vocabulario canónico (clasif. cerrada, ingredientes extensibles)`

---

## Cierre de la sesión (obligatorio al terminar)

1. **Commit:** `Stage 9.1: prompt importador con vocabulario canónico` + MAPEO E9.1 en el mismo commit.
2. **Push:** `git push` — repo remoto = local.
3. **Deploy:** el cambio es solo del `promptLLM` en Firestore (lo escribe el script con `--force`). Si no se tocó código del front, **no hace falta `firebase deploy`**; si se tocó el parser (`parseReceta.ts`), entonces sí: `npm run build && firebase deploy --only hosting`.
4. **Reportar:** hash del commit, confirmación de push, y si hubo deploy o no (con motivo).
