#!/usr/bin/env python3
"""Reparatur-Lauf über schon geduzte Produkttexte (22.09.2026).

Warum: Die Regeln in um() sind heute mehrfach gewachsen (2c-Reihenfolge, 2d/2g/2h, dativ-reflexive Verben).
Texte, die VOR diesen Regeln geschrieben wurden, tragen Defekte wie «entscheidst du sich», «So tragen du»,
«Schaust du sich». Ein Nachscan über 150 Produkte fand 3 (2 %). Der Lauf liest jeden Eintrag aus
dropship/_du_form_done.txt (du/teilweise = Defekte suchen; verdacht/um-ohne-wirkung = mit den neuen Regeln
erneut versuchen), wendet um() + Imperativ-Reparatur an, schreibt nur bei Änderung UND ohne Warnmuster,
liest zurück. Idempotent über dropship/_du_form_reparatur_done.txt (Container startet stündlich neu).
Hält /tmp/lock_produkttext.lock (kein zweiter Schreiber am selben Text).  DRY=1 zeigt nur.  CAP=n je Lauf.
"""
import fcntl, os, re, sys, time
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "automation"))
from kollektionstexte_du_form import um  # noqa: E402
from produkttexte_du_form import WARN, WARN4, warn2, warn3, gql, text, SIE  # noqa: E402
DRY = os.environ.get("DRY") == "1"
CAP = int(os.environ.get("CAP", "4000"))
LEDGER = os.path.join(REPO, "dropship", "_du_form_done.txt")
RLEDGER = os.path.join(REPO, "dropship", "_du_form_reparatur_done.txt")
BERICHT = os.path.join(REPO, "dropship", "DU-FORM-REPARATUR.md")
IMP = {'hören': 'hör', 'schauen': 'schau', 'nehmen': 'nimm', 'lassen': 'lass', 'geben': 'gib', 'lesen': 'lies',
       'sehen': 'sieh', 'halten': 'halt', 'gönnen': 'gönn', 'werfen': 'wirf'}
DEFEKT = re.compile(r'\bdu sich\b|\bdu du\b|\bdenst\b|(?<=[–—:\-] )[a-zäöüß]{3,}(?:en|ern|eln) du\b')


def imp(v):
    if v in IMP: return IMP[v]
    if v.endswith('eln'): return v[:-3] + 'le'
    if v.endswith('ern'): return v[:-1] + 'e'
    return v[:-2] + 'e' if v.endswith('en') else v


_EI = ('nimm', 'gib', 'lies', 'sieh', 'wirf', 'hilf', 'sprich', 'triff', 'iss', 'brich', 'stirb', 'miss', 'vergiss', 'befiehl', 'empfiehl', 'tritt')
_UML = {'träg': 'trag', 'fähr': 'fahr', 'schläf': 'schlaf', 'hält': 'halt', 'läuf': 'lauf', 'wäsch': 'wasch', 'fäng': 'fang',
        'läss': 'lass', 'schläg': 'schlag', 'bläs': 'blas', 'rät': 'rat', 'wächs': 'wachs', 'fäll': 'fall', 'stöss': 'stoss', 'stöß': 'stoß'}


def imp_aus_zweiter(w):
    """«Tragst» → «Trag», «Stellst» → «Stelle», «Nimmst» → «Nimm», «Geniesst» → «Geniesse» — sonst None."""
    wl = w.lower()
    if wl.endswith('st') and wl[-3:-2] not in ('s', 'ß', 'z', 'x'): stem = wl[:-2]
    elif wl.endswith('t') and wl[-2:-1] in ('s', 'ß', 'z', 'x'): stem = wl[:-1]
    else: return None
    if len(stem) < 3 or stem in ('is', 'bi', 'ha', 'mus', 'kann', 'will', 'soll', 'darf', 'wir', 'möchte', 'sollte', 'könnte', 'würde'): return None
    if any(stem.endswith(e) for e in _EI): i = stem
    else:
        for k, v in _UML.items():
            if stem.endswith(k): stem = stem[:-len(k)] + v; break
        i = stem if stem.endswith('e') else stem + 'e'
    return (i[0].upper() + i[1:]) if w[0].isupper() else i


def _satzanfang(m):
    w, refl = m.group(2), m.group(3)
    if not w[0].isupper() and not m.group(1).rstrip().lower().endswith(('bitte', 'und', 'oder')): return m.group(0)
    # Konditional-Inversion «Trägst du es täglich, freut sich die Haut» (= wenn du …): nach dem Komma folgt ein
    # finites Verb an erster Stelle → kein Imperativ-Artefakt, nicht anfassen
    if w[0].isupper() and re.search(r',\s*(?:dann |so |und )?(?!damit|dass|sodass|sobald|bevor|nachdem|während|solange|obwohl|weil|wenn|falls|statt|seit|mit|nicht|bereit|jetzt|erst|fast|meist|selbst|sonst|oft|direkt|sofort|heute)(?:[a-zäöüß]{3,}(?:t|st|en)|sind|ist|hat|kann|wird|muss|soll|darf)\s', re.split(r'[.!?]|</p>|<br|</li>|</h', m.string[m.end():], 1)[0]): return m.group(0)
    i = imp_aus_zweiter(w)
    if not i: return m.group(0)
    if refl:
        # Dativ wie in um()._imp: dative Verben oder Nomen/Artikel/Mengenwort danach («Nimm dir Zeit», «Gönn dir eine Pause»)
        nach = m.string[m.end():m.end() + 30].strip().split(' ')[0] if m.string[m.end():m.end() + 30].strip() else ''
        _DATIV = ('schau', 'nimm', 'gönn', 'merk', 'stell', 'hol', 'sicher', 'such', 'leist', 'überleg', 'hör', 'sieh', 'kauf', 'besorg', 'bestell', 'notier', 'wünsch', 'spar', 'erspar', 'verdien', 'erlaub')
        dativ = refl == 'dir' or any(i.lower().startswith(d) or i.lower().endswith(d) for d in _DATIV) \
            or bool(re.match(r'^(ein|eine|einen|einem|einer|etwas|mehr|genug|die|das|den|dem|der|Zeit|Ruhe|[A-ZÄÖÜ])', nach))
        return m.group(1) + i + (' dir' if dativ else ' dich')
    return m.group(1) + i


def _satz(ms):
    # Alt-Defekt (Regeln vor 2h): «Tragen Sie es einzeln» wurde «Tragst du es einzeln» — Satzanfang ohne Fragezeichen
    # im Satz = Imperativ gemeint; «Entspannst du sich» → «Entspann dich»; «Bitte stellst du sicher» → «Bitte stelle sicher»
    satz = ms.group(0)
    if '?' in satz: return satz
    if True:
        satz = re.sub(r'^((?:<[^>]+>|\s|[–—•·])*(?:[Bb]itte )?)([A-Za-zÄÖÜäöü][a-zäöüß]{2,}(?:st|[sßzx]t)) du(?: (sich|dich|dir))?\b(?! (?:und|oder)\b)', _satzanfang, satz)
        # «Dann schaust du dir doch gleich unser Angebot an.» (alt: «schauen Sie sich») → «schau dir»; Inversion
        # schaust/siehst + du + dir gibt es in Aussagesätzen nur als Imperativ-Artefakt
        satz = re.sub(r'\b([Ss])(?:chaust|iehst) du (?:dir|dich)\b', lambda m: (m.group(1) + ('chau' if m.group(0)[1] == 'c' else 'ieh')) + ' dir', satz)   # anschauen/ansehen = Dativ
        # «… und stellst du dir vor» (alt: «und stellen Sie sich vor») → «und stell dir vor»
        satz = re.sub(r'((?:\bund|\boder) )([a-zäöüß]{2,}(?:st|[sßzx]t)) du(?: (sich|dich|dir))?\b(?! (?:und|oder)\b)', _satzanfang, satz)
        return re.sub(r'\b(finde|wähle|suche|entdecke|sichere|hol|hole|kaufe|bestelle|reserviere|gönne|nimm)((?:\s|<[^>]+>)+)für sich\b', r'\1\2für dich', satz)


_BLOCK = re.compile(r'</?(?:p|li|h[1-6]|div|br|ul|ol|td|th|table|tr|blockquote|section)\b', re.I)


def saetze(html_, fn):
    """Satzweise anwenden. Ein Satz endet an Satzzeichen + Leerraum oder an einem Blockelement-Tag; Inline-Tags
    (<a>, <strong>) bleiben Teil des Satzes — sonst trennt ein </a> mitten im Satz «findest du <a>für dich</a>»
    vom Rest, und das «?» am Satzende steht in einem anderen Knoten (22.09.)."""
    out, cur = [], []
    def flush():
        if cur:
            satz = ''.join(cur); cur.clear()
            out.append(fn(re.match(r'[\s\S]*', satz)))
    for tok in re.split(r'(<[^>]+>)', html_):
        if not tok: continue
        if tok.startswith('<'):
            if _BLOCK.match(tok): flush(); out.append(tok)
            else: cur.append(tok)
            continue
        teile = re.split(r'((?<=[.!?])\s+)', tok)
        for k, tl in enumerate(teile):
            if k % 2 == 1: cur.append(tl); flush()
            elif tl: cur.append(tl)
    flush()
    return ''.join(out)


def repariere(html_):
    t = saetze(html_, _satz)
    t = re.sub(r'(?<=[–—:\-] )([a-zäöüß]{3,}(?:en|ern|eln)) du (dich|dir)\b', lambda m: imp(m.group(1)) + ' ' + m.group(2), t)
    t = re.sub(r'(?<=[–—:\-] )([a-zäöüß]{3,}(?:en|ern|eln)) du\b', lambda m: imp(m.group(1)), t)
    # nach um(): «bestelle heute und erhältst du es morgen» (Regel 0 sah Indikativ, der Satz ist Imperativ) → «und erhalte es»
    return saetze(um(t), _satz)


def quitt(h, was):
    if DRY: return
    with open(RLEDGER, "a") as f:
        f.write(f"{h}\t{time.strftime('%Y-%m-%d')}\t{was}\n")


def ledger_umschreiben(neu_stand):
    """Zustände verdacht:/um-ohne-wirkung im Haupt-Ledger auf das neue Ergebnis setzen (Pfad-basiert, atomar)."""
    if DRY or not neu_stand: return
    zeilen = open(LEDGER).read().splitlines()
    out = []
    for z in zeilen:
        t = z.split("\t")
        if len(t) >= 3 and t[0] in neu_stand:
            t[1] = time.strftime("%Y-%m-%d"); t[2] = neu_stand[t[0]]; z = "\t".join(t)
        out.append(z)
    tmp = LEDGER + ".tmp"
    with open(tmp, "w") as f: f.write("\n".join(out) + "\n")
    os.replace(tmp, LEDGER)


def main():
    if not os.path.exists(LEDGER): print("kein Ledger"); return 0
    rdone = set()
    if os.path.exists(RLEDGER):
        rdone = {z.split("\t")[0] for z in open(RLEDGER) if z.strip()}
    prio = os.path.join(REPO, "dropship", "_cj_specs_prio.txt"); pdone = os.path.join(REPO, "dropship", "_cj_specs_done.txt")
    offen_fakt = set()
    if os.path.exists(prio):
        offen_fakt = {z.split("\t")[0].strip() for z in open(prio) if z.strip()}
        if os.path.exists(pdone): offen_fakt -= {z.split("\t")[0].strip() for z in open(pdone) if z.strip()}
    lk = open("/tmp/lock_produkttext.lock", "w")
    if not DRY: fcntl.flock(lk, fcntl.LOCK_EX)   # ERST den Text-Lock (der laufende Du-Form-Lauf schreibt mit alten Regeln), DANN das Ledger lesen
    arbeit = []
    for z in open(LEDGER):
        t = z.rstrip("\n").split("\t")
        if len(t) < 3: continue
        h, st = t[0], t[2]
        if h in rdone or h in offen_fakt: continue
        if st in ("du", "teilweise") or st == "um-ohne-wirkung" or st.startswith("verdacht:"):
            arbeit.append((h, st))
    print(f"Reparatur offen: {len(arbeit)} (quittiert {len(rdone)}) · CAP {CAP} · {'DRY' if DRY else 'SCHREIBEN'}")
    if not arbeit: print("FERTIG: alle Einträge geprüft"); return 0
    n_rep = n_same = n_warn = n_skip = n_err = 0
    neu_stand = {}; verdacht = []
    if True:
        for h, st in arbeit[:CAP]:
            try:
                d = gql('query($h:String!){productByHandle(handle:$h){id status descriptionHtml}}', {"h": h})
                p = (d.get("data") or {}).get("productByHandle")
                if not p or p["status"] != "ACTIVE":
                    n_skip += 1; quitt(h, "nicht-aktiv"); continue
                alt = p["descriptionHtml"] or ""
                neu = repariere(alt)
                tn = text(neu)
                if neu == alt:
                    n_same += 1
                    m = DEFEKT.search(text(alt)) or WARN4.search(text(alt))
                    quitt(h, f"unveraendert-defekt:{m.group(0)}" if m else "unveraendert"); continue
                m = WARN.search(tn) or warn2(tn) or warn3(tn) or WARN4.search(tn) or DEFEKT.search(tn)
                if m:
                    n_warn += 1; i = max(0, m.start() - 60)
                    verdacht.append((h, m.group(0), tn[i:m.end() + 60])); quitt(h, f"verdacht:{m.group(0)}"); continue
                if DRY:
                    n_rep += 1; print(f"  [DRY] {h[:60]} ({st[:12]})"); continue
                r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{descriptionHtml} userErrors{message}}}',
                        {"i": {"id": p["id"], "descriptionHtml": neu}})
                pu = ((r.get("data") or {}).get("productUpdate") or {})
                if pu.get("userErrors") or (pu.get("product") or {}).get("descriptionHtml") != neu:
                    n_err += 1; print(f"  FEHLER {h}: {pu.get('userErrors')}"); continue
                n_rep += 1; quitt(h, "repariert")
                if st not in ("du", "teilweise"):
                    neu_stand[h] = "teilweise" if SIE.search(tn) else "du"
            except Exception as e:  # noqa: BLE001
                n_err += 1; print(f"  FEHLER {h}: {type(e).__name__}: {str(e)[:100]}")
                if n_err >= 15: print("ABBRUCH: 15 Fehler"); break
            time.sleep(0.25)
        ledger_umschreiben(neu_stand)
    if verdacht and not DRY:
        neu_ = not os.path.exists(BERICHT)
        with open(BERICHT, "a") as f:
            if neu_: f.write("# Du-Form-Reparatur: verdächtige Wandlungen (NICHT geschrieben)\n\n| Handle | Muster | Kontext |\n|---|---|---|\n")
            for h, mu, ctx in verdacht: f.write(f"| `{h}` | {mu} | …{ctx.replace('|', '/')}… |\n")
    print(f"REPARATUR: {n_rep} {'reparierbar' if DRY else 'repariert'} · {n_same} unverändert · {n_warn} Verdacht · {n_skip} nicht aktiv · {n_err} Fehler")
    rest = len(arbeit) - min(len(arbeit), CAP)
    print("FERTIG: alle Einträge geprüft" if rest == 0 and not n_err else f"offen: {rest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
