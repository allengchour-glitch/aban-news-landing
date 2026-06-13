#!/usr/bin/env python3
import sys, json, re, glob, os

EMOJI=re.compile("["
 "\U0001F000-\U0001FAFF\U00002600-\U000027BF\U00002B00-\U00002BFF"
 "\U0001F1E6-\U0001F1FF\U0000FE0F\U00002190-\U000021FF\U00002300-\U000023FF]+", flags=re.UNICODE)

def clean(s):
    s=EMOJI.sub("", s or "")
    return re.sub(r"\s{2,}"," ",s).strip(" ·-–—")

def gq(s):  # escape for GraphQL double-quoted string
    return s.replace("\\","\\\\").replace('"','\\"')

def title_bad(t):
    if not t: return True
    if t.strip().endswith("…") or t.strip().endswith("..."): return True
    # autogen Signatur: kein Marker UND mehrfaches " – "
    has_marker = ("|" in t) or ("CHF" in t) or ("LuxeStyle" in t)
    if not has_marker and t.count(" – ")>=1: return True
    if not has_marker and len(t)>62: return True
    return False

def desc_bad(d):
    if not d: return True
    d=d.strip()
    if d.endswith("…") or d.endswith("..."): return True
    if "schnelle Lieferung. Jetzt" in d: return True
    if "schnelle Lieferung" in d and "–10%" in d and "…" in d: return True
    return False

def mk_title(name):
    n=clean(name)
    if len(n)>50:
        cut=n[:50]
        if " " in cut: cut=cut[:cut.rfind(" ")]
        n=cut
    n=n.rstrip(" ,;:·–-")
    return (n+" | LuxeStyle")[:70]

def mk_desc(name, ptype):
    n=clean(name)
    base=f"{n}: jetzt im Schweizer Online-Shop LuxeStyle. Faire Preise, schnelle Lieferung (7–14 Tage), 30 Tage Rückgabe. −10% mit Code WELCOME10."
    return base[:315]

def load(files):
    nodes=[]; last={}
    for f in files:
        raw=open(f,encoding="utf-8").read()
        data=json.loads(raw[raw.index("{"):])["data"]["products"]
        nodes+=data["nodes"]; last=data.get("pageInfo",{})
    return nodes, last

def main():
    files=sorted(glob.glob("/tmp/seopage_*.txt"))
    if not files:
        print("keine Seiten-Dateien /tmp/seopage_*.txt"); return
    nodes,last=load(files)
    fixes=[]
    for n in nodes:
        seo=n.get("seo") or {}
        if title_bad(seo.get("title")) or desc_bad(seo.get("description")):
            fixes.append((n["id"], mk_title(n["title"]), mk_desc(n["title"], n.get("productType",""))))
    print(f"Produkte gesamt: {len(nodes)} · zu fixen: {len(fixes)}")
    print(f"letzte Seite hasNextPage={last.get('hasNextPage')} endCursor={last.get('endCursor')}")
    # Batch-Mutationen schreiben (20 pro Datei)
    B=20; nb=0
    for i in range(0,len(fixes),B):
        chunk=fixes[i:i+B]; nb+=1
        parts=["mutation {"]
        for j,(pid,t,d) in enumerate(chunk):
            parts.append(f'  f{j}: productUpdate(input: {{ id: "{pid}", seo: {{ title: "{gq(t)}", description: "{gq(d)}" }} }}) {{ product {{ id }} userErrors {{ field message }} }}')
        parts.append("}")
        open(f"/tmp/seofix_{nb:02d}.txt","w",encoding="utf-8").write("\n".join(parts))
    print(f"{nb} Mutations-Dateien /tmp/seofix_*.txt geschrieben")

if __name__=="__main__":
    main()
