# Comidas Familiares

App de planificación de comidas familiares. Firebase + React + Vite.

---

## Scripts de datos (requieren `scripts/service-account.json`)

### `npm run seed:firestore`

Importa el catálogo completo desde `Migracion/30_Seeds.gs` a Firestore: recetas, ingredientes, pasos y menús.

```
npm run seed:firestore            # escribe en Firestore
npm run seed:firestore -- --dry-run  # solo imprime, no escribe
```

### `npm run seed:planes`

Inserta planes de prueba para E3.1 (Home modo JP): 1 Especial + 1 Especial extra + 1 En proceso, todos para la semana en curso. Marcados con `notas: "[PRUEBA E3.1]"`.

```
npm run seed:planes                             # estado Elegida (default)
npm run seed:planes -- --estado "Cocinada"      # otro estado válido
npm run seed:planes -- --estado "Compra lista"
npm run seed:planes -- --clean                  # borra los 3 planes de prueba
```

**IDs de los planes de prueba:**
- `PLAN-TEST-E31-ESP` — Especial (REC-0001 / Bondiola braseada al Malbec)
- `PLAN-TEST-E31-EXT` — Especial extra (REC-0101 / Langostinos al ajillo)
- `PLAN-TEST-E31-ENP` — En proceso (REC-0201 / Berenjenas grilladas con criolla y oliva)

> Cuando E3.3 esté lista y se puedan crear planes reales, correr `--clean` para limpiar estos datos de prueba.

---

## Tests

```
npm run test:run      # suite principal (unit tests)
npm run test:rules    # reglas de Firestore con emulador
npm run test:all      # ambas
```

---

## Deploy

```
npm run build
firebase deploy --only hosting
```
