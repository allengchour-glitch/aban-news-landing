import json, re, glob

prods=[]
for f in ["/tmp/veg_p1n.json","/tmp/veg_p2.json","/tmp/veg_p3.json","/tmp/veg_p4.json","/tmp/veg_p5.json"]:
    prods += json.load(open(f))
# de-dupe by id
seen={}
for p in prods: seen[p["id"]]=p
prods=list(seen.values())
print("total active products:", len(prods))

# POSITIVE: clearly plant-based or mineral (vegan) materials
POS = re.compile(r'\b(vegan|bambus|bamboo|kork|cork|leinen|linen|baumwoll|cotton|hanf|hemp|jute|canvas|stroh|straw|raffia|rattan|sojawachs|kokoswachs|buchweizen|tencel|lyocell|kapok'
                 r'|naturstein|lavastein|tigerauge|obsidian|achat|onyx|amethyst|bergkristall|rosenquarz|chakra|jade|howlith|haematit|hämatit|mondstein|malachit|aventurin)', re.I)
# NEGATIVE: real animal materials -> never vegan
NEG = re.compile(r'(leder|seide|silk|kaschmir|cashmere|mohair|angora|merino|schurwoll|pelz|fell|daune|bienenwachs|honig|perlmutt)'
                 r'|\b(woll|perl|feder|horn|knochen|elfenbein)', re.I)

ALREADY = {"vegan","bio","gots","bambus"}  # already in the Vegan smart-collection

cands=[]
excluded_neg=[]
for p in prods:
    title=p["title"]
    tags=set(t.lower() for t in (p.get("tags") or []))
    low=title.lower()
    if tags & ALREADY:
        continue  # already in collection (skip redundant tag)
    pos = POS.search(title)
    if not pos:
        continue
    neg = NEG.search(title)
    is_vegan_word = 'vegan' in low
    if neg and not is_vegan_word:
        excluded_neg.append((title, neg.group(0)))
        continue
    cands.append({"id":p["id"],"title":title,"hit":pos.group(0)})

print("VEGAN CANDIDATES:", len(cands))
print("excluded due to animal material:", len(excluded_neg))
from collections import Counter
print("hit distribution:", Counter(c["hit"].lower() for c in cands).most_common())
print("\n--- sample 40 candidates ---")
for c in cands[:40]: print(" +", c["hit"].ljust(10), c["title"][:70])
print("\n--- excluded (animal material) sample ---")
for t,m in excluded_neg[:25]: print(" -", m.ljust(8), t[:70])

json.dump(cands, open("/tmp/veg_candidates.json","w"))
print("\nsaved", len(cands), "candidates")
