#!/usr/bin/env python3
# Kontextueller Link von thematischen Guide-Seiten zu den breiten Shop-Produkten
# (Prompt-Bibliothek / Vorlagen-Set, je 19 CHF). Idempotent (data-aban-kit).
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = "data-aban-kit"
# (kit-slug, Linktext, Zusatz) -> Liste passender Guide-Seiten
MAP = [
 ("prompt-bibliothek", "KI-Prompt-Bibliothek", "100+ erprobte Prompts zum Kopieren — Akquise, Kunden, Marketing, Admin. Einmalig 19 CHF.",
  ["ki-prompts-beispiele","ki-prompts-schreiben"]),
 ("vorlagen-set", "Fertige Text-Vorlagen für Solopreneure", "40 sofort nutzbare Vorlagen für Angebote, Mails, Rechnungen &amp; Absagen. Einmalig 19 CHF.",
  ["ki-email-schreiben","ki-text-umschreiben","ki-text-humanisieren"]),
]
def block(slug, label, extra):
    return ('<aside data-aban-kit style="max-width:760px;margin:22px auto;padding:14px 16px;'
            'background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #d97706;border-radius:12px;'
            'font-size:.95rem;line-height:1.5"><strong>Schneller fertig?</strong> '
            f'<a href="/shop.html#kit-{slug}" style="color:#b45309;font-weight:700">{label}</a> — {extra}</aside>\n')
def main():
    n=0
    for slug,label,extra,pages in MAP:
        for name in pages:
            p=os.path.join(ROOT,name+".html")
            if not os.path.isfile(p): continue
            h=open(p,encoding="utf-8",errors="ignore").read()
            if MARK in h: continue
            if re.search(r'<meta[^>]+name=["\']robots["\'][^>]*noindex',h,re.I): continue
            m=re.search(r'<h2[^>]*>\s*Häufige Fragen', h, re.I)
            pos = m.start() if m else h.lower().rfind("</body>")
            if pos<0: continue
            open(p,"w",encoding="utf-8").write(h[:pos]+block(slug,label,extra)+h[pos:]); n+=1
    print(f"✔ Produkt-Crosslink auf {n} Guide-Seiten")
main()
