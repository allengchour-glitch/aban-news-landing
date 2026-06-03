#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lemon-Squeezy -> js/buch-config.js  (Buy-URL automatisch eintragen)

Was es macht:
  Holt ueber die Lemon-Squeezy-API deine Produkte, sucht das Buch
  "Anti-Hype" (oder ein per --produkt angegebenes Stichwort), nimmt dessen
  oeffentliche Buy-URL und schreibt sie als BUY_URL in js/buch-config.js.
  Danach lesen alle vier Buchseiten (de/en/fr/it) den Link automatisch.

Was es NICHT macht (ehrlich):
  - Kein Konto anlegen, kein Produkt erstellen, keine Datei hochladen.
    Das Produkt legst du einmal im Lemon-Squeezy-Dashboard an
    (siehe automation/lemonsqueezy-produkt-setup.txt). Danach erledigt
    dieses Skript das Verdrahten des Links.

Voraussetzung:
  - Ein Lemon-Squeezy-API-Key. Anlegen unter:
      Settings -> API  ->  "+"  (im LS-Dashboard)
  - Key als Umgebungsvariable setzen (NICHT ins Repo schreiben!):
      export LEMONSQUEEZY_API_KEY="eyJ0eXAiOi..."

Verwendung:
  python3 sync_lemonsqueezy_link.py                 # sucht "Anti-Hype"
  python3 sync_lemonsqueezy_link.py --produkt hype   # eigenes Stichwort
  python3 sync_lemonsqueezy_link.py --dry-run        # nur anzeigen, nichts schreiben
  python3 sync_lemonsqueezy_link.py --list           # alle Produkte auflisten

Exit-Codes: 0 = ok, 1 = Fehler (kein Key, kein Produkt, API-Problem).
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

API_BASE = "https://api.lemonsqueezy.com/v1"
HIER = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HIER, "js", "buch-config.js")
DEFAULT_SUCHE = "anti-hype"


def api_get(pfad, key):
    """GET auf die Lemon-Squeezy-API (JSON:API-Format)."""
    url = pfad if pfad.startswith("http") else API_BASE + pfad
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        "Authorization": "Bearer " + key,
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        sys.exit("! API-Fehler %s: %s\n  %s" % (e.code, e.reason, detail))
    except urllib.error.URLError as e:
        sys.exit("! Netzwerk-Fehler: %s" % e.reason)


def hole_produkte(key):
    """Alle Produkte einsammeln (paginiert)."""
    produkte = []
    pfad = "/products?page[size]=100"
    while pfad:
        daten = api_get(pfad, key)
        produkte.extend(daten.get("data", []))
        pfad = daten.get("links", {}).get("next")
    return produkte


def buy_url(prod):
    """Liefert die oeffentliche Buy-URL eines Produkts (attributes.buy_now_url)."""
    a = prod.get("attributes", {})
    return a.get("buy_now_url") or a.get("url") or ""


def schreibe_config(url):
    """Traegt die URL als BUY_URL in js/buch-config.js ein (idempotent)."""
    if not os.path.exists(CONFIG):
        sys.exit("! Nicht gefunden: %s" % CONFIG)
    with open(CONFIG, "r", encoding="utf-8") as f:
        inhalt = f.read()
    neu, n = re.subn(r'BUY_URL:\s*"[^"]*"', 'BUY_URL: "%s"' % url, inhalt)
    if n == 0:
        sys.exit("! Konnte BUY_URL-Zeile in der Config nicht finden.")
    if neu == inhalt:
        print("= BUY_URL war bereits korrekt gesetzt, keine Aenderung.")
        return False
    with open(CONFIG, "w", encoding="utf-8") as f:
        f.write(neu)
    print("✓ BUY_URL in js/buch-config.js gesetzt:\n  %s" % url)
    return True


def main():
    p = argparse.ArgumentParser(description="Lemon-Squeezy Buy-URL in die Buch-Config schreiben.")
    p.add_argument("--produkt", default=DEFAULT_SUCHE,
                   help="Stichwort im Produktnamen (Default: anti-hype)")
    p.add_argument("--dry-run", action="store_true", help="nur anzeigen, nichts schreiben")
    p.add_argument("--list", action="store_true", help="alle Produkte auflisten und beenden")
    args = p.parse_args()

    key = os.environ.get("LEMONSQUEEZY_API_KEY", "").strip()
    if not key:
        sys.exit("! Kein API-Key. Setze ihn so:\n"
                 "    export LEMONSQUEEZY_API_KEY=\"dein-key\"\n"
                 "  Key anlegen im LS-Dashboard unter Settings -> API.")

    produkte = hole_produkte(key)
    if not produkte:
        sys.exit("! Keine Produkte im Account gefunden. Lege das Buch zuerst im "
                 "Dashboard an (siehe automation/lemonsqueezy-produkt-setup.txt).")

    if args.list:
        print("Produkte im Account:")
        for pr in produkte:
            print("  - %s\n      %s" % (pr.get("attributes", {}).get("name", "?"), buy_url(pr)))
        return

    such = args.produkt.lower().replace(" ", "").replace("-", "")
    treffer = [pr for pr in produkte
               if such in pr.get("attributes", {}).get("name", "").lower().replace(" ", "").replace("-", "")]
    if not treffer:
        namen = ", ".join(pr.get("attributes", {}).get("name", "?") for pr in produkte)
        sys.exit("! Kein Produkt mit '%s' gefunden. Vorhanden: %s\n"
                 "  Tipp: --list zeigt alle, --produkt <wort> sucht gezielt." % (args.produkt, namen))
    if len(treffer) > 1:
        print("! Mehrere Treffer — bitte mit --produkt praeziser:")
        for pr in treffer:
            print("    %s" % pr.get("attributes", {}).get("name", "?"))
        sys.exit(1)

    prod = treffer[0]
    url = buy_url(prod)
    name = prod.get("attributes", {}).get("name", "?")
    if not url:
        sys.exit("! Produkt '%s' hat noch keine Buy-URL (schon veroeffentlicht?)." % name)

    print("Gefunden: %s" % name)
    if args.dry_run:
        print("[dry-run] BUY_URL waere:\n  %s" % url)
        return
    schreibe_config(url)
    print("\nNaechster Schritt: committen und pushen, dann ist der Button live:")
    print("  git add js/buch-config.js && git commit -m 'feat: Buy-URL gesetzt' && git push")


if __name__ == "__main__":
    main()
