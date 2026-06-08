#!/usr/bin/env python3
"""tools/abanctl.py — kleines Steuer-CLI fürs aban-news-Repo.

Automatisiert die wiederkehrenden Handgriffe (Status sehen, Buy-/Affiliate-Links
scharfschalten), die sonst Datei-für-Datei von Hand laufen. Reine stdlib.

    python3 tools/abanctl.py status                      # Geld-/Projekt-Überblick
    python3 tools/abanctl.py wire-buy PAKET_BUY_URL <url> # Checkout-Link setzen
    python3 tools/abanctl.py wire-affiliate ki-tools-radar jasper <url>

Danach committen + pushen (macht das CLI bewusst NICHT automatisch).
"""
import argparse
import glob
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _read(path):
    p = os.path.join(ROOT, path)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def _js_kv(text):
    """Alle  schluessel: "wert"  Paare aus einer JS-Config ziehen."""
    return dict(re.findall(r'(\w+)\s*:\s*"([^"]*)"', text))


def _mark(v):
    return "✅ live" if v and v.startswith(("http://", "https://")) else "—  leer"


# --------------------------------------------------------------------------- #
def cmd_status(_args):
    print("== PRODUKTE / CHECKOUT ==")
    # neue Produkte (zentrale Config)
    for k, v in _js_kv(_read("js/checkout-config.js")).items():
        print(f"  {_mark(v)}  {k}")
    # Buch + Premium (eigene Configs)
    buch = _js_kv(_read("js/buch-config.js"))
    if "BUY_URL" in buch:
        print(f"  {_mark(buch['BUY_URL'])}  BUCH_BUY_URL (Anti-Hype-Buch)")
    pay = _js_kv(_read("js/pay-config.js"))
    for k in ("PREMIUM_MONTHLY_URL", "PREMIUM_YEARLY_URL"):
        if k in pay:
            print(f"  {_mark(pay[k])}  {k}")
    # Starter-Kits
    try:
        kits = json.loads(_read("data/shop-products.json"))
        kits = kits if isinstance(kits, list) else kits.get("products", kits.get("items", []))
        live = sum(1 for p in kits if str(p.get("buy", "")).startswith("https://") and "abc" not in p.get("buy", ""))
        print(f"  {'✅ live' if live == len(kits) and kits else '—  teils'}  Starter-Kits ({live}/{len(kits)} Stripe)")
    except Exception:
        pass

    print("\n== AFFILIATE (Radars) ==")
    total_active = 0
    for af in sorted(set(glob.glob(os.path.join(ROOT, "*", "affiliate.json")))):
        try:
            links = json.load(open(af, encoding="utf-8")).get("links", {})
        except Exception:
            continue
        active = [k for k, v in links.items()
                  if not k.startswith("_") and isinstance(v, dict) and v.get("affiliate_url")]
        disabled = [k for k in links if k.startswith("_") and k != "_anleitung"]
        total_active += len(active)
        name = os.path.basename(os.path.dirname(af))
        flag = "✅" if active else "—"
        print(f"  {flag} {name}: {len(active)} aktiv" +
              (f" ({', '.join(active)})" if active else "") +
              (f" · {len(disabled)} offen" if disabled else ""))
    print(f"  → {total_active} aktive Affiliate-Links gesamt")

    print("\n== REELS (/reels-Loop) ==")
    reels = glob.glob(os.path.join(ROOT, "media", "reels", "*.mp4"))
    print(f"  {len(reels)} Reel(s) im Loop")

    print("\n== BOARD (offene Tasks) ==")
    try:
        tasks = json.loads(_read("docs/_board.json")).get("tasks", [])
        from collections import Counter
        c = Counter(t.get("status", "?") for t in tasks)
        print("  " + " · ".join(f"{k}: {v}" for k, v in c.items()))
        for t in tasks:
            if t.get("status") in ("doing", "blocked"):
                print(f"    [{t['status']}] #{t.get('id')} {t.get('task', '')[:70]}")
    except Exception:
        print("  (kein _board.json)")


# --------------------------------------------------------------------------- #
CHECKOUT_KEYS = ("PAKET_BUY_URL", "DATENSATZ_ABO_URL", "MONITOR_ABO_URL", "VORLAGEN_BUY_URL", "COMPLIANCE_BUY_URL", "SCHNELLSTART_BUY_URL", "AUDIT_BUY_URL")


def cmd_wire_buy(args):
    key, url = args.key, args.url
    if key not in CHECKOUT_KEYS:
        sys.exit(f"Unbekannter Key '{key}'. Erlaubt: {', '.join(CHECKOUT_KEYS)}")
    if not re.match(r"^https://", url):
        sys.exit("URL muss mit https:// beginnen (öffentlicher Checkout-Link).")
    path = os.path.join(ROOT, "js", "checkout-config.js")
    text = open(path, encoding="utf-8").read()
    new, n = re.subn(rf'({key}\s*:\s*)"[^"]*"', lambda m: m.group(1) + f'"{url}"', text)
    if not n:
        sys.exit(f"Key '{key}' nicht in js/checkout-config.js gefunden.")
    open(path, "w", encoding="utf-8").write(new)
    print(f"✓ {key} → {url}\n  (js/checkout-config.js aktualisiert — jetzt committen + pushen)")


def cmd_wire_affiliate(args):
    radar, tool, url = args.radar, args.tool, args.url
    if not re.match(r"^https://", url):
        sys.exit("URL muss mit https:// beginnen.")
    path = os.path.join(ROOT, radar, "affiliate.json")
    if not os.path.exists(path):
        sys.exit(f"{radar}/affiliate.json nicht gefunden.")
    data = json.load(open(path, encoding="utf-8"))
    links = data.setdefault("links", {})
    # _<tool> (deaktiviert) → <tool> (aktiv) + URL setzen
    if f"_{tool}" in links:
        entry = links.pop(f"_{tool}")
        entry = entry if isinstance(entry, dict) else {}
        entry["affiliate_url"] = url
        links[tool] = entry
    else:
        links[tool] = {"affiliate_url": url}
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"✓ {radar}: {tool} aktiviert → {url}\n  ({radar}/affiliate.json aktualisiert — committen, dann baut die Seite neu)")


def main():
    ap = argparse.ArgumentParser(prog="abanctl", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("status", help="Geld-/Projekt-Überblick").set_defaults(func=cmd_status)
    b = sub.add_parser("wire-buy", help="Checkout-Link zentral setzen")
    b.add_argument("key"); b.add_argument("url"); b.set_defaults(func=cmd_wire_buy)
    a = sub.add_parser("wire-affiliate", help="Affiliate-Link in einem Radar scharfschalten")
    a.add_argument("radar"); a.add_argument("tool"); a.add_argument("url"); a.set_defaults(func=cmd_wire_affiliate)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
