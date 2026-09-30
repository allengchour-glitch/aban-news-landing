#!/usr/bin/env python3
"""Anleitung als PDF für die Etsy-Pakete: Etsy-Abschnitt (Dateien, Google Sheets) + die Produkt-ANLEITUNG.md.

    pip install markdown && python3 tools/etsy/anleitung_pdf.py
    → schreibt content/etsy/<produkt>/dateien/_anleitung.html; das PDF rendert tools/etsy/pdf.mjs (Chromium).
"""
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parents[2]
ETSY = {
    "budget-plan": ("Budget-Plan Schweiz", "Budget-Plan-Schweiz.xlsx", "Budget-Plan-App.html"),
    "schulden-plan": ("Schulden-Plan Schweiz", "Schulden-Plan-Schweiz.xlsx", "Schulden-Plan-App.html"),
}
CSS = """@page{size:A4;margin:18mm 18mm 20mm}
body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2937;font-size:11pt;line-height:1.5}
h1{font-family:Georgia,serif;font-size:26pt;margin:0 0 4pt;color:#1f2937}h2{font-size:14pt;color:#b45309;margin:18pt 0 6pt}
h3{font-size:12pt;margin:12pt 0 4pt}p,li{margin:4pt 0}code{background:#fef3c7;padding:1pt 4pt;border-radius:4px}
table{border-collapse:collapse;width:100%;margin:6pt 0}th,td{border-bottom:1px solid #e7dfd2;padding:5pt;text-align:left;vertical-align:top}
th{background:#b45309;color:#fff}.box{background:#fef3c7;border-radius:8px;padding:10pt 12pt;margin:10pt 0}
.fuss{color:#6b7280;font-size:9pt;margin-top:24pt;border-top:1px solid #e7dfd2;padding-top:6pt}"""


def main():
    for slug, (name, xlsx, app) in ETSY.items():
        md = (ROOT / "content" / "packs" / "de" / slug / "ANLEITUNG.md").read_text(encoding="utf-8")
        md = md.replace(f"Öffne `{slug}.html`", f"Öffne `{app}`")
        md = "\n".join(l for l in md.splitlines() if not l.startswith("# "))  # Titel kommt vom Kopf unten
        kopf = f"""<h1>{name}</h1><p>Danke für deinen Kauf. Hier findest du alles, um in wenigen Minuten zu starten.</p>
<h2>Deine Dateien</h2>
<table><tr><th>Datei</th><th>Wofür</th></tr>
<tr><td><b>{xlsx}</b></td><td>Die Vorlage mit allen Formeln. Öffnen mit Excel oder Google Sheets. Nur die gelben Felder ausfüllen.</td></tr>
<tr><td><b>{app}</b></td><td>Die Offline-App: Doppelklick, sie öffnet sich im Browser, auch auf dem Handy. Kein Konto, kein Internet nötig, deine Zahlen bleiben auf deinem Gerät.</td></tr>
<tr><td><b>Anleitung (dieses PDF)</b></td><td>Start, Erklärungen und Tipps für die Schweiz.</td></tr></table>
<div class="box"><b>In Google Sheets verwenden:</b> drive.google.com öffnen → „Neu“ → „Datei hochladen“ → die Excel-Datei wählen →
Rechtsklick → „Öffnen mit“ → „Google Tabellen“. Alle verwendeten Funktionen gibt es auch in Google Tabellen.<br>
<b>Auf dem Handy:</b> Die App-Datei in der Dateien-App antippen und „In Safari/Chrome öffnen“ wählen.</div>"""
        html = f"<html><head><meta charset='utf-8'><style>{CSS}</style></head><body>{kopf}" \
               f"{markdown.markdown(md, extensions=['tables'])}" \
               f"<p class='fuss'>{name} · aban news · abannews.com · Private Nutzung, Weitergabe und Weiterverkauf nicht " \
               f"gestattet. Planungshilfe, keine Finanz- oder Schuldenberatung.</p></body></html>"
        ziel = ROOT / "content" / "etsy" / slug / "dateien" / "_anleitung.html"
        ziel.write_text(html, encoding="utf-8")
        print(f"→ {ziel.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
