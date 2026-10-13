#!/usr/bin/env python3
"""google_bildtausch_bilanz.py — Trefferquote des Google-Bildtauschs JE LEDGER-ART (05.10.2026, Prüfer).

Frage: Wie viele der getauschten Produkte stehen nach dem jüngsten Google-Vollscan (`google_feedback_wache.py`,
Stand `dropship/_google_feedback_stand.json`) noch in einer Bild-/Adult-Klasse? Getrennt nach Art, denn die Urteile haben
verschiedene Grundlagen: `tausch` = Gemini + ChatGPT einig · `tausch-g` = Gemini allein · `tausch-q` = Groq-Vision allein ·
`kontrolle`/`uneinig` = unberührt (Vergleichsgruppe). Zählt nur Tausche, die VOR dem Scan-Stand lagen (ein Tausch nach dem
Scan kann noch nicht gemessen sein). Schreibt nichts. Eine Zeile «BILDTAUSCH-QUOTE …» für den Aufseher.

13.10.2026 (Urteil B1): «frei» war geschönt. (1) «Image under review» ist die Prüf-Warteschlange bei Google — das neue Bild
ist noch NICHT beurteilt; diese Produkte zählen jetzt als eigene Gruppe «in Prüfung» (Stand-Feld handles_wartet, ohne
Deckel; Altstand: handles). (2) Produkte, die nicht mehr ACTIVE oder nicht mehr im Google-Kanal (Publication 302872297857)
sind, sieht Google gar nicht mehr → Gruppe «weg» (live gemessen, productByIdentifier). Quote = frei / (Anzahl − weg).
Reihenfolge der Gruppen: weg → blockiert → in Prüfung → frei. Ohne Shopify-Antwort: «weg ?» und keine Abzüge.
Format je Art: «tausch 100/140 frei (71 %) +18 Prüf −7 weg».
"""
import datetime as dt, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bildtausch_sperre as bs

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STAND = os.path.join(REPO, "dropship/_google_feedback_stand.json")
KLASSEN = ("Inappropriate image", "Restricted adult content", "Personalized advertising: Sexual interests", "Promotional overlay on image")
ARTEN = ("tausch", "tausch-g", "tausch-q", "tausch-u", "bereinigt", "nachgesetzt", "rueckweg", "kontrolle", "uneinig", "behalten")
GOOGLE_KANAL = "gid://shopify/Publication/302872297857"
PRUEF = "Image under review"


def in_pruefung(stand):
    """Handles mit «Image under review» — neu ohne Deckel (handles_wartet), im Altstand gedeckelt unter handles."""
    return set((stand.get("handles_wartet") or {}).get(PRUEF) or []) | set((stand.get("handles") or {}).get(PRUEF) or [])


def weg_messen(handles, gql=None):
    """Live: Handles, die nicht (mehr) ACTIVE oder nicht im Google-Kanal sind (fehlendes Produkt zählt als weg).
    → set, oder None wenn Shopify nicht antwortet (dann wird nichts abgezogen)."""
    try:
        if gql is None:
            from kaufwille_zeile import gql
        weg, hs = set(), sorted(handles)
        for i in range(0, len(hs), 50):
            teil = hs[i:i + 50]
            q = "{ " + " ".join(f'a{j}: productByIdentifier(identifier:{{handle:{json.dumps(h)}}}){{ handle status '
                                f'publishedOnPublication(publicationId:"{GOOGLE_KANAL}") }}' for j, h in enumerate(teil)) + " }"
            d = gql(q)
            for j, h in enumerate(teil):
                p = d.get(f"a{j}")
                if not p or p.get("status") != "ACTIVE" or not p.get("publishedOnPublication"):
                    weg.add(h)
        return weg
    except Exception as e:
        print(f"⚠️ weg nicht messbar: {type(e).__name__}: {str(e)[:80]}", file=sys.stderr)
        return None


def gruppen(hs, blockiert, pruefung, weg):
    """→ (frei, blockiert, in Prüfung, weg) je Handle-Liste; Reihenfolge weg → blockiert → Prüfung → frei."""
    w = b = p = f = 0
    for h in hs:
        if weg is not None and h in weg:
            w += 1
        elif h in blockiert:
            b += 1
        elif h in pruefung:
            p += 1
        else:
            f += 1
    return f, b, p, w


def main():
    if "--selbsttest" in sys.argv:
        faelle = [(gruppen(["a", "b", "c", "d", "e"], {"b"}, {"c"}, {"d", "b"}), (2, 0, 1, 2)),   # weg schlägt blockiert
                  (gruppen(["a", "c"], set(), {"c"}, None), (1, 0, 1, 0)),                     # weg nicht messbar
                  (in_pruefung({"handles_wartet": {PRUEF: ["x"]}, "handles": {PRUEF: ["y"]}}), {"x", "y"})]
        ok = sum(ist == soll for ist, soll in faelle)
        for i, (ist, soll) in enumerate(faelle):
            print(f"{'✓' if ist == soll else '✗'} Fall {i + 1} → {ist}")
        print(f"Selbsttest {ok}/{len(faelle)}")
        sys.exit(0 if ok == len(faelle) else 1)
    stand = json.load(open(STAND))
    scan = stand["stand"][:10]
    blockiert = set()
    for k in KLASSEN:
        blockiert |= set(stand["handles"].get(k) or [])
        blockiert |= set((stand.get("handles_personalisiert") or {}).get(k) or [])   # 08.10.: dort seit der Umbuchung
    pruefung = in_pruefung(stand)
    letzte = bs.letzte_zeilen()
    alle = bs.alle_zeilen()
    # «nachgesetzt» (Rücklese) ist kein neuer Tausch: Art und Datum kommen von der letzten ECHTEN Tausch-Zeile des Handles.
    # 05.10.: die Notiz-Regex «(tausch-g vom …)» scheiterte an Ketten («(nachgesetzt vom 2026-10-05)», 81 Zeilen) → 113
    # statt 32 Tausche galten als «nach dem Scan, ungemessen».
    for h, f in letzte.items():
        if f[2] == "nachgesetzt":
            u = bs.urspruenglicher_tausch(alle.get(h, []))
            if u:
                f[2], f[1] = u[2], u[1]
    je_art = {art: [h for h, f in letzte.items() if f[2] == art and f[1] < scan] for art in ARTEN}   # nur Tausche vor dem Scan-Tag
    weg = weg_messen({h for hs in je_art.values() for h in hs}) if "--ohne-live" not in sys.argv else None
    teile = []
    for art in ARTEN:
        hs = je_art[art]
        if not hs:
            continue
        frei, _, pr, w = gruppen(hs, blockiert, pruefung, weg)
        basis = len(hs) - w
        teile.append(f"{art} {frei}/{basis} frei ({100 * frei // basis if basis else 0} %)"
                     + (f" +{pr} Prüf" if pr else "") + (f" −{w} weg" if w else ""))
    spaet = sum(1 for h, f in letzte.items() if f[2] in bs.GETAUSCHT and f[1] >= scan)
    print(f"BILDTAUSCH-QUOTE (Scan {stand['stand']}{', weg ?' if weg is None else ''}): " + " · ".join(teile)
          + (f" · {spaet} Tausche nach dem Scan, noch ungemessen" if spaet else ""))


if __name__ == "__main__":
    main()
