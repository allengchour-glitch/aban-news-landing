#!/usr/bin/env python3
"""Fügt Gemini-generierte Vergleichstabelle zu allen *-kaufen-schweiz.html hinzu.

Marker: data-aban-compare — idempotent (überspringt Seiten die ihn bereits haben).
Einfügen: zwischen Answer-First-Block + Tips und der "Häufige Fragen"-H2.
"""
import os, re, glob, time, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = 'data-aban-compare'
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

TABLE_CSS = (
    '<style data-aban-compare-css>.ctable{width:100%;border-collapse:collapse;margin:4px 0 20px;'
    'font-size:.91rem}.ctable th{background:#fff7ed;padding:9px 12px;border:1px solid #fed7aa;'
    'font-weight:700;text-align:left}.ctable td{padding:8px 12px;border:1px solid #e6e1d6;'
    'vertical-align:top}.ctable tr:nth-child(even) td{background:#fffbf5}'
    '.ctable .ck0{color:#059669;font-weight:700}.ctable .ck1{color:#d97706;font-weight:700}'
    '.ctable .ck2{color:#7c3aed;font-weight:700}</style>\n'
)

INSERT_BEFORE = re.compile(r'(\s*<h2[^>]*>\s*Häufige Fragen\s*</h2>)', re.IGNORECASE)
CSS_ALREADY = re.compile(r'data-aban-compare-css')


def extract_page_info(html, fname):
    h1m = re.search(r'<h1[^>]*>(.*?)</h1>', html)
    h1 = h1m.group(1) if h1m else fname.replace('-kaufen-schweiz.html', '').replace('-', ' ')
    h1 = re.sub(r'<[^>]+>', '', h1).strip()

    tips = re.findall(r'class="tip"[^>]*><h3>([^<]+)</h3><p>([^<]+)</p>', html)
    faq_q = re.findall(r'<summary>([^<]+)</summary>', html)
    return h1, tips[:4], faq_q[:3]


def tips_to_table(tips):
    """Fallback ohne Gemini: Kaufkriterien-Tabelle aus vorhandenen Tip-Cards."""
    ck = ["ck0", "ck1", "ck2", "ck3"]
    rows = ""
    for i, (h3, p) in enumerate(tips[:4]):
        cls = ck[i % len(ck)]
        rows += f'<tr><td class="{cls}">{h3}</td><td>{p}</td></tr>\n'
    return (
        f'<table class="ctable" data-aban-compare>'
        f'<thead><tr><th>Kriterium</th><th>Was zählt beim Kauf</th></tr></thead>'
        f'<tbody>{rows}</tbody></table>'
    )


def gemini_table(h1, tips, faq_q):
    import urllib.request
    tips_txt = "\n".join(f"- {t}: {d[:80]}" for t, d in tips)
    faq_txt = "\n".join(f"- {q}" for q in faq_q)
    prompt = (
        f"Du schreibst eine Vergleichstabelle für eine Schweizer Kaufberater-Seite.\n"
        f"Thema: {h1}\n"
        f"Vorhandene Kauftipps:\n{tips_txt}\n"
        f"FAQ-Fragen (Kontext):\n{faq_txt}\n\n"
        "Erstelle eine HTML-Tabelle mit GENAU 3 Zeilen (Günstig/Mittel/Premium) "
        "und 4 Spalten: Preisklasse | Typischer Preis (CHF) | Eignet sich für | Grösste Einschränkung\n\n"
        "Regeln:\n"
        "- Reale, ehrliche Angaben — kein Hype, kein Marketing\n"
        "- Schweizer Hochdeutsch; max 12 Wörter pro Zelle\n"
        "- CHF mit Apostroph-Tausender-Trenner (1'200 CHF), Bereiche z. B. 50–200 CHF\n"
        "- Klassen-Attribut: 1. Zeile class=\"ck0\", 2. Zeile class=\"ck1\", 3. Zeile class=\"ck2\" auf die erste TD\n"
        "- NUR die Tabelle, KEIN anderer Text, KEINE Erklärung\n"
        "- Format: <table class=\"ctable\" data-aban-compare><thead><tr>"
        "<th>Preisklasse</th><th>Typischer Preis (CHF)</th><th>Eignet sich für</th>"
        "<th>Grösste Einschränkung</th></tr></thead><tbody>..."
        "</tbody></table>"
    )
    body = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 512}
    }).encode()
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
    )
    req = urllib.request.Request(url, data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        resp = json.loads(r.read().decode())
    text = resp["candidates"][0]["content"]["parts"][0]["text"].strip()
    text = re.sub(r'^```html?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*```$', '', text).strip()
    return text


def process_file(path):
    with open(path, encoding="utf-8") as f:
        html = f.read()

    if MARKER in html:
        return False, "skip"

    fname = os.path.basename(path)
    h1, tips, faq_q = extract_page_info(html, fname)

    if not tips:
        return False, "no-tips"

    if GEMINI_KEY:
        table = gemini_table(h1, tips, faq_q)
        if not table or '<table' not in table:
            table = tips_to_table(tips)
    else:
        table = tips_to_table(tips)
    if not table or '<table' not in table:
        return False, "no-table"

    heading = "Preisklassen im Vergleich" if GEMINI_KEY else "Kaufkriterien im Überblick"
    section = (
        f'\n<div class="compare-section" style="margin:18px 0 4px">\n'
        f'  <h2 style="margin-bottom:8px">{heading}</h2>\n'
        f'  {table}\n'
        f'</div>\n'
    )

    new_html, n = INSERT_BEFORE.subn(section + r'\1', html, count=1)
    if n == 0:
        return False, "no-insert"

    # inject CSS once per page (before </style>)
    if not CSS_ALREADY.search(new_html):
        new_html = new_html.replace('</style>\n', f'</style>\n{TABLE_CSS}', 1)

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)
    return True, h1


def main():
    pages = sorted(glob.glob(os.path.join(ROOT, "*-kaufen-schweiz.html")))
    mode = "Gemini Preisklassen-Vergleich" if GEMINI_KEY else "Tipp-Kriterien-Tabelle (kein GEMINI_API_KEY)"
    print(f"📋 {len(pages)} Kaufberater-Seiten gefunden — Modus: {mode}")

    done = skipped = errors = 0
    for i, path in enumerate(pages, 1):
        fname = os.path.basename(path)
        try:
            ok, info = process_file(path)
            if ok:
                done += 1
                print(f"  ✓ [{i}/{len(pages)}] {fname} — {info[:60]}")
            else:
                skipped += 1
                if info not in ("skip",):
                    print(f"  · [{i}/{len(pages)}] {fname} — {info}")
            # rate limit: ~30 req/min for Gemini free tier
            if ok:
                time.sleep(2.2)
        except Exception as e:
            errors += 1
            print(f"  ✗ [{i}/{len(pages)}] {fname} — {e}")
            time.sleep(3)

    print(f"\n✅ Fertig: {done} bearbeitet, {skipped} übersprungen, {errors} Fehler")


if __name__ == "__main__":
    main()
