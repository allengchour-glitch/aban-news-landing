#!/usr/bin/env python3
"""vertrauen_leiste_mwst_2711.py — Ankündigungsleiste nennt TWINT/Klarna + «Inkl. MwSt.» korrigiert (27.11.2026).

ANLASS (Workflow mehr-einkaeufe-push, Blickwinkel Vertrauen): TWINT und Klarna standen in keiner Leistenmeldung;
ls_announce_3 sagte nur «Sichere & verschlüsselte Bezahlung». Impressum: «Nicht MWST-pflichtig», Steuer der letzten
Bestellungen 0.0 — trotzdem zeigte das Theme an 15 Stellen «Inkl. MwSt.».
  1) sections/header-group.json: ls_announce_3 = «🇨🇭 Schweizer Shop · TWINT · Klarna (Rechnung) · 30 Tage Rückgabe
     (ausser selbst gestaltete Artikel)», in block_order direkt hinter ls_announce_bw.
  2) locales/de.json: in allen Werten «Inkl. MwSt.» → «Preise in CHF.» (Rest des Satzes bleibt).

  python3 automation/vertrauen_leiste_mwst_2711.py            # Trockenlauf
  SCHARF=1 python3 automation/vertrauen_leiste_mwst_2711.py   # sichern, schreiben, zurücklesen
  Rückweg: Sicherungen theme_backup/*.vor-vertrauen-2711 per themeFilesUpsert zurückschreiben.
"""
import json, os, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
from kaufwille_zeile import gql  # noqa: E402
from main_theme import gid  # noqa: E402

HG, LOC = "sections/header-group.json", "locales/de.json"
SICH = lambda f: os.path.join(HIER, "..", "theme_backup", f.replace("/", "__") + ".vor-vertrauen-2711")
SEK, BLOCK, NACH = "header_announcements_9jGBFp", "ls_announce_3", "ls_announce_bw"
TEXT = "🇨🇭 Schweizer Shop · TWINT · Klarna (Rechnung) · 30 Tage Rückgabe (ausser selbst gestaltete Artikel)"
ALT_MWST, NEU_MWST = "Inkl. MwSt.", "Preise in CHF."


def lesen(th):
    n = gql('query($i:ID!){theme(id:$i){files(filenames:["%s","%s"]){nodes{filename checksumMd5 body{... on OnlineStoreThemeFileBodyText{content}}}}}}' % (HG, LOC),
            {"i": th})["theme"]["files"]["nodes"]
    return {x["filename"]: (x["body"]["content"], x["checksumMd5"]) for x in n}


def zerlegen(raw):
    i = raw.find("{", raw.find("*/") if "*/" in raw else 0)
    return raw[:i], json.loads(raw[i:])


def schreiben(th, f, inhalt):
    r = gql("mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{field message}}}",
            {"id": th, "files": [{"filename": f, "body": {"type": "TEXT", "value": inhalt}}]})["themeFilesUpsert"]
    if r["userErrors"]:
        raise SystemExit(f"{f}: userErrors {r['userErrors']}")


def main():
    th = gid()
    live = lesen(th)
    plan = {}
    raw, md5 = live[HG]
    kopf, j = zerlegen(raw)
    s = j["sections"][SEK]
    if s["blocks"][BLOCK]["settings"]["text"] != TEXT:
        s["blocks"][BLOCK]["settings"]["text"] = TEXT
        o = s["block_order"]; o.remove(BLOCK); o.insert(o.index(NACH) + 1, BLOCK)
        plan[HG] = (raw, md5, kopf + json.dumps(j, ensure_ascii=False, indent=2))
        print(HG, "→", o, "|", TEXT)
    raw, md5 = live[LOC]
    n = raw.count(ALT_MWST)
    if n:
        neu = raw.replace(ALT_MWST, NEU_MWST)
        zerlegen(neu)   # JSON muss parsen
        plan[LOC] = (raw, md5, neu)
        print(LOC, f"→ {n}× «{ALT_MWST}» → «{NEU_MWST}»")
    if not plan:
        print("nichts zu tun"); return 0
    if os.environ.get("SCHARF") != "1":
        print("TROCKEN — SCHARF=1 schreibt"); return 0
    ok_alle = True
    for f, (raw, md5, neu) in plan.items():
        open(SICH(f), "w", encoding="utf-8").write(raw)
        schreiben(th, f, neu)
        for _ in range(5):
            time.sleep(3)
            raw2, md5_2 = lesen(th)[f]
            ok = (TEXT in raw2) if f == HG else (ALT_MWST not in raw2 and NEU_MWST in raw2)
            if ok:
                break
        print(f"{f}: " + ("RÜCKGELESEN ✓" if ok else "⚠️ RÜCKLESEN FEHLT") + f" md5 {md5} → {md5_2}")
        ok_alle &= ok
    return 0 if ok_alle else 1


if __name__ == "__main__":
    sys.exit(main())
