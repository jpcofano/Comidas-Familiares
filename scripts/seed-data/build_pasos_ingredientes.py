#!/usr/bin/env python3
"""
E9.14 Fase 2 — Builder del linkage paso<->ingrediente (read-only, no Firestore).
Lee el snapshot y emite scripts/pasos_ingredientes.json.

Criterio: PRECISION sobre cobertura.
- Candidatos de cada paso = SOLO los ingredientes de su propia receta -> 0 huérfanos por construcción.
- Token ambiguo dentro de la receta (aparece en >=2 ingredientes) -> se descarta (abstención, no se adivina).
- Palabras función / verbos de cocción / clases genéricas -> nunca taggean.
- Paso sin match -> sin tag -> la UI cae a la lista completa (red (a) de Fase 1).
"""
import json, unicodedata, re
from collections import Counter

SNAP = "scripts/snapshots/2026-06-19"
recs = json.load(open(f"{SNAP}/recetas.json"))
cat  = json.load(open(f"{SNAP}/ingredientes.json"))
catById = {c["idIngrediente"]: c for c in cat}

STOP = {
 "de","la","el","los","las","un","una","con","sin","al","del","y","o","a","en","su","sus",
 "para","por","que","se","lo","le","mas","muy","bien","cada","sobre","hasta","desde","entre",
 "agregar","sumar","cocinar","dorar","retirar","servir","mezclar","cortar","picar","salar",
 "calentar","tapar","cocer","reservar","volver","incorporar","colar","escurrir","batir",
 "fresco","seco","picado","rallado","molido","grande","chico","entero","fina","gruesa",
 "gusto","cantidad","trozo","minuto","fuego","olla","sarten","horno",
 "carne","verdura","liquido","plato","pieza",
}

def norm(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii","ignore").decode().lower()
    return re.sub(r"[^a-z0-9 ]", " ", s)
def sing(t):
    if len(t) > 4 and t.endswith("es"): return t[:-2]
    if len(t) > 3 and t.endswith("s"):  return t[:-1]
    return t
def ctoks(s, m=3):
    out = set()
    for t in norm(s).split():
        if len(t) < m: continue
        t = sing(t)
        if t in STOP: continue
        out.add(t)
    return out
def vocab(idi, to):
    c = catById.get(idi, {}); v = set()
    for f in (c.get("nombrePreferido",""), c.get("canonico","")): v |= ctoks(f)
    for s in (c.get("sinonimos") or []): v |= ctoks(s)
    v |= ctoks(to)
    return v

out = {}; tot = tag = rct = orph = 0
for r in recs:
    idR = r.get("idReceta"); pasos = r.get("pasos") or []; ings = r.get("ingredientes") or []
    if not idR or not pasos or not ings: continue
    valid = {i["idIngrediente"] for i in ings if i.get("idIngrediente")}
    voc = {i["idIngrediente"]: vocab(i["idIngrediente"], i.get("textoOriginal",""))
           for i in ings if i.get("idIngrediente")}
    freq = Counter(t for vv in voc.values() for t in vv)          # ambigüedad intra-receta
    voc = {idi: {t for t in vv if freq[t] == 1} for idi, vv in voc.items()}
    rh = False
    for p in pasos:
        tot += 1
        st = {sing(t) for t in norm(p.get("detalle","")).split()}
        hits = [idi for idi, vv in voc.items() if vv & st]
        seen = set(); hits = [h for h in hits if not (h in seen or seen.add(h))]
        if hits:
            for h in hits:
                if h not in valid: orph += 1
            out.setdefault(idR, {})[str(p.get("nroPaso"))] = hits
            tag += 1; rh = True
    if rh: rct += 1

assert orph == 0, f"VIOLACIÓN: {orph} ids huérfanos emitidos"
payload = {
  "generadoDe": SNAP,
  "criterio": "precision-sobre-cobertura; candidatos=ingredientes de la propia receta; token ambiguo intra-receta descartado; abstención ante la duda; 0 huérfanos por construcción",
  "stats": {"pasosTotales": tot, "pasosTaggeados": tag,
            "coberturaPct": round(100*tag/tot, 1), "recetasConTag": rct,
            "orphanViolations": orph},
  "recetas": out,
}
json.dump(payload, open("scripts/pasos_ingredientes.json","w"), ensure_ascii=False, indent=2)
print(json.dumps(payload["stats"], indent=2))
