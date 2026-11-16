import re, sys, json
logs = sys.argv[1:]
mut = {x[0].split(' ')[0]: x[0] for x in json.load(open('test/mutanten.json'))}
zeilen = {}
basis = None
for f in logs:
    for l in open(f):
        if l.startswith('Ausgangslage'): basis = l.strip()
        m = re.match(r'\d\d:\d\d:\d\d (M\d\d) (.*?) => (erkannt|ÜBERLEBT) \| (.*)', l)
        if not m: continue
        mid, name, erg, rest = m.groups()
        pr = []
        for t in re.findall(r'FEHLER: (?:(desktop|handy|tablet) )?(T\d+[a-z]?)', rest):
            pr.append((t[0] + ' ' if t[0] else '') + t[1])
        # gleiche Prüfung über Formen zusammenfassen
        ids = []
        for p in pr:
            i = p.split(' ')[-1]
            if i not in ids: ids.append(i)
        zeilen[mid] = (mut.get(mid, mid + ' ' + name), erg, ids)
print('Ausgangslage:', basis)
er = sum(1 for v in zeilen.values() if v[1] == 'erkannt'); ue = sum(1 for v in zeilen.values() if v[1] != 'erkannt')
print(f'{er} erkannt, {ue} überlebt, von {len(zeilen)} (Liste {len(mut)})')
print('| Mutant | Ergebnis | erkannt von |\n|---|---|---|')
for k in sorted(zeilen):
    n, e, ids = zeilen[k]
    print(f'| {n} | {e} | {", ".join(ids)} |')
fehlt = [k for k in mut if k not in zeilen]
if fehlt: print('FEHLT:', fehlt)
