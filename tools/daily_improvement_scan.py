#!/usr/bin/env python3
"""Täglicher Verbesserungs-Scan für abannews.com — findet konkrete, verifizierbare
Schwachstellen über alle HTML-Seiten + die sitemap und schreibt einen priorisierten
Report. Deterministisch, reine Python-stdlib, erfindet nichts.

Geprüft je Seite: <title>, Meta-Description, canonical, OG-Tags, lang-Attribut,
<img alt>, Mehrfach-Ausrufezeichen, Aban-Sperrliste (Hype-Wörter), JSON-LD-Validität,
externe target=_blank-Links ohne rel="noopener". Plus: sitemap-Einträge, die auf
fehlende Dateien zeigen.

Nutzung:
    python3 tools/daily_improvement_scan.py            # Report nach reports/IMPROVEMENT-REPORT.md
    python3 tools/daily_improvement_scan.py --top 20   # mehr Beispiele je Kategorie
"""

from __future__ import annotations

import argparse
import json
import re
from datetime import date, timezone, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXCLUDE_PARTS = ("/_site/", "/dist/", "/node_modules/", "/ki-schriftsteller/", "/reports/",
                 "/.git/", "/automatisierung-radar/", "/data/", "/ausgabe/",
                 "/video-prototypes/", "/video-pipeline/", "/dropship/")  # Build-Output, Generate-Output, Entwürfe & Shop-Projekt aus

# Partial-/Fragment-Dateien (Body-Schnipsel ohne <head>) — werden in andere Seiten
# injiziert und haben absichtlich kein title/canonical/viewport → nicht als SEO-Mangel werten.
EXCLUDE_SUFFIXES = ("page_body.html", "_body.html", ".partial.html", "_fragment.html")

# Spiegel der Aban-Sperrliste (Quelle: automation/brand-voice-validator-api.py).
HYPE = [
    r"\brevolution(?:aer|aere|ar|ary)?\w*", r"\bdisrupt(?:iv|ive|or)\w*",
    r"\bgame[- ]?changer\w*", r"\bbahnbrech(?:end|ende|ender)\w*",
    r"\beinzigartig\w*", r"\bunglaublich\w*", r"\bwahnsinnig\w*",
    r"\bnext[- ]?level\w*", r"\bcutting[- ]?edge\w*", r"\bworld[- ]?class\w*",
    r"\bskyrocket\w*", r"\b10x\b", r"\bnie[- ]?dagewes\w*", r"\bturbo\b",
    r"\bkrass\b", r"\bmehrwert\b",
]
HYPE_RX = re.compile("|".join(HYPE), re.IGNORECASE)
EXCL_RX = re.compile("!{2,}")
JSONLD_RX = re.compile(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', re.S | re.I)
IMG_RX = re.compile(r"<img\b[^>]*>", re.I)
ABLANK_RX = re.compile(r'<a\b[^>]*target=["\']_blank["\'][^>]*>', re.I)


def html_files():
    for p in ROOT.rglob("*.html"):
        rel = "/" + str(p.relative_to(ROOT))
        if any(x in rel for x in EXCLUDE_PARTS):
            continue
        if rel.endswith(EXCLUDE_SUFFIXES):
            continue
        yield p


def scan_page(p: Path, findings: list):
    s = p.read_text(encoding="utf-8", errors="replace")
    rel = str(p.relative_to(ROOT))
    low = s.lower()

    def add(sev, cat, detail):
        findings.append((sev, cat, rel, detail))

    # noindex-Seiten (Lieferseiten, Dashboards, 404) brauchen kein canonical/OG/Description —
    # für SEO-Discovery-Checks überspringen (sonst Falsch-Alarme).
    noindex = bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex', s, re.I))

    if "<title" not in low:
        add("high", "SEO: <title> fehlt", "kein Seitentitel")
    if not noindex and 'name="description"' not in low:
        add("medium", "SEO: Meta-Description fehlt", "kein <meta name=description>")
    if not noindex and 'rel="canonical"' not in low:
        add("high", "SEO: canonical fehlt", "kein <link rel=canonical>")
    if not noindex and 'property="og:title"' not in low:
        add("medium", "SEO: OG-Title fehlt", "kein og:title")
    if not noindex and 'property="og:description"' not in low:
        add("medium", "SEO: OG-Description fehlt", "kein og:description")
    if not re.search(r"<html[^>]*\blang=", s, re.I):
        add("medium", "a11y: lang-Attribut fehlt", "kein lang am <html>")
    if 'name="viewport"' not in low:
        add("medium", "Mobil: viewport-Meta fehlt", "kein <meta name=viewport>")

    # Mixed Content: unsichere http://-Ressourcen. xmlns/namespace-URLs sind kein
    # src/href und werden bewusst nicht erfasst (nur echte Ressourcen-Loads).
    mixed = re.findall(r'\bsrc=["\']http://', s, re.I) + re.findall(r'<link\b[^>]*\bhref=["\']http://', s, re.I)
    if mixed:
        add("high", "Security: unsichere http://-Ressource", f"{len(mixed)} (Mixed Content)")

    # Bilder ohne alt
    noalt = [m.group(0)[:60] for m in IMG_RX.finditer(s) if not re.search(r"\balt=", m.group(0), re.I)]
    if noalt:
        add("medium", "a11y: <img> ohne alt", f"{len(noalt)} Bild(er) ohne alt-Text")

    # externe _blank ohne noopener (Security/Tabnabbing)
    noopener = [m.group(0)[:70] for m in ABLANK_RX.finditer(s)
                if "noopener" not in m.group(0).lower()]
    if noopener:
        add("medium", "Security: target=_blank ohne rel=noopener", f"{len(noopener)} Link(s)")

    # Mehrfach-Ausrufezeichen (nur sichtbarer Text; <script>/<style> ausnehmen,
    # sonst werden JS-Idiome wie `!!wert` (Boolean-Coercion) fälschlich als Hype geflaggt).
    _vis = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
    if EXCL_RX.search(re.sub(r"<[^>]+>", " ", _vis)):
        add("low", "Voice: Mehrfach-Ausrufezeichen", "!! im Text")

    # Hype-Wörter (nur sichtbarer Text, Tags entfernt).
    # Ausnahme: Seiten, die Hype-Floskeln absichtlich ZITIEREN, um sie zu entlarven
    # (Newsletter-Archiv + Anti-Hype-/Brand-Seiten) — sonst Falsch-Alarme.
    HYPE_EXEMPT = ("archive/", "anti-hype-texten.html", "brand.html", "hype-watch")
    if not any(x in rel for x in HYPE_EXEMPT):
        text = re.sub(r"<(script|style)\b.*?</\1>", " ", s, flags=re.S | re.I)
        text = re.sub(r"<[^>]+>", " ", text)
        # Debunking-Kontext ignorieren: Hype-Wort in Anführungszeichen oder nach
        # Negation/„verboten"-Marker ist Absicht (die Marke entlarvt Hype), kein
        # Verstoß. Prüft die 60 Zeichen direkt vor dem Treffer.
        DEBUNK = re.compile(
            r'(?:\b(?:kein|keine|ohne|nicht|statt|nie|no|not|without|banned|'
            r'verboten|verbannt|forbidden|tabu|liste|weniger|versprech\w*|'
            r'schlagzeile\w*|headline\w*)\b|sperrlist|[„“”"»«])', re.I)

        def _exempt(m):
            # Zitat-/Debunk-/Listen-Kontext im 120-Zeichen-Fenster davor (z. B.
            # Verbotswort-Listen, „… weniger um …", „versprechen die Revolution").
            if DEBUNK.search(text[max(0, m.start() - 120):m.start()]):
                return True
            # „10x" direkt vor „Hebel/leverage" ist Trading-Fachbegriff, kein Hype.
            if m.group(0).lower() == "10x" and re.match(
                    r"\s*(?:hebel|leverage)", text[m.end():m.end() + 12], re.I):
                return True
            return False

        hits = sorted(set(
            m.group(0) for m in HYPE_RX.finditer(text) if not _exempt(m)
        ))
        if hits:
            add("low", "Voice: Hype-Wörter", ", ".join(hits[:6]))

    # JSON-LD-Validität
    for block in JSONLD_RX.findall(s):
        try:
            json.loads(block.strip())
        except Exception as ex:
            add("high", "JSON-LD ungültig", str(ex)[:80])
            break


def scan_sitemap(findings: list):
    sm = ROOT / "sitemap.xml"
    if not sm.exists():
        return
    locs = re.findall(r"<loc>\s*([^<]+?)\s*</loc>", sm.read_text(encoding="utf-8"))
    for loc in locs:
        path = re.sub(r"^https?://[^/]+", "", loc).split("?")[0]
        if not path.endswith(".html"):
            continue
        f = ROOT / path.lstrip("/")
        if not f.exists():
            findings.append(("high", "Sitemap: Ziel fehlt", "sitemap.xml",
                             f"{path} → Datei nicht vorhanden"))


def scan_internal_links(findings: list):
    """Prüft interne .html-Links auf existierende Zieldateien (deterministisch, ohne Netz).

    Fängt umbenannte/gelöschte Seiten. Externe Links (http), Anker, mailto/tel und
    erweiterungslose Pretty-URLs (über _redirects) werden bewusst übersprungen.
    """
    href_rx = re.compile(r'href=["\']([^"\'#?]+\.html)(?:[#?][^"\']*)?["\']', re.I)
    skip = ("http://", "https://", "//", "mailto:", "tel:", "data:")
    for p in html_files():
        rel = str(p.relative_to(ROOT))
        s = p.read_text(encoding="utf-8", errors="replace")
        seen = set()
        for href in href_rx.findall(s):
            if href in seen or href.lower().startswith(skip):
                continue
            seen.add(href)
            if href.startswith("/"):
                target = (ROOT / href.lstrip("/"))
            else:
                target = (p.parent / href)
            try:
                target = target.resolve()
                inside = ROOT.resolve() in target.parents or target == ROOT.resolve()
            except Exception:
                inside = False
            if inside and not target.exists():
                findings.append(("high", "Interner Link tot", rel, f"→ {href}"))


def _fix_noopener_in_tag(tag: str) -> str:
    """Ergänzt rel=noopener in einem <a target=_blank>-Tag (idempotent, sicher)."""
    if not re.search(r'target=["\']_blank["\']', tag, re.I):
        return tag
    if "noopener" in tag.lower():
        return tag
    m = re.search(r'\brel=(["\'])(.*?)\1', tag, re.I)
    if m:
        newrel = (m.group(2) + " noopener noreferrer").strip()
        return tag[:m.start(2)] + newrel + tag[m.end(2):]
    return tag[:-1].rstrip() + ' rel="noopener noreferrer">'


def fix_noopener() -> int:
    """Wendet den sicheren noopener-Fix auf alle Seiten an. Gibt Anzahl geänderter Dateien zurück."""
    arx = re.compile(r"<a\b[^>]*>", re.I)
    changed = 0
    for p in html_files():
        s = p.read_text(encoding="utf-8", errors="replace")
        new = arx.sub(lambda m: _fix_noopener_in_tag(m.group(0)), s)
        if new != s:
            p.write_text(new, encoding="utf-8")
            changed += 1
            print(f"  fixed: {p.relative_to(ROOT)}")
    return changed


# Marken-konforme, GRAMMATISCH SICHERE Ersetzungen für Hype-Wörter (ganze Wörter,
# Groß/Klein wird übernommen). Nur eindeutige Fälle — Mehrdeutiges bleibt unangetastet.
# „besonder-" nimmt dieselben Adjektivendungen wie „einzigartig-" → inflektionssicher.
VOICE_MAP = [
    (r"\beinzigartige\b", "besondere"), (r"\beinzigartigen\b", "besonderen"),
    (r"\beinzigartiges\b", "besonderes"), (r"\beinzigartiger\b", "besonderer"),
    (r"\beinzigartig\b", "besonders"),
    (r"\bMehrwert\b", "Nutzen"),  # der Mehrwert -> der Nutzen (gleiches Genus, sicher)
]
VOICE_RX = [(re.compile(p), r) for p, r in VOICE_MAP]
# Schutz-Zonen: in <script>/<style> und in Anführungszeichen/Debunk-Kontext NICHT anfassen
# (dort werden Hype-Wörter bewusst zitiert/entlarvt).
_VOICE_SKIP_FILES = ("archive/", "anti-hype", "brand.html", "hype-", "ki-bullshit",
                     "dossier/", "downloads/", "launch-manual.html", "ki-bullshit-bingo.html")


def _apply_voice_outside_scripts(s: str) -> str:
    """Ersetzt nur im sichtbaren Markup, lässt <script>/<style>-Blöcke unberührt."""
    parts = re.split(r"(<(?:script|style)\b.*?</(?:script|style)>)", s, flags=re.S | re.I)
    for i in range(0, len(parts), 2):  # nur die Nicht-Script-Teile
        seg = parts[i]
        for rx, rep in VOICE_RX:
            seg = rx.sub(rep, seg)
        parts[i] = seg
    return "".join(parts)


def fix_voice() -> int:
    """Sichere Marken-/Voice-Ersetzungen (Hype-Wörter) über alle Seiten. Idempotent.
    Lässt Zitat-/Debunk-/Archiv-Seiten + Script-Blöcke bewusst unangetastet."""
    changed = 0
    for p in html_files():
        rel = str(p.relative_to(ROOT))
        if any(x in rel for x in _VOICE_SKIP_FILES):
            continue
        s = p.read_text(encoding="utf-8", errors="replace")
        new = _apply_voice_outside_scripts(s)
        if new != s:
            p.write_text(new, encoding="utf-8")
            changed += 1
            print(f"  voice: {p.relative_to(ROOT)}")
    return changed


def write_brain_state(n_pages: int, counts: dict) -> float:
    """Gedächtnis des 'Hirns': schreibt Health-Score + Verlauf nach
    automation/brain-state.json, damit sich die Seite messbar selbst verbessert.

    Score = 100 minus gewichtete Mängel (high=3, medium=1, low=0.1), 0–100.
    So sieht jede Session/jeder Lauf sofort, ob es bergauf oder bergab geht.
    """
    penalty = counts["high"] * 3 + counts["medium"] * 1 + counts["low"] * 0.1
    score = round(max(0.0, 100.0 - penalty), 1)
    state_path = ROOT / "automation" / "brain-state.json"
    state = {"history": []}
    if state_path.exists():
        try:
            state = json.loads(state_path.read_text(encoding="utf-8"))
        except Exception:
            state = {"history": []}
    today = date.today().isoformat()
    entry = {"date": today, "pages": n_pages, "high": counts["high"],
             "medium": counts["medium"], "low": counts["low"], "score": score}
    hist = [h for h in state.get("history", []) if h.get("date") != today]
    hist.append(entry)
    hist = hist[-60:]  # letzte 60 Läufe behalten
    prev = hist[-2]["score"] if len(hist) >= 2 else None
    trend = ("→ neu" if prev is None else
             f"↑ +{round(score - prev, 1)}" if score > prev else
             f"↓ {round(score - prev, 1)}" if score < prev else "→ stabil")
    state = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
             "score": score, "trend": trend, "best": max(h["score"] for h in hist),
             "history": hist}
    state_path.parent.mkdir(parents=True, exist_ok=True)
    state_path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n",
                          encoding="utf-8")
    print(f"🧠 Brain-Score: {score}/100 ({trend}) → {state_path.relative_to(ROOT)}")
    return score


def write_brain_page() -> None:
    """Selbst-aktualisierende öffentliche Seite brain.html: zeigt den Autonomie-/
    Qualitäts-Zustand der Website. Wird bei JEDEM Scan neu aus brain-state.json
    erzeugt → ist also immer aktuell ('die Seite, die die Seite verbessert')."""
    sp = ROOT / "automation" / "brain-state.json"
    if not sp.exists():
        return
    try:
        st = json.loads(sp.read_text(encoding="utf-8"))
    except Exception:
        return
    hist = st.get("history", [])[-14:]
    last = hist[-1] if hist else {"pages": 0, "high": 0, "medium": 0, "low": 0}
    score = st.get("score", 0)
    best = st.get("best", score)
    trend = st.get("trend", "—")
    updated = st.get("updated", "")
    mx = max([h.get("score", 0) for h in hist] + [100]) or 100
    bars = "".join(
        '<div class="bar" title="{d}: {s}/100 · {p} Seiten" style="height:{h}%"></div>'.format(
            d=h.get("date", ""), s=h.get("score", 0), p=h.get("pages", 0),
            h=max(6, round(h.get("score", 0) / mx * 100)))
        for h in hist)
    checks = [
        ("🔗", "Sicherheit", "Externe Links automatisch mit <code>rel=noopener</code> abgesichert (Tabnabbing-Schutz)."),
        ("🗣️", "Ehrlicher Ton", "Hype-/Marketing-Floskeln werden erkannt und sinnerhaltend entschärft."),
        ("🖼️", "SEO &amp; Social", "Fehlende <code>og:image</code>/Canonicals/Alt-Texte werden beim Build ergänzt."),
        ("🔍", "Integrität", "Interne Links, Sitemap-Frische und JSON-LD werden bei jedem Lauf geprüft."),
        ("📈", "Selbst-Messung", "Jeder Lauf schreibt einen Health-Score (0–100) + Verlauf — sichtbar unten."),
    ]
    checkhtml = "".join(
        '<div class="ck"><div class="ci">{i}</div><div><b>{t}</b><p>{d}</p></div></div>'.format(i=i, t=t, d=d)
        for i, t, d in checks)
    html = '''<!DOCTYPE html><html lang="de"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🧠 aban-Brain — die Seite, die sich selbst verbessert | aban news</title>
<meta name="description" content="Transparenz-Seite: Wie sich abannews.com automatisch selbst prüft und verbessert — mit Live-Health-Score und Verlauf. Ehrlich, ohne Hype.">
<link rel="canonical" href="https://abannews.com/brain.html">
<meta name="robots" content="index, follow">
<meta property="og:title" content="aban-Brain — die Seite, die sich selbst verbessert">
<meta property="og:description" content="Live-Health-Score + automatische Qualitätssicherung von abannews.com.">
<meta property="og:type" content="website"><meta property="og:url" content="https://abannews.com/brain.html">
<meta property="og:image" content="https://abannews.com/og-image.png">
<meta name="theme-color" content="#d97706"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--amber:#d97706;--amber-dk:#b45309;--cream:#fef3c7;--ink:#1f2937;--ink2:#374151;--muted:#6b7280;--line:#ece3d4;--bg:#fffbf5;--card:#fff;--ok:#15803d;--okbg:#ecfdf3}
@media(prefers-color-scheme:dark){:root{--ink:#f3ede2;--ink2:#d6cdbd;--muted:#9c9384;--line:#3a352d;--bg:#1a1712;--card:#231f19;--cream:#3a2f1c}}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;line-height:1.6;color:var(--ink);background:var(--bg)}
.wrap{max-width:880px;margin:0 auto;padding:0 20px}
header.site{border-bottom:1px solid var(--line)}header.site .wrap{display:flex;align-items:center;justify-content:space-between;padding:14px 20px}
.brand{font-weight:800;color:var(--amber);text-decoration:none}a{color:var(--amber-dk)}
.hero{text-align:center;padding:40px 0 6px}.hero h1{font-size:clamp(24px,4.4vw,34px);letter-spacing:-.02em;margin-bottom:8px}
.hero p{color:var(--ink2);max-width:620px;margin:0 auto}
.score{margin:26px auto;max-width:420px;background:var(--okbg);border:1px solid var(--amber);border-radius:18px;padding:24px;text-align:center}
.score .n{font-size:3.4rem;font-weight:800;color:var(--ok);line-height:1}.score .o{color:var(--muted);font-size:.9rem;margin-top:4px}
.kv{display:flex;justify-content:center;gap:22px;margin-top:14px;flex-wrap:wrap;font-size:.9rem;color:var(--ink2)}
.kv b{color:var(--ink)}
.chart{display:flex;align-items:flex-end;gap:5px;height:120px;margin:10px 0 4px;padding:12px;background:var(--card);border:1px solid var(--line);border-radius:14px}
.bar{flex:1;background:linear-gradient(180deg,var(--amber),var(--amber-dk));border-radius:4px 4px 0 0;min-width:6px}
.cards{display:grid;grid-template-columns:1fr;gap:10px;margin:8px 0 4px}
.ck{display:flex;gap:12px;background:var(--card);border:1px solid var(--line);border-radius:13px;padding:14px 16px}
.ck .ci{font-size:1.4rem}.ck b{font-size:.98rem}.ck p{color:var(--ink2);font-size:.9rem;margin-top:2px}.ck code{background:var(--cream);padding:1px 5px;border-radius:5px;font-size:.85em}
.note{background:var(--cream);border-radius:12px;padding:14px 16px;color:var(--ink2);font-size:.9rem;margin:16px 0}
h2{font-size:1.2rem;margin:26px 0 10px}
footer{border-top:1px solid var(--line);margin-top:30px;padding:22px 0;font-size:.82rem;color:var(--muted)}footer a{color:var(--muted)}
.tag{display:inline-block;background:var(--okbg);color:var(--ok);border:1px solid var(--amber);border-radius:20px;padding:3px 11px;font-size:.8rem;font-weight:700}</style>
</head><body>
<header class="site"><div class="wrap"><a href="/" class="brand">aban news</a><a href="/marktplatz.html">Marktplatz →</a></div></header>
<main><div class="wrap">
<section class="hero"><span class="tag">🧠 Autonome Qualitätssicherung</span>
<h1>Die Seite, die sich selbst verbessert</h1>
<p>abannews.com prüft sich bei jedem Lauf automatisch auf Sicherheit, ehrlichen Ton, SEO und kaputte Links — und hält einen offenen Health-Score. Diese Seite wird bei jedem Lauf neu erzeugt.</p></section>
<div class="score"><div class="n">''' + str(score) + '''<span style="font-size:1.2rem;color:var(--muted)">/100</span></div>
<div class="o">Health-Score · Trend ''' + str(trend) + ''' · Bestwert ''' + str(best) + '''</div>
<div class="kv"><span>📄 <b>''' + str(last.get("pages", 0)) + '''</b> Seiten</span><span>🔴 <b>''' + str(last.get("high", 0)) + '''</b> hoch</span><span>🟡 <b>''' + str(last.get("medium", 0)) + '''</b> mittel</span><span>🟢 <b>''' + str(last.get("low", 0)) + '''</b> niedrig</span></div></div>
<h2>Verlauf (letzte Läufe)</h2><div class="chart">''' + (bars or '<span style="color:var(--muted)">noch keine Daten</span>') + '''</div>
<h2>Was automatisch läuft</h2><div class="cards">''' + checkhtml + '''</div>
<div class="note">⚖️ <b>Ehrlich:</b> Der Score ist eine Heuristik, kein Marketing-Versprechen. Automatisch behoben werden nur eindeutig sichere Dinge (z. B. <code>rel=noopener</code>, Hype-Wörter); inhaltliche Entscheidungen prüft ein Mensch. Stand: ''' + str(updated) + '''.</div>
<p style="margin:14px 0"><a href="/marktplatz.html">← Zum Marktplatz</a> · <a href="/welche-ki-fuer-was.html">Tool-Finder</a> · <a href="/ueber-aban.html">Über aban</a></p>
</div></main>
<footer><div class="wrap">&copy; 2026 aban news · Auto-generiert von <code>tools/daily_improvement_scan.py</code> · <a href="/impressum.html">Impressum</a></div></footer>
</body></html>
'''
    (ROOT / "brain.html").write_text(html, encoding="utf-8")
    print("🧠 brain.html aktualisiert.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=12, help="Beispiele je Kategorie im Report")
    ap.add_argument("--out", default=str(ROOT / "reports" / "IMPROVEMENT-REPORT.md"))
    ap.add_argument("--fix", action="store_true",
                    help="Sichere mechanische Fixes anwenden (rel=noopener bei target=_blank).")
    ap.add_argument("--voice", action="store_true",
                    help="Sichere Marken-/Voice-Ersetzungen (Hype-Wörter, nur eindeutige Fälle).")
    args = ap.parse_args()

    if args.fix:
        n = fix_noopener()
        print(f"noopener-Fix: {n} Datei(en) geändert.")
        return

    if args.voice:
        n = fix_voice()
        print(f"voice-Fix: {n} Datei(en) geändert.")
        return

    findings: list = []
    n_pages = 0
    for p in html_files():
        n_pages += 1
        try:
            scan_page(p, findings)
        except Exception as ex:
            findings.append(("high", "Scan-Fehler", str(p.relative_to(ROOT)), str(ex)[:80]))
    scan_sitemap(findings)
    scan_internal_links(findings)

    sev_rank = {"high": 0, "medium": 1, "low": 2}
    by_cat: dict = {}
    for sev, cat, rel, detail in findings:
        by_cat.setdefault((sev_rank[sev], sev, cat), []).append((rel, detail))

    counts = {"high": 0, "medium": 0, "low": 0}
    for sev, *_ in findings:
        counts[sev] += 1

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        "# Täglicher Verbesserungs-Report — abannews.com",
        "",
        f"> Automatisch erzeugt: **{now}** · {n_pages} HTML-Seiten geprüft · "
        f"reine Heuristik, manuell verifizieren.",
        "",
        f"**Befunde:** 🔴 {counts['high']} hoch · 🟡 {counts['medium']} mittel · "
        f"🟢 {counts['low']} niedrig (Tonalität)",
        "",
        "Ergänzend: `python3 tools/link_checker.py` prüft kaputte Links separat.",
        "",
    ]
    if not findings:
        lines.append("✅ Keine Befunde. Sauber.")
    icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}
    for (rank, sev, cat) in sorted(by_cat):
        items = by_cat[(rank, sev, cat)]
        lines.append(f"## {icon[sev]} {cat} — {len(items)}")
        for rel, detail in items[:args.top]:
            lines.append(f"- `{rel}` — {detail}")
        if len(items) > args.top:
            lines.append(f"- … und {len(items) - args.top} weitere")
        lines.append("")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"{n_pages} Seiten geprüft · {counts['high']} hoch / {counts['medium']} mittel / "
          f"{counts['low']} niedrig → {out.relative_to(ROOT)}")
    write_brain_state(n_pages, counts)  # 🧠 Selbst-Tracking: Score + Verlauf
    write_brain_page()                  # 🧠 Selbst-aktualisierende Seite brain.html
    # Exit 0: Report-Tool, kein CI-Blocker.


if __name__ == "__main__":
    main()
