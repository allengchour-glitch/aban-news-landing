#!/usr/bin/env python3
"""Fügt einen ehrlichen eBay-Affiliate-CTA-Link nach dem .cta2-Block ein.

Idempotent (Marker: data-aban-ebay-link). Nutzt /go/ebay?q= für den
serverseitigen Affiliate-Redirect (functions/go/ebay.js).
"""
import os, re, glob, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKER = "data-aban-ebay-link"

# Match des gesamten .cta2-Blocks (inkl. Inhalt)
CTA2_END = re.compile(r'(<div class="cta2">.*?</div>)', re.DOTALL)

LINK_TMPL = (
    '\n  <p class="rel" style="margin-top:6px;font-size:.82rem" data-aban-ebay-link>'
    '<a href="/go/ebay?q={q}" rel="nofollow sponsored" style="color:var(--muted)">'
    'Preise auf eBay.ch prüfen →</a>'
    ' <small style="color:#9ca3af">(Partner-Link)</small></p>\n'
)


def extract_query(html, fname):
    """Extrahiere Suchbegriff aus vorhandenem bigcta-Link."""
    m = re.search(r'class="bigcta"\s+href="[^"]*[?&]q=([^"&]+)"', html)
    if m:
        return m.group(1).replace("+", " ").replace("%20", " ")
    # Fallback: Slug ohne -kaufen-schweiz
    slug = os.path.basename(fname).replace("-kaufen-schweiz.html", "")
    return slug.replace("-", " ").title()


def process(path):
    with open(path, encoding="utf-8") as f:
        html = f.read()
    if MARKER in html:
        return False, "skip"
    q = extract_query(html, path)
    if not q:
        return False, "no-query"
    link = LINK_TMPL.format(q=q.replace("&", "&amp;"))
    # Insert the link after the closing </div> of .cta2 (just before data-ad-slot)
    new_html, n = CTA2_END.subn(r'\1' + link, html, count=1)
    if n == 0:
        return False, "no-cta2"
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_html)
    return True, q


def main():
    pages = sorted(glob.glob(os.path.join(ROOT, "*-kaufen-schweiz.html")))
    print(f"📋 {len(pages)} Kaufberater-Seiten")
    done = skipped = errors = 0
    for path in pages:
        fname = os.path.basename(path)
        try:
            ok, info = process(path)
            if ok:
                done += 1
            elif info != "skip":
                print(f"  · {fname} — {info}")
                errors += 1
            else:
                skipped += 1
        except Exception as e:
            errors += 1
            print(f"  ✗ {fname} — {e}")
    print(f"✅ {done} bearbeitet · {skipped} skip · {errors} Fehler")


if __name__ == "__main__":
    main()
