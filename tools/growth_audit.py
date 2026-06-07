#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""aban news — Wachstums-Audit (deterministisch, stdlib, KEINE erfundenen Zahlen).

Prüft die ausgelieferte Haupt-Website auf die *ehrlich autonom* verbesserbaren
Wachstums-Hebel und schreibt einen priorisierten Report nach reports/GROWTH-AUDIT.md:

  1. OG-Bild-Abdeckung — hat jede indexierbare Seite ein og:image, das auch existiert?
     (Bessere Vorschau beim Teilen → höhere Klickrate.)
  2. Newsletter-CTA — verlinkt jede Seite die beehiiv-Anmeldung? (Opt-in-Hebel.)
  3. Funnel-Block — tragen alle ki-fuer-*-Hubs den Tool-/Newsletter-Block (data-aban-tools-cta)?
  4. Geld-Funnel — verlinken die Hubs die Founding-Seite? (Monetarisierung.)
  5. Interne Link-Gesundheit — defekte interne Links (über check_internal_links).
  6. Verwaiste Hubs — Hubs, die von keiner anderen Seite verlinkt sind (schlechter Crawl).

Was dieses Tool NICHT kann (ehrlich): Abonnent:innen „automatisch finden". Es macht nur
den oberen Trichter breiter — echtes Wachstum braucht Teilen/Posten (Mensch) + Zeit.

    python3 tools/growth_audit.py            # schreibt Report, Exit 0
    python3 tools/growth_audit.py --print     # zusätzlich auf stdout
"""
from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "tools"))
try:
    from check_internal_links import scan as scan_links  # interne Link-Gesundheit
except Exception:  # noqa: BLE001
    scan_links = None

OUT = REPO / "reports" / "GROWTH-AUDIT.md"
BEEHIIV = "abannews.beehiiv.com/subscribe"
FUNNEL_MARKER = "data-aban-tools-cta"
FOUNDING = "/founding.html"

OG_RE = re.compile(r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']', re.I)
NOINDEX_RE = re.compile(r'<meta\s+name=["\']robots["\']\s+content=["\'][^"\']*noindex', re.I)
HREF_RE = re.compile(r'href\s*=\s*"([^"]+)"')
CTA_RE = re.compile(r'beehiiv\.com/subscribe', re.I)  # jede beehiiv-Anmeldung zählt

# Nicht-abannews / interne Dateien aus dem Audit ausschließen (sonst falsche Befunde).
EXCLUDE_PARTS = ("/dist/", "node_modules", "/video-prototypes/", "/aban-studio/")
# Seiten, auf denen ein Newsletter-CTA NICHT erwartet wird (Recht/Utility).
NO_CTA_EXPECTED = {"impressum.html", "datenschutz.html", "agb.html", "widerruf.html",
                   "404.html", "barrierefreiheit.html", "sitemap.html"}


def _internal(p: Path) -> bool:
    rp = "/" + p.relative_to(REPO).as_posix()
    if any(x in rp for x in EXCLUDE_PARTS):
        return True
    n = p.name
    return n.endswith(("-preview.html", "-draft.html")) or (
        n.startswith("issue-") and n.endswith("-final.html"))


def main_site_html() -> list[Path]:
    """Alle indexierbaren HTML-Seiten der Haupt-Website (ohne Prototypen/Drafts/Sub-Sites)."""
    return [p for p in REPO.rglob("*.html") if not _internal(p)]


def og_target_exists(page: Path, url: str) -> bool:
    if url.startswith(("http://", "https://", "//", "data:")):
        return True  # extern/CDN — können wir lokal nicht prüfen, gilt als vorhanden
    rel = url.split("#")[0].split("?")[0].lstrip("/")
    return (REPO / rel).exists()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--print", action="store_true", dest="echo")
    args = ap.parse_args()

    pages = main_site_html()
    hubs = sorted(REPO.glob("ki-fuer-*.html"))

    no_og, no_cta, no_funnel, no_founding = [], [], [], []
    indexable = 0
    for p in pages:
        s = p.read_text(encoding="utf-8", errors="ignore")
        if NOINDEX_RE.search(s):
            continue  # bewusst nicht indexiert → für SEO/Teilen irrelevant
        indexable += 1
        rp = p.relative_to(REPO).as_posix()
        m = OG_RE.search(s)
        if not m or not og_target_exists(p, m.group(1)):
            no_og.append(rp)
        if p.name not in NO_CTA_EXPECTED and not CTA_RE.search(s):
            no_cta.append(rp)

    for h in hubs:
        s = h.read_text(encoding="utf-8", errors="ignore")
        if FUNNEL_MARKER not in s:
            no_funnel.append(h.name)
        if FOUNDING not in s:
            no_founding.append(h.name)

    # Verwaiste Hubs: kein anderer Seiteninhalt verlinkt sie.
    linked: set[str] = set()
    hub_names = {h.name for h in hubs}
    for p in pages:
        if p.name in hub_names:
            pass  # Hub darf sich nicht selbst „retten"
        s = p.read_text(encoding="utf-8", errors="ignore")
        for href in HREF_RE.findall(s):
            tgt = href.split("#")[0].split("?")[0].rstrip("/").split("/")[-1]
            if tgt in hub_names and p.name != tgt:
                linked.add(tgt)
    orphans = sorted(hub_names - linked)

    broken = {}
    if scan_links:
        try:
            broken = scan_links()
        except Exception:  # noqa: BLE001
            broken = {}

    today = dt.date.today().isoformat()
    L = [f"# Wachstums-Audit — abannews.com ({today})", ""]
    L.append(f"**Befunde:** 🖼️ {len(no_og)} ohne OG-Bild · 📧 {len(no_cta)} ohne Newsletter-CTA · "
             f"🧲 {len(no_funnel)} Hubs ohne Funnel-Block · 💶 {len(no_founding)} Hubs ohne "
             f"Founding-Link · 🔗 {len(broken)} defekte Links · 🕳️ {len(orphans)} verwaiste Hubs")
    L.append("")
    L.append(f"_Geprüft: {indexable} indexierbare Seiten, {len(hubs)} Branchen-Hubs._")
    L.append("")

    def section(title, items, hint):
        L.append(f"## {title} — {len(items)}")
        if not items:
            L.append("✅ Alles abgedeckt.")
        else:
            L.append(hint)
            for n in items[:25]:
                L.append(f"- {n}")
            if len(items) > 25:
                L.append(f"- … und {len(items) - 25} weitere")
        L.append("")

    section("🖼️ Seiten ohne (vorhandenes) OG-Bild", no_og,
            "Teilen-Vorschau fehlt/zeigt nichts → OG-Bild ergänzen (gratis via Pillow-Karte).")
    section("📧 Seiten ohne Newsletter-CTA", no_cta,
            "Kein beehiiv-Opt-in → CTA-Box/Link ergänzen.")
    section("🧲 Hubs ohne Funnel-Block", no_funnel,
            "`python3 tools/add_branchen_funnel.py` ausführen.")
    section("💶 Hubs ohne Founding-Link", no_founding,
            "`python3 tools/add_branchen_funnel.py` ausführen (Geld-Funnel).")
    section("🕳️ Verwaiste Hubs (von keiner Seite verlinkt)", orphans,
            "Aus passenden Seiten/„verwandte Branchen“ verlinken → besserer Crawl & Verweildauer.")

    L.append("## 🔗 Defekte interne Links — " + str(len(broken)))
    if not broken:
        L.append("✅ Keine defekten internen Links.")
    else:
        for url, srcs in list(sorted(broken.items()))[:25]:
            L.append(f"- `{url}` ← {srcs[0]}" + (f" (+{len(srcs)-1})" if len(srcs) > 1 else ""))
    L.append("")

    L.append("## 🙋 Nur du (nicht autonom machbar)")
    L.append("- **Reichweite:** die OG-reichen Hubs organisch teilen (LinkedIn/X/WhatsApp/Reddit).")
    L.append("- **Posting-Tokens:** LinkedIn-OAuth setzen (`docs/LINKEDIN-AUTOPOST.md`), dann postet der Autopilot werktags mit.")
    L.append("- **beehiiv-Empfehlungsprogramm** aktivieren (Referral-Link) — echter, erlaubter Wachstumshebel.")
    L.append("- **Konversion:** erst Traffic+Liste bringen Founding/Premium/Affiliate Umsatz. Kein Tool erfindet Nachfrage.")
    L.append("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(L) + "\n", encoding="utf-8")
    print(f"✓ Wachstums-Audit geschrieben: {OUT.relative_to(REPO)}")
    if args.echo:
        print("\n".join(L))
    return 0


if __name__ == "__main__":
    sys.exit(main())
