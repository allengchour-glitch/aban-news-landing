#!/usr/bin/env python3
"""video_auszeichnung_einbauen.py — setzt den VideoObject-Block ins Live-Theme (22.10.2026, Betreiber «video ja»).

Quelle des Blocks: dropship/theme_patches/video_auszeichnung_2026-10-22.liquid. Ziel: sections/product-information.liquid, direkt NACH dem
bestehenden Product-JSON-LD-Script (Anker `{{ luxe_sd }}` … `</script>`); dessen aggregateRating-Logik bleibt unberührt.

  python3 automation/video_auszeichnung_einbauen.py            TROCKEN: zeigt Einfügestelle und was sich ändert, schreibt nichts
  python3 automation/video_auszeichnung_einbauen.py --scharf   Backup (Repo + Scratch), Race-Schutz, Upsert, Rücklesen + Gegenprobe
  python3 automation/video_auszeichnung_einbauen.py --zurueck  RÜCKWEG: spielt das Backup (Original vom 22.10., md5 2c437a49…) ins Live-Theme zurück

Idempotent: steht der Block schon (Marke LUX-VIDEO-JSONLD), wird er zwischen Anfang- und Ende-Marke ersetzt statt verdoppelt.
Rückweg: die Backup-Datei dropship/theme_patches/product-information.vorher-2026-10-22.liquid per Upsert zurückspielen (themeFilesUpsert).
"""
import hashlib, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
BLOCK = os.path.join(REPO, "dropship", "theme_patches", "video_auszeichnung_2026-10-22.liquid")
BACKUP = os.path.join(REPO, "dropship", "theme_patches", "product-information.vorher-2026-10-22.liquid")
DATEI = "sections/product-information.liquid"
ANKER = "{{ luxe_sd }}\n</script>\n"
MARKE_A, MARKE_E = "LUX-VIDEO-JSONLD", "/LUX-VIDEO-JSONLD"


def einfuegen(live, block):
    """Gibt den neuen Dateitext zurück. Ersetzt einen vorhandenen Block (Marken), sonst Einfügen nach dem Anker."""
    block = block.rstrip("\n") + "\n"
    if MARKE_A in live:
        m = re.search(r"\{%-?\s*comment\s*-?%\}[^%]*?" + re.escape(MARKE_A) + r"(?!/).*?" + re.escape(MARKE_E) + r"\s*\{%-?\s*endcomment\s*-?%\}\n?", live, re.S)
        if not m:
            raise RuntimeError("Marke LUX-VIDEO-JSONLD steht im Live-Theme, aber Anfang/Ende lassen sich nicht abgrenzen — von Hand prüfen")
        return live[:m.start()] + block + live[m.end():]
    if live.count(ANKER) != 1:
        raise RuntimeError(f"Anker für die Einfügestelle {live.count(ANKER)}× gefunden (erwartet 1×) — Datei hat sich geändert, nichts geschrieben")
    i = live.index(ANKER) + len(ANKER)
    return live[:i] + "\n" + block + live[i:]


def entfernen(neu, block):
    """Gegenprobe: Block wieder herausnehmen ergibt den Originaltext."""
    return neu.replace("\n" + block.rstrip("\n") + "\n", "", 1)


ORIGINAL_MD5 = "2c437a49bbb0b68a8b04afe6b45af6a2"


def zurueck():
    """Rückweg: Backup ins Live-Theme. Bricht ab, wenn das Backup nicht das geprüfte Original ist."""
    from lux_assistent import _gql, theme_id, datei_lesen, datei_schreiben
    orig = open(BACKUP, encoding="utf-8").read()
    if hashlib.md5(orig.encode()).hexdigest() != ORIGINAL_MD5:
        raise SystemExit(f"Backup {BACKUP} ist nicht das geprüfte Original (md5 weicht ab) — nichts geschrieben")
    g = _gql()
    tid = theme_id(g)
    datei_schreiben(g, tid, DATEI, orig)
    z = datei_lesen(g, tid, DATEI)
    ok = z == orig
    print(f"{'ZURÜCK' if ok else '⚠️ RÜCKLESEN WEICHT AB'}: {DATEI} {len(z or '')} Zeichen, md5 {hashlib.md5((z or '').encode()).hexdigest()} (soll {ORIGINAL_MD5})")
    return 0 if ok else 2


def main():
    if "--zurueck" in sys.argv:
        return zurueck()
    scharf = "--scharf" in sys.argv
    block = open(BLOCK, encoding="utf-8").read()
    if MARKE_A not in block or MARKE_E not in block:
        raise SystemExit("Block trägt die Marken LUX-VIDEO-JSONLD / /LUX-VIDEO-JSONLD nicht — abgebrochen")
    from lux_assistent import _gql, theme_id, datei_lesen, datei_schreiben
    g = _gql()
    tid = theme_id(g)
    live = datei_lesen(g, tid, DATEI)
    if live is None:
        raise SystemExit(f"{DATEI} fehlt im Live-Theme")
    neu = einfuegen(live, block)
    print(f"TROCKEN: {DATEI} {len(live)} → {len(neu)} Zeichen (+{len(neu) - len(live)}); Block bereits live: {MARKE_A in live}")
    if neu == live:
        print("Nichts zu tun — der Block steht schon unverändert.")
        return 0
    if MARKE_A not in live:
        assert entfernen(neu, block) == live, "Gegenprobe (Block wieder entfernen = Original) schlägt fehl"
        print("Gegenprobe: Block herausnehmen ergibt exakt das Original.")
    if not scharf:
        return 0
    os.makedirs(os.path.dirname(BACKUP), exist_ok=True)
    if MARKE_A not in live:              # Backup nur vom ECHTEN Original, nie von einer schon gepatchten Fassung
        open(BACKUP, "w", encoding="utf-8").write(live)
    h0 = hashlib.sha256(live.encode()).hexdigest()
    again = datei_lesen(g, tid, DATEI)
    if hashlib.sha256(again.encode()).hexdigest() != h0:
        raise SystemExit("Live-Datei hat sich zwischen Lesen und Schreiben geändert (andere Sitzung?) — nichts geschrieben")
    datei_schreiben(g, tid, DATEI, neu)
    zurueck = datei_lesen(g, tid, DATEI)
    if zurueck != neu:
        print(f"⚠️ Rücklesen weicht ab (Länge {len(zurueck or '')} statt {len(neu)}) — Backup liegt unter {BACKUP}")
        return 2
    md5 = lambda t: hashlib.md5(t.encode()).hexdigest()
    print(f"SCHARF: geschrieben und zurückgelesen ({len(zurueck)} Zeichen). Backup: {os.path.relpath(BACKUP, REPO)}")
    print(f"md5 vorher {md5(live)} · nachher {md5(zurueck)} — danach NUR Antworten mit `render;dur` im Server-Timing prüfen; bei «Liquid error» sofort zurück (Rückweg im Kopf der Datei)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
