#!/usr/bin/env python3
"""Prueft die Content-Warteschlangen gegen die LIVE-Wahrheit des Shops.

WARUM ES DAS GIBT (17.09.2026): Die Angabe «Gratis-Versand ab CHF 65» wurde am
10.08. aus dem Theme entfernt — `automation/seo_versandschwelle_fix.py` dokumentiert
genau das. Auf dem oeffentlichen Pinterest-Profil stand sie am 17.09. immer noch, also
fuenf Wochen spaeter. Der Grund ist strukturell: **die Korrektur durchsuchte den Shop.
Kanaele sind kein Shop.** Captions, Pin-Beschreibungen und Profiltexte liegen in CSV-
Warteschlangen im Repo, und kein Waechter hat je hineingesehen.

Dieses Werkzeug misst nur — es aendert nichts. Es beantwortet eine Frage:
*Welche Zeile, die noch RAUSGEHEN kann, verspricht etwas, das nicht mehr stimmt?*

⚠️ Die Trennung «geht noch raus» vs. «ist Geschichte» ist eine SCHAETZUNG ueber den
Status-Text der Zeile, kein Wissen. Deshalb werden beide Zahlen getrennt ausgewiesen
und nie zu einer verschmolzen. Eine schon gepostete Caption mit falscher Zusage ist
ein anderes Problem (loeschen kann nur der Betreiber) als eine wartende.

Gegenprobe: `--selbsttest` legt zwei Koeder an — eine falsche Zusage, die gefunden
werden MUSS, und eine richtige, die NICHT gefunden werden darf. Ein Pruefer, der nur
«0» sagen kann, misst nichts.

Aufruf:  python3 tools/kanal_zusagen_pruefen.py [--selbsttest]
"""
import csv, glob, json, os, re, sys, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"

# --- Die Wahrheit, gegen die gemessen wird -----------------------------------
# BEWORBEN werden CHF 50. Die Versandregel steht auf 45, und das ist KEIN
# Widerspruch: Shopify prueft die Bedingung gegen den Betrag NACH Rabatt, und der
# automatische «2+ Artikel -10 %» macht aus CHF 50 Ware CHF 45 (45.00 = 50.00 x 0.9,
# Kommentar in layout/theme.liquid, in beide Richtungen gemessen am 09.09.).
# In WERBETEXTEN ist deshalb 50 richtig und alles andere falsch — auch 45.
SCHWELLE_BEWORBEN = 50
VERSAND_CHF       = 7
RUECKGABE_TAGE    = 30

# ⚠️ Zwei eigene Fehler, gefunden beim ERSTEN Lauf am 17.09. — beide hier behoben:
# (1) Der Stand wurde mit `^…$` geprueft. «dead-url-skip» faengt nicht mit «skip» an,
#     enthaelt es aber — fuenf erledigte Zeilen galten dadurch als «unbekannt» und
#     landeten in der Liste, die Handlung verlangt. Jetzt wird im Wort gesucht.
# (2) Gemessen wurde die GANZE Zeile als ein Text. Captions enthalten Zeilenumbrueche,
#     und die Statusspalte steht dahinter — deshalb wurde der Stand teils gar nicht
#     gefunden. Jetzt wird die Statusspalte per NAME gelesen, wenn es eine gibt.
STATUS_OFFEN = re.compile(r"\b(ready|pending|queued|offen|neu|scheduled)\b", re.I)
STATUS_DURCH = re.compile(r"(posted|archiv|done|erledigt|skip|dup-|failed|dead)", re.I)

def regeln():
    """(Name, Muster, Pruefung) — Pruefung gibt None zurueck, wenn die Zeile ok ist."""
    def schwelle(m):
        n = int(m.group(1))
        return None if n == SCHWELLE_BEWORBEN else \
            f"Gratis-Versand ab CHF {n} — beworben wird CHF {SCHWELLE_BEWORBEN}"
    def versand(m):
        n = int(m.group(1))
        return None if n == VERSAND_CHF else f"Versand CHF {n} — richtig ist CHF {VERSAND_CHF}"
    def rueckgabe(m):
        n = int(m.group(1))
        return None if n == RUECKGABE_TAGE else f"{n} Tage Rueckgabe — richtig sind {RUECKGABE_TAGE}"
    def weltweit(m):
        return "verspricht Versand ausserhalb der Schweiz — wir liefern nur in die CH"
    return [
        # «gratis ab CHF 65», «Gratis-Versand ab 65», «free shipping over CHF 65»
        ("schwelle",  re.compile(r"(?:gratis|kostenlos|free)[^.\n]{0,25}?(?:ab|over|from|über)\s*(?:CHF\s*)?(\d{2,3})", re.I), schwelle),
        ("versand",   re.compile(r"versand(?:kosten)?[:\s]+CHF\s*(\d{1,2})(?!\d)", re.I), versand),
        ("rueckgabe", re.compile(r"(\d{1,3})\s*Tage?\s*(?:R[üu]ckgabe|R[üu]ckgaberecht)", re.I), rueckgabe),
        ("weltweit",  re.compile(r"\b(weltweite[rmn]?\s+Versand|worldwide\s+shipping|versand\s+weltweit)\b", re.I), weltweit),
    ]

def zeilen_aus_csv(pfad):
    """Gibt (Dateizeile, Zellen, Stand-Zelle-oder-None) je Datensatz.

    ⚠️ `reader.line_num` ist die PHYSISCHE Zeile, an der der Datensatz endet — das ist
    die Zahl, mit der ein Mensch die Stelle findet. Die Nummer des Datensatzes waere
    dafuer unbrauchbar: eine Caption mit Zeilenumbruechen belegt hier bis zu sechs
    Dateizeilen, und `sed -n <n>p` zeigte beim ersten Lauf prompt die falsche.
    """
    try:
        with open(pfad, encoding="utf-8", errors="replace", newline="") as f:
            leser = csv.reader(f)
            try: kopf = next(leser)
            except StopIteration: return
            # Statusspalte per Name finden, statt sie im Fliesstext zu suchen.
            si = next((i for i, k in enumerate(kopf)
                       if k.strip().lower() in ("status", "stand", "state")), None)
            if any(re.search(r"\d", c) for c in kopf):
                yield leser.line_num, kopf, None      # doch keine Kopfzeile
            for r in leser:
                stand = r[si] if si is not None and si < len(r) else None
                yield leser.line_num, r, stand
    except Exception as e:
        print(f"  ⚠️  {os.path.relpath(pfad, REPO)}: nicht lesbar ({e})")

def status_von(zelle_liste, stand=None):
    """«geht noch raus» / «ist Geschichte» / «unbekannt».

    Steht eine echte Statusspalte zur Verfuegung, entscheidet NUR sie — sonst raet man
    an einer Caption herum, in der zufaellig «neu bei LuxeStyle» steht.
    """
    if stand is not None:
        s = stand.strip()
        if STATUS_DURCH.search(s): return "durch"
        if STATUS_OFFEN.search(s): return "offen"
        return "unbekannt"
    for c in zelle_liste:
        if STATUS_DURCH.search((c or "").strip()): return "durch"
    for c in zelle_liste:
        if STATUS_OFFEN.search((c or "").strip()): return "offen"
    return "unbekannt"

def pruefe_datei(pfad, R):
    treffer = []
    for nr, zeile, stand in zeilen_aus_csv(pfad):
        st = status_von(zeile, stand)
        text = " | ".join(zeile)
        for name, muster, pruef in R:
            for m in muster.finditer(text):
                grund = pruef(m)
                if grund:
                    treffer.append({"datei": os.path.relpath(pfad, REPO), "zeile": nr,
                                    "stand": st, "regel": name, "grund": grund,
                                    "stelle": m.group(0)[:70]})
    return treffer

def selbsttest(R):
    """Der Pruefer muss BEIDE Antworten koennen — sonst misst er nichts."""
    falsch = "Sommer-Look ✨ Schweizer Shop · Gratis-Versand ab CHF 65 · -10% WELCOME10"
    richtig= "Sommer-Look ✨ Schweizer Shop · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe"
    welt   = "Hey! 🤍 Weltweiter Versand, 8–14 Werktage · gratis ab CHF 50"
    def treffer(t):
        return [pr(m) for n, mu, pr in R for m in mu.finditer(t) if pr(m)]
    fehler = 0
    if not treffer(falsch): print("SELBSTTEST ✗ falsche Zusage NICHT gefunden"); fehler += 1
    if     treffer(richtig): print(f"SELBSTTEST ✗ Fehlalarm auf richtiger Zeile: {treffer(richtig)}"); fehler += 1
    if not treffer(welt):    print("SELBSTTEST ✗ «Weltweiter Versand» nicht gefunden"); fehler += 1
    print("SELBSTTEST ✅ falsche erkannt, richtige durchgelassen" if not fehler
          else f"SELBSTTEST ❌ {fehler} Fehler")
    return fehler == 0

def main():
    R = regeln()
    if "--selbsttest" in sys.argv:
        sys.exit(0 if selbsttest(R) else 1)
    if not selbsttest(R):
        sys.exit("Selbsttest rot — es wird nicht gemessen, solange das Messgeraet kaputt ist.")

    dateien = sorted(set(glob.glob(f"{REPO}/social/**/*.csv", recursive=True)
                       + glob.glob(f"{REPO}/automation/**/*.csv", recursive=True)
                       + glob.glob(f"{REPO}/dropship/**/*.csv", recursive=True)))
    alle = []
    for d in dateien:
        alle += pruefe_datei(d, R)

    offen  = [t for t in alle if t["stand"] == "offen"]
    unklar = [t for t in alle if t["stand"] == "unbekannt"]
    durch  = [t for t in alle if t["stand"] == "durch"]
    print(f"\n{len(dateien)} Warteschlangen geprueft · {len(alle)} Zeilen mit veralteter Zusage")
    print(f"  → GEHT NOCH RAUS: {len(offen)}   unklar: {len(unklar)}   schon durch: {len(durch)}")
    for gruppe, name in ((offen, "GEHT NOCH RAUS"), (unklar, "UNKLAR")):
        if not gruppe: continue
        print(f"\n── {name} ──")
        for t in gruppe[:40]:
            print(f"  {t['datei']}:{t['zeile']}  [{t['regel']}] {t['grund']}")
            print(f"      «{t['stelle']}»")
        if len(gruppe) > 40: print(f"  … und {len(gruppe)-40} weitere")
    return 0

if __name__ == "__main__":
    sys.exit(main())
