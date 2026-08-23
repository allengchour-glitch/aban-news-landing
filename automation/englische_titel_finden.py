import json,re
DE={w.strip().lower() for w in open('/tmp/de_words.txt') if len(w.strip())>2}
EN={w.strip().lower() for w in open('/tmp/en_words.txt') if len(w.strip())>2}
NUR_EN=EN-DE; NUR_DE=DE-EN
DE4={w for w in DE if len(w)>=4}
tok=re.compile(r"[A-Za-zÄÖÜäöüß]{3,}")

def deutsch_kompositum(w):
    """«Autoscheinwerfer» = Auto+scheinwerfer, «Hundebett» = Hunde+bett.
    Deutsche Zusammensetzungen stehen in KEINER Wortliste — genau die Falle,
    an der der erste Entwurf 45 Fehltreffer produziert hat."""
    if len(w) < 8: return False
    for i in range(4, len(w)-3):
        a,b = w[:i], w[i:]
        if a in DE4 and b in DE4 and (a in NUR_DE or b in NUR_DE):
            return True
        if a.rstrip('esn') in DE4 and b in DE4 and b in NUR_DE:
            return True
    return False

out=[]
for ln in open('/tmp/hc_prods.jsonl'):
    o=json.loads(ln); t=o['t']
    if '«' in t: continue                 # eigene POD-/Motivbenennung, Absicht
    ws=[w.lower() for w in tok.findall(t)]
    if len(ws)<2: continue
    if any(w in NUR_DE or deutsch_kompositum(w) for w in ws): continue
    en=[w for w in ws if w in NUR_EN]
    if len(en)<2: continue
    if len(en) < len(ws)-1: continue
    out.append((o['id'],t))
print(len(out)); json.dump(out,open('/tmp/engl_titel.json','w'),ensure_ascii=False)
for i,t in out: print(i,t)
