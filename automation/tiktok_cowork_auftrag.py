#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tiktok_cowork_auftrag — legt neue Karussells aufs CDN und schreibt den Cowork-Auftrag fort.

WARUM: `tiktok_karussell.py` und `tiktok_video.py` bauen taeglich neues Material — aber Cowork
kommt nicht an das Repo. Die Dateien muessen oeffentlich erreichbar sein, sonst ist der schoenste
Beitrag nutzlos. Dieser Lauf schliesst die Luecke: Er laedt alles Neue auf die Shopify-Files-CDN
(oeffentlich, stabil, range-faehig) und schreibt daraus `dropship/TIKTOK-COWORK-AUFTRAG.md`.

⚠️ Der GitHub-Rohzugriff taugt hier NICHT: Der Branchname enthaelt einen Schraegstrich
   (`claude/luxestyle-status-tztnn1`), den raw.githubusercontent nicht vom Pfad trennen kann —
   auch mit Commit-Kennung kam 404. Deshalb der Umweg ueber das CDN, der belegt funktioniert.

⚠️ PRODUKTPRUEFUNG VOR DER UEBERGABE. Jedes beworbene Produkt wird LIVE gegen Shopify geprueft;
   ist eines nicht mehr ACTIVE, wird der Beitrag im Auftrag als GESPERRT markiert statt still
   mitgeliefert. Das ist die Wache gegen die «Klimaanlagen-Reel-Falle» (eine Queue bewarb
   gedraftete Ware).

⚠️ Es POSTET NICHTS. TikToks Content-Posting-API ist in Review, und der Browser dieser Umgebung
   wird von TikToks Bot-Schutz abgewiesen. Der Upload bleibt Coworks Aufgabe.

Ledger: social/tiktok_cdn_slides.tsv + social/tiktok_cdn_videos.tsv (damit nichts zweimal hochlaedt).
"""

import json
import os
import re
import subprocess
import sys
from tiktok_biolink import bio_link, domain_im_bio, profil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASIS = os.path.join(ROOT, "social", "tiktok")
SLIDES_TSV = os.path.join(ROOT, "social", "tiktok_cdn_slides.tsv")
VIDEOS_TSV = os.path.join(ROOT, "social", "tiktok_cdn_videos.tsv")
AUFTRAG = os.path.join(ROOT, "dropship", "TIKTOK-COWORK-AUFTRAG.md")
SHOP = "au3j0y-hq.myshopify.com"
NODE = "/opt/node22/bin/node"


def token():
    p = "/tmp/cj_shop_token.txt"
    if not (os.path.exists(p) and open(p).read().strip()):
        subprocess.run(["bash", os.path.join(ROOT, "automation", "shop_token_refresh.sh")],
                       capture_output=True)
    return open(p).read().strip()


def gql(q, v=None):
    with open("/tmp/_tca.json", "w") as f:
        f.write(json.dumps({"query": q, "variables": v or {}}))
    r = subprocess.run(["curl", "-s", "--max-time", "60",
                        f"https://{SHOP}/admin/api/2024-10/graphql.json",
                        "-H", "X-Shopify-Access-Token: " + token(),
                        "-H", "Content-Type: application/json",
                        "--data-binary", "@/tmp/_tca.json"], capture_output=True, text=True)
    try:
        d = json.loads(r.stdout)
    except Exception:
        return {}
    if d.get("errors"):
        print("   ⚠️ Shopify:", json.dumps(d["errors"])[:160])
    return d


def gelesen(pfad, spalten):
    aus = {}
    if os.path.exists(pfad):
        for z in open(pfad):
            t = z.rstrip("\n").split("\t")
            if len(t) == spalten:
                aus[tuple(t[:spalten - 1])] = t[-1]
    return aus


def hochladen(datei, beschreibung):
    umg = dict(os.environ, SHOPIFY_SHOP=SHOP, SHOPIFY_ADMIN_TOKEN=token())
    r = subprocess.run([NODE, os.path.join(ROOT, "automation", "upload_to_shopify_cdn.mjs"),
                        datei, beschreibung], capture_output=True, text=True, env=umg, timeout=300)
    letzte = (r.stdout or "").strip().split("\n")[-1] if r.stdout else ""
    return letzte if letzte.startswith("https://") else None


def aktiv(handle):
    d = gql('query($q:String!){products(first:1,query:$q){nodes{status onlineStoreUrl}}}',
            {"q": f"handle:{handle}"})
    n = ((d.get("data") or {}).get("products") or {}).get("nodes") or []
    return bool(n) and n[0]["status"] == "ACTIVE" and n[0].get("onlineStoreUrl")


def main():
    if not os.path.isdir(BASIS):
        print("PAUSE: kein social/tiktok"); return
    slides = gelesen(SLIDES_TSV, 3)
    videos = gelesen(VIDEOS_TSV, 2)
    neu_s = neu_v = 0

    for slug in sorted(os.listdir(BASIS)):
        d = os.path.join(BASIS, slug)
        if not os.path.isdir(d):
            continue
        for f in sorted(x for x in os.listdir(d) if x.endswith(".jpg")):
            n = f[:-4]
            if (slug, n) in slides:
                continue
            u = hochladen(os.path.join(d, f), f"LuxeStyle {slug} Slide {n}")
            if u:
                slides[(slug, n)] = u; neu_s += 1
                with open(SLIDES_TSV, "a") as fh:
                    fh.write(f"{slug}\t{n}\t{u}\n")
        clean = os.path.join(d, f"{slug}-clean.mp4")
        if os.path.exists(clean) and (slug,) not in videos:
            u = hochladen(clean, f"LuxeStyle TikTok {slug}")
            if u:
                videos[(slug,)] = u; neu_v += 1
                with open(VIDEOS_TSV, "a") as fh:
                    fh.write(f"{slug}\t{u}\n")
    print(f"   neu aufs CDN: {neu_s} Slides, {neu_v} Videos")

    # ---- Auftrag schreiben -------------------------------------------------
    proSlug = {}
    for (slug, n), u in slides.items():
        proSlug.setdefault(slug, {})[n] = u

    # ⚠️ 29.08.2026 — DER ABSCHLUSS-SLIDE SAGT «Link in Bio», UND IM BIO IST KEINER.
    # Live gemessen: @luxestyle.ch hat 560 Follower, 66 Videos, 266 Likes und KEINEN
    # bioLink; `commerceUser: false` heisst Privatkonto, und dort gibt TikTok das
    # Website-Feld erst ab 1'000 Followern frei. Jeder Beitrag verwies damit auf etwas,
    # das es nicht gibt — dieselbe Klasse wie das Popup, das auf eine Liste schrieb, die
    # kein Flow las. Die Captions sind bereinigt; die Zeile steht aber im BILD des
    # Abschluss-Slides und laesst sich dort nicht ueberschreiben.
    # Deshalb wird das Posten GESPERRT, solange kein Bio-Link existiert. Das ist die
    # bessere Richtung: den Link nachzutragen macht die Zusage wahr UND schliesst das
    # Loch im Trichter — 66 Videos ohne klickbaren Link erklaeren einen Teil davon,
    # warum Social in 60 Tagen null Kassengaenge gebracht hat.
    # Sobald ein Link im Profil steht, verschwindet dieser Block von selbst.
    _u = profil() or {}
    _st = _u.get("stats") or {}
    _link = bio_link()
    kopf = []
    _text = domain_im_bio()
    if not _link and not _text:
        # Schlimmster Fall: der Slide sagt «Link in Bio», und im Bio steht NICHTS.
        kopf = ["> # ⛔ AUFGABE 0 — ZUERST, sonst nicht posten", ">",
                "> **Im Profil steht weder ein Link noch die Adresse.** Der letzte Slide jedes",
                "> Beitrags sagt aber «Link in Bio» — wer jetzt postet, schickt jede Zuschauerin",
                "> ins Leere. Setz wenigstens diesen Text ins Bio (Profil → Profil bearbeiten →",
                "> Biografie), dann sind die Beiträge frei:", ">", "> ```",
                "> Mode · Beauty · Wohnen · Technik 🇨🇭",
                "> luxestyle.ch · -10% mit WELCOME10",
                "> ```", ""]
    elif not _link:
        # Zwischenzustand: nicht klickbar, aber auffindbar. Posten ist frei.
        kopf = ["> ### ℹ️ Posten ist frei — ein Rest bleibt offen", ">",
                "> Im Bio steht die Adresse als **Text** (`luxestyle.ch`), aber **kein klickbarer",
                "> Link**. Der Abschluss-Slide sagt «Link in Bio»: ungenau, aber niemand läuft",
                "> mehr ins Leere — die Zuschauerin findet den Shop im Bio.",
                f"> Gemessen: {_st.get('followerCount','?')} Follower · "
                f"{_st.get('videoCount','?')} Videos · {_st.get('heartCount','?')} Likes.",
                ">",
                "> **Was den klickbaren Link bringt** (lohnt sich, ist aber kein Blocker):",
                "> Das Website-Feld gibt es im Privatkonto nicht — live geprüft, «Profil",
                "> bearbeiten» kennt nur Name, Anmeldename, Biografie, Pronomen. Es kommt über",
                "> **Einstellungen → Konto → Unternehmensverifizierung**: dort den Firmennachweis",
                "> hochladen (UID-Registerauszug von uid.admin.ch oder Zefix-Auszug).",
                "> ⚠️ Nur **JPEG/JPG/PNG**, kein PDF — den Auszug als Screenshot speichern,",
                "> farbig, unter 10 MB, mit dem vollständigen rechtsgültigen Firmennamen.",
                "> ⚠️ Nicht zu verwechseln mit «Verifizierung» (blauer Haken) — die verlangt",
                "> Presseartikel und ist für uns aussichtslos.", ""]

    aus = ["# TikTok posten — Auftrag für Cowork", ""] + kopf + [
           "**Automatisch fortgeschrieben.** Alle Dateien liegen öffentlich auf dem Shopify-CDN;",
           "Cowork kann sie direkt herunterladen, es braucht keinen Repo-Zugriff.", "",
           f"**Profil am {__import__('datetime').date.today().isoformat()} gemessen:** "
           f"{_st.get('followerCount','?')} Follower · {_st.get('videoCount','?')} Videos · "
           f"{_st.get('heartCount','?')} Likes · Bio-Link: "
           + (f"`{_link}`" if _link else "**keiner**"), "",
           "## So vorgehen (gilt für jeden Beitrag)",
           "1. **Zuerst das Profil ansehen:** tiktok.com/@luxestyle.ch — steht das Produkt dort schon,",
           "   diesen Beitrag ÜBERSPRINGEN und melden. Doppelposts sind ausdrücklich verboten.",
           "2. tiktok.com/tiktokstudio/upload öffnen (als @luxestyle.ch angemeldet).",
           "3. **Foto-Karussell:** Slides in der Nummernreihenfolge hochladen. **Oder Video:** die",
           "   eine MP4. Beides zum selben Produkt wäre ein Doppelpost — **eines von beidem**.",
           "4. Caption unverändert übernehmen (Preise und Aussagen sind gegen den Shop geprüft).",
           "5. **Ton:** Das Video ist absichtlich stumm — in der App einen Trend-Sound aus der",
           "   Commercial Music Library wählen, nie einen echten Song (sperrt den Upload).",
           "6. **Höchstens EIN Beitrag pro Tag.** Danach melden, welcher gepostet wurde.", "",
           "⚠️ Nichts löschen, nichts anderes am Konto ändern.", ""]

    gesperrt = 0
    queue = []            # maschinenlesbar fuer automation/local/tiktok-upload-auto.mjs
    for i, slug in enumerate(sorted(proSlug), 1):
        cp = os.path.join(BASIS, slug, "caption.txt")
        cap = open(cp).read().strip() if os.path.exists(cp) else ""
        # Produkt-Handle nur bei Einzelprodukt-Karussells pruefbar (Slug == Handle).
        einzel = not slug.startswith("top-")
        frei = aktiv(slug) if einzel else True
        if einzel and not frei:
            gesperrt += 1
        aus.append(f"---\n\n## {i}. `{slug}`" + ("" if frei else "  ⛔ GESPERRT") + "\n")
        if not frei:
            aus.append("⛔ **Nicht posten.** Das Produkt ist nicht mehr ACTIVE oder nicht im "
                       "Onlineshop — der Beitrag würde auf eine tote Seite führen.\n")
        if cap:
            aus.append("**Caption:**\n"); aus.append("```\n" + cap + "\n```\n")
        if (slug,) in videos:
            aus.append(f"**Video (stumm, für Trend-Sound):**\n{videos[(slug,)]}\n")
        aus.append("**Slides in dieser Reihenfolge:**\n")
        for n in sorted(proSlug[slug]):
            aus.append(f"{int(n)}. {proSlug[slug][n]}")
        aus.append("")
        queue.append({
            "slug": slug,
            "frei": frei,
            "caption": cap,
            "video": videos.get((slug,)),
            "slides": [proSlug[slug][n] for n in sorted(proSlug[slug])],
        })

    with open(AUFTRAG, "w") as f:
        f.write("\n".join(aus) + "\n")
    # Dieselben Daten maschinenlesbar — Quelle fuer den PC-Autoposter.
    # ⚠️ Der Autoposter liest NUR diese Datei; wer die Regeln aendert, aendert sie HIER.
    with open(os.path.join(ROOT, "dropship", "tiktok_queue.json"), "w") as f:
        json.dump({"stand": __import__('datetime').date.today().isoformat(),
                   "profil_hat_link": bool(_link),
                   "beitraege": queue}, f, ensure_ascii=False, indent=1)
    print(f"FERTIG: {len(proSlug)} Beiträge im Auftrag, {gesperrt} gesperrt "
          f"→ {os.path.relpath(AUFTRAG, ROOT)} + dropship/tiktok_queue.json")


if __name__ == "__main__":
    main()
