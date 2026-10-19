#!/usr/bin/env python3
"""queue_schreiber_wache.py — Wächter für die Lost-Update-Klasse auf den Social-Queues (14.10.2026).

ANLASS: Poster lasen automation/reels_seed.csv beim Start und schrieben die GANZE Datei Minuten später aus ihrer alten
Kopie zurück. Zeilen, die der Reel-Motor dazwischen anhängte, verschwanden (GEMESSEN 14.10.: 8 fertige Reels ohne
Queue-Zeile; git-Verlauf: Zeile angelegt, < 1 min später weg). Reparatur: EIN Weg zum Schreiben —
automation/lib/queue_csv.mjs bzw. automation/queue_csv.py (Sperre, frisch lesen, nur eigene Änderungen, atomar).
Bericht: dropship/QUEUE-SCHREIBER-2026-10-14.md

DREI PRÜFUNGEN
  1. Quelltext: jede Datei in automation/, tools/, dropship/ads/, die eine Queue-CSV nennt UND roh schreibt
     (writeFileSync/appendFileSync/open w|a/os.replace/csv.writer/>>), aber den Helfer nicht importiert → Befund.
     Ausnahmen nur mit Grund in AUSNAHMEN (liest nur / schreibt andere Dateien / nur GitHub-Workflow ohne Zeitplan).
     Zusätzlich in Helfer-Nutzern: Rohschreiben auf eine Queue-Variable (writeFileSync(CSV …), open(CSV, "w") …).
  2. Bestand: Reel-Dateien in social/reels/ ohne Queue-Zeile, nicht gepostet, nicht Tor-abgelehnt («Waisen»).
  3. Verlauf: Zeilen-IDs, die in den letzten 24 h aus einer Queue-CSV VERSCHWUNDEN sind (Queues sind Anhänge-Listen —
     niemand löscht Zeilen; ein Verschwinden ist ein Lost Update oder ein Rewind).

    python3 automation/queue_schreiber_wache.py            Bericht (alle drei)
    python3 automation/queue_schreiber_wache.py --still    nur bei Befund eine Zeile «QUEUE-SCHREIBER: …» (Keepalive)
    SCHARF=1 python3 automation/queue_schreiber_wache.py --zurueckholen [--seit "21 days ago"]
                                                           verschwundene, nicht gepostete Zeilen aus dem Verlauf zurück
    python3 automation/queue_schreiber_wache.py --selbsttest
"""
import csv
import io
import os
import re
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUES = ["automation/reels_seed.csv", "social/posts_image.csv", "social/story_queue.csv", "social/video_queue.csv",
          "social/tiktok_queue.csv", "social/ig_karussell.csv", "social/tiktok_karussell.csv", "social/metricool_queue.csv"]
NAMEN = re.compile(r"(reels_seed|posts_image|story_queue|video_queue|tiktok_queue|ig_karussell|tiktok_karussell|metricool_queue)\.csv")
ROH = re.compile(r"writeFileSync\(|appendFileSync\(|renameSync\(|open\([^)\n]*,\s*['\"][wa]b?['\"]|os\.replace\(|\.write_text\(|"
                 r"csv\.writer\(|csv\.DictWriter\(|>>\s*\"?\$?\{?\w*(?:CSV|QUEUE|csv)|printf[^\n]*>>")
HELFER = re.compile(r"queue_csv")
# Rohschreiben auf eine Queue-Variable in einer Datei, die den Helfer schon nutzt (vergessene Stelle)
ROH_AUF_QUEUE = re.compile(r"(?:writeFileSync|appendFileSync)\(\s*(?:CSV|QUEUE|SEED|REELS|Q)\s*,|"
                           r"open\(\s*(?:CSV|QUEUE|REELS|SEED)\s*,\s*['\"][wa]")

# Datei → Grund. Nur mit Beleg aus der Erfassung 14.10. (Workflow wf_e32fa801-95a) eintragen.
AUSNAHMEN = {
    "automation/post_guard.mjs": "liest nur (Ledger _posted_media.txt)",
    "automation/ig_aufraeumen.mjs": "liest nur",
    "automation/linkinbio_sync.mjs": "liest nur",
    "automation/fb_link_kommentar.mjs": "liest nur",
    "automation/ig_gepostet_tags.py": "liest nur",
    "automation/bild_formate.py": "liest nur",
    "automation/reel/tor_quellen_anfragen.mjs": "liest nur",
    "automation/reel-analytics.mjs": "liest nur",
    "automation/social_qualitaet_wache.mjs": "liest nur",
    "automation/dateispeicher_videos.py": "liest nur",
    "automation/cj_ausgelistet_sichtbar.py": "liest nur",
    "automation/kassen_lieferdatum_wache.py": "liest nur",
    "automation/google_bild_abruf.py": "liest nur (Dateinamen-Schutz vor dem Umbenennen), schreibt eigene Dateien",
    "automation/betreiber_ampel.py": "liest nur",
    "automation/reel_gesicht.py": "liest nur (eigene TSV)",
    "automation/reel_kadenz_wache.py": "liest nur",
    "automation/social_vorlauf.py": "liest story_queue.csv nur (Zähler); schreibt Plan/Log/Drossel atomar, die Queues schreiben die Poster über lib/queue_csv",
    "automation/tiktok_reel_post.mjs": "liest nur, nicht gestartet",
    "automation/threads_zwillinge.py": "liest posts_image.csv nur (Bildunterschrift → Produkt); schreibt Plan + /tmp-JSON, nie die Queue",
    "automation/social_lernen.mjs": "liest nur (schreibt _lernen.json/SOCIAL-LERNEN.md)",
    "automation/autopilot/trends_to_captions.mjs": "liest nur (GitLab-Job)",
    "automation/bild_reel_auswahl.py": "schreibt über bild_reel.py --freigeben (Helfer)",
    "automation/tiktok_karussell.py": "Helfer-Nutzer; schreibt daneben caption.txt/Ledger",
    "automation/queue_schreiber_wache.py": "dieser Wächter (liest nur)",
    "automation/queue_csv.py": "der Helfer selbst",
    "automation/lib/queue_csv.mjs": "der Helfer selbst",
    # nur GitHub-Workflow per workflow_dispatch, Zeitplan seit 13.06. aus (Erfassung 14.10.) — läuft nie neben den Motoren
    "automation/gen_post_image.py": "nur GitHub-Workflow (image-render.yml, Zeitplan aus)",
    "automation/gemini_enhance_image.mjs": "nur GitHub-Workflow (gemini-enhance.yml, Zeitplan aus)",
    "automation/enhance_clips.mjs": "nur GitHub-Workflow (enhance-clips.yml, Zeitplan aus)",
    "automation/make_montage.mjs": "nur GitHub-Workflow (montage.yml, Zeitplan aus)",
    "automation/luma-hero-clip.mjs": "nur GitHub-Workflow (luma-hero-clip.yml, Zeitplan aus)",
    "automation/queue_veo_clips.mjs": "nur GitHub-Workflow (veo-queue.yml, Zeitplan aus)",
    "automation/veo-hero-clip.mjs": "nur GitHub-Workflow (veo-hero-clip.yml, Zeitplan aus)",
    "automation/metricool-schedule.mjs": "nur GitHub-Workflow (metricool-schedule.yml)",
    "automation/tiktok-cloud-autopost.mjs": "nur GitHub-Workflow (tiktok-cloud-autopost.yml)",
    "dropship/ads/auto_render.sh": "nur GitHub-Workflow (reel-render.yml)",
    "dropship/ads/render_product_reel.sh": "nur GitHub-Workflow (product-reel.yml)",
    # Rewind-Maschinerie: setzt Dateien per git zurück (eigene Klasse, Bericht §OFFEN)
    "automation/repo_vorspulen.sh": "git stash/reset nach Snapshot-Rewind; nie committete Queue-Zeilen holt queue_rewind_retten.py zurück (14.10.)",
    "automation/engine_keepalive.sh": "startet repo_vorspulen.sh (eigene Klasse)",
    "automation/fixer_keepalive.sh": "Startliste (startet Schreiber, schreibt selbst keine Queue)",
    "automation/social_autopilot.sh": "Startliste (startet Poster, schreibt selbst keine Queue)",
}
ORDNER = ["automation", "tools", "dropship/ads"]
ENDUNGEN = (".py", ".mjs", ".js", ".sh")


def quelltext_befunde(repo=REPO, ausnahmen=AUSNAHMEN):
    befunde = []
    for o in ORDNER:
        for wurzel, dirs, dateien in os.walk(os.path.join(repo, o)):
            dirs[:] = [d for d in dirs if d not in ("node_modules", "__pycache__", ".git")]
            for d in dateien:
                if not d.endswith(ENDUNGEN):
                    continue
                p = os.path.join(wurzel, d)
                rel = os.path.relpath(p, repo)
                try:
                    t = open(p, encoding="utf-8", errors="replace").read()
                except OSError:
                    continue
                if not NAMEN.search(t):
                    continue
                if HELFER.search(t):
                    m = ROH_AUF_QUEUE.search(t)
                    if m and rel not in ausnahmen:
                        zeile = t[:m.start()].count("\n") + 1
                        befunde.append((rel, zeile, "nutzt den Helfer, schreibt aber hier roh auf eine Queue-Variable"))
                    continue
                if rel in ausnahmen:
                    continue
                m = ROH.search(t)
                if m:
                    zeile = t[:m.start()].count("\n") + 1
                    befunde.append((rel, zeile, "nennt eine Queue-CSV und schreibt roh, ohne lib/queue_csv"))
    return befunde


def waisen(repo=REPO):
    reels = os.path.join(repo, "social", "reels")
    if not os.path.isdir(reels):
        return []
    try:
        ids = {r[0] for r in csv.reader(open(os.path.join(repo, "automation/reels_seed.csv"), encoding="utf-8")) if r}
    except OSError:
        return []
    gepostet = ""
    try:
        gepostet = open(os.path.join(repo, "dropship/_posted_media.txt"), encoding="utf-8").read()
    except OSError:
        pass
    tor = set()
    try:
        tor = {z.split("\t")[0].strip() for z in open(os.path.join(repo, "dropship/_reel_tor_abgelehnt.txt"), encoding="utf-8")}
    except OSError:
        pass
    aus = []
    for f in sorted(os.listdir(reels)):
        m = re.match(r"reel_(.+)\.mp4$", f)
        if not m:
            continue
        p = m.group(1)
        if f"cjreel-{p}" in ids or p in tor or f"reel_{p}.mp4" in gepostet:
            continue
        aus.append(p)
    return aus


def _zeilen(text):
    try:
        rows = list(csv.reader(io.StringIO(text)))
    except csv.Error:
        return None, None
    if not rows:
        return [], {}
    return rows[0], {r[0]: r for r in rows[1:] if r}


def _ids(text):
    _, z = _zeilen(text)
    return None if z is None else set(z)


def media_key(u):
    """wie mediaKey() in post_guard.mjs — Schlüssel im gemeinsamen Ledger dropship/_posted_media.txt"""
    teile = [t.lower().strip() for t in (u or "").split("?")[0].split("/")]
    name = teile.pop() if teile else ""
    if re.match(r"^\d{1,3}\.(?:jpe?g|png|webp|mp4)$", name) and teile:
        return f"{teile.pop()}/{name}"
    return name


def verschwunden(repo=REPO, seit="24 hours ago", mit_zeilen=False):
    """IDs, die zwischen zwei aufeinanderfolgenden Commits einer Queue-CSV wegfielen (und im jetzigen Stand fehlen).
    mit_zeilen=True: je ID die letzte bekannte Zeile als {spalte: wert} (für --zurueckholen)."""
    erg = {}
    for q in QUEUES:
        try:
            log = subprocess.run(["git", "-C", repo, "log", "--format=%H", f"--since={seit}", "--", q],
                                 capture_output=True, text=True, timeout=60).stdout.split()
        except Exception:
            continue
        if not log:
            continue
        log.reverse()
        try:
            jetzt = _ids(open(os.path.join(repo, q), encoding="utf-8").read()) or set()
        except OSError:
            continue
        vorher, weg, letzte = None, set(), {}
        for h in log:
            try:
                t = subprocess.run(["git", "-C", repo, "show", f"{h}:{q}"], capture_output=True, text=True, timeout=60).stdout
            except Exception:
                continue
            kopf, z = _zeilen(t)
            if z is None:
                continue
            ids = set(z)
            if vorher is not None:
                for i in vorher - ids:
                    weg.add(i)
            if mit_zeilen:
                for i, r in z.items():
                    letzte[i] = dict(zip(kopf, r))
            vorher = ids
        weg -= jetzt
        if weg:
            erg[q] = {i: letzte.get(i) for i in sorted(weg)} if mit_zeilen else sorted(weg)
    return erg


def zurueckholen(seit="24 hours ago", scharf=False, repo=REPO):
    """Verschwundene Zeilen aus dem git-Verlauf wieder anhängen (Queues sind Anhänge-Listen). Nicht zurück: Medium schon
    gepostet (gemeinsamer Ledger). Status bleibt, wie er zuletzt war (ein «posting» setzt der Poster selbst auf
    «posting-unklar-pruefen»; die Poster prüfen vor jedem Post Produkt aktiv, Preis, Doppel)."""
    sys.path.insert(0, os.path.join(repo, "automation"))
    from queue_csv import anhaengen, lesen
    try:
        gepostet = {z.strip() for z in open(os.path.join(repo, "dropship/_posted_media.txt"), encoding="utf-8")}
    except OSError:
        gepostet = set()
    bilanz = []
    for q, zeilen in verschwunden(repo, seit, mit_zeilen=True).items():
        kopf = (lesen(os.path.join(repo, q)) or [[]])[0]
        neu = []
        for i, z in zeilen.items():
            if not z:
                continue
            medium = z.get("video_url") or z.get("image_url") or z.get("media_url") or ""
            if medium and media_key(medium) in gepostet:
                bilanz.append((q, i, "schon gepostet — nicht zurück"))
                continue
            neu.append([z.get(k, "") for k in kopf])
            bilanz.append((q, i, f"zurück (Status {z.get('status', '?')})" if scharf else f"würde zurückkommen (Status {z.get('status', '?')})"))
        if scharf and neu:
            n = anhaengen(os.path.join(repo, q), neu)
            with open(os.path.join(repo, "dropship/_queue_zurueckgeholt.tsv"), "a", encoding="utf-8") as f:
                import datetime as _dt
                for r in neu:
                    f.write(f"{_dt.datetime.utcnow():%Y-%m-%dT%H:%MZ}\t{q}\t{r[0]}\n")
            if n != len(neu):
                bilanz.append((q, "-", f"{len(neu) - n} standen inzwischen schon drin"))
    return bilanz


def selbsttest():
    import tempfile
    import shutil
    fehler = []
    d = tempfile.mkdtemp(prefix="qsw-test-")
    os.makedirs(os.path.join(d, "automation", "lib"))
    faelle = {
        "automation/roh.mjs": ("const CSV='automation/reels_seed.csv';\nfs.writeFileSync(CSV, rows.join('\\n'));\n", True),
        "automation/roh.py": ("Q='social/posts_image.csv'\nwith open(Q, 'w') as f:\n    f.write(x)\n", True),
        "automation/gut.mjs": ("import { schreiben } from './lib/queue_csv.mjs';\nconst CSV='automation/reels_seed.csv';\nschreiben(CSV, b, r);\n", False),
        "automation/vergessen.mjs": ("import { schreiben } from './lib/queue_csv.mjs';\nconst CSV='automation/reels_seed.csv';\nfs.writeFileSync(CSV, x);\n", True),
        "automation/fremd.py": ("open('social/posts_image.csv').read()\nopen('andere.txt', 'w').write('x')\n", True),
        "automation/ausnahme.py": ("open('social/posts_image.csv').read()\nopen('andere.txt', 'w').write('x')\n", False),
        "automation/ohne.py": ("open('andere.txt', 'w').write('x')\n", False),
        "automation/anhang.sh": ("printf '%s\\n' \"$Z\" >> automation/reels_seed.csv\n", True),
    }
    for rel, (txt, _) in faelle.items():
        with open(os.path.join(d, rel), "w") as f:
            f.write(txt)
    gefunden = {b[0] for b in quelltext_befunde(d, {"automation/ausnahme.py": "Test"})}
    for rel, (_, soll) in faelle.items():
        if (rel in gefunden) != soll:
            fehler.append(f"{rel}: {'nicht erkannt' if soll else 'Fehlalarm'}")
    shutil.rmtree(d, ignore_errors=True)
    # Verlaufs-Erkennung an einem Mini-Repo: Zeile b verschwindet → gemeldet
    d = tempfile.mkdtemp(prefix="qsw-git-")
    try:
        os.makedirs(os.path.join(d, "automation"))
        q = os.path.join(d, "automation", "reels_seed.csv")
        g = ["git", "-C", d, "-c", "user.email=t@t", "-c", "user.name=t"]
        subprocess.run(["git", "init", "-q", d], check=True)
        for inhalt in ("id,status\na,ready\nb,ready\n", "id,status\na,posted\n", "id,status\na,posted\nc,ready\n"):
            open(q, "w").write(inhalt)
            subprocess.run(g + ["add", "-A"], check=True)
            subprocess.run(g + ["commit", "-qm", "x"], check=True)
        v = verschwunden(d)
        if v.get("automation/reels_seed.csv") != ["b"]:
            fehler.append(f"Verlauf: erwartet b verschwunden, ist {v}")
    finally:
        shutil.rmtree(d, ignore_errors=True)
    # Helfer selbst
    for cmd in (["python3", os.path.join(REPO, "automation/queue_csv.py"), "--selbsttest"],
                ["/opt/node22/bin/node", os.path.join(REPO, "automation/lib/queue_csv.mjs"), "--selbsttest"]):
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if r.returncode != 0:
            fehler.append(f"Helfer-Selbsttest {os.path.basename(cmd[1])}: {r.stdout.strip()[-200:]}")
    return fehler


def main():
    if "--selbsttest" in sys.argv:
        f = selbsttest()
        print(f"❌ queue_schreiber_wache: {len(f)} Fehler\n - " + "\n - ".join(f) if f else "✅ queue_schreiber_wache Selbsttest ok")
        return 1 if f else 0
    if "--zurueckholen" in sys.argv:
        seit = sys.argv[sys.argv.index("--seit") + 1] if "--seit" in sys.argv else "24 hours ago"
        scharf = os.environ.get("SCHARF") == "1"
        b = zurueckholen(seit, scharf)
        for q, i, was in b:
            print(f"   {os.path.basename(q)} {i}: {was}")
        print(f"ZURÜCKHOLEN seit {seit}: {sum(1 for x in b if x[2].startswith('zurück'))} zurück · "
              f"{sum(1 for x in b if 'gepostet' in x[2])} schon gepostet{'' if scharf else ' (TROCKEN — SCHARF=1 schreibt)'}")
        return 0
    still = "--still" in sys.argv
    if os.environ.get("SCHARF") == "1" and not still:
        # Tageslauf im Aufseher: erst die Helfer prüfen (ohne funktionierenden Helfer nichts zurückschreiben), dann
        # verschwundene Zeilen der letzten 26 h zurückholen.
        f = selbsttest()
        if f:
            print("⛔ QUEUE-SCHREIBER: Selbsttest rot — nichts zurückgeholt\n - " + "\n - ".join(f))
            return 1
        b = zurueckholen("26 hours ago", True)
        print(f"ZURÜCKHOLEN 26 h: {sum(1 for x in b if x[2].startswith('zurück'))} zurück · "
              f"{sum(1 for x in b if 'gepostet' in x[2])} schon gepostet")
        for qq, i, was in b:
            print(f"   {os.path.basename(qq)} {i}: {was}")
    q = quelltext_befunde()
    w = waisen()
    v = verschwunden()
    nv = sum(len(x) for x in v.values())
    if still:
        if q or w or nv:
            teile = []
            if q:
                teile.append(f"{len(q)} Roh-Schreiber ({', '.join(os.path.basename(b[0]) for b in q[:3])}{' …' if len(q) > 3 else ''})")
            if w:
                teile.append(f"{len(w)} Reel-Waisen")
            if nv:
                teile.append(f"{nv} Zeilen in 24 h verschwunden ({', '.join(f'{os.path.basename(k)} {len(x)}' for k, x in v.items())})")
            print("QUEUE-SCHREIBER: " + " · ".join(teile) + " → python3 automation/queue_schreiber_wache.py")
        return 0
    print(f"1) Quelltext: {len(q)} Befund(e)")
    for rel, z, grund in q:
        print(f"   {rel}:{z} — {grund}")
    print(f"2) Reel-Waisen (Datei ohne Queue-Zeile, nicht gepostet): {len(w)}")
    for p in w[:20]:
        print(f"   {p}")
    print(f"3) In 24 h verschwundene Queue-Zeilen: {nv}")
    for k, x in v.items():
        print(f"   {k}: {len(x)} — {', '.join(x[:8])}{' …' if len(x) > 8 else ''}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
