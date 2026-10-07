#!/usr/bin/env python3
"""betreiber_push.py — sofortige Handy-Nachricht an den Betreiber über ntfy.sh (07.10.2026).

ANLASS (Betreiber 07.10. 16:15): «kannst du cj verbinden und bei bestellung sofort alles erledigen und mir den paylink
schicken». CJ ist verbunden, `cj_order_engine.py` legt jede bezahlte Shopify-Bestellung selbst bei CJ an — aber die
Meldung «liegt im CJ-Warenkorb, zu zahlen $X» stand nur im Log und in der stündlichen Ampel. Bezahlen kann nur der
Betreiber (CJ nimmt Guthaben erst ab USD 2'000 an, payBalance ist für diesen Shop tot — cj_zahlung_offen.py).

KANAL: ntfy.sh — gratis, ohne Konto; der Betreiber abonniert in der ntfy-App (iOS/Android) ein GEHEIMES Thema.
Das Thema steht NIE im Repo (öffentlich): Quelle der Reihe nach Env NTFY_TOPIC, /etc/luxe/secrets.env (NTFY_TOPIC=…),
/tmp/ntfy_topic. Kein Thema → kein Versand, Rückgabe False (Aufrufer laufen ungestört weiter).
Jede Meldung trägt einen Schlüssel; dropship/_betreiber_push.txt verhindert Doppel (z. B. «LX1023-angelegt»).

  python3 automation/betreiber_push.py --test            # schickt eine Probe-Nachricht
  python3 automation/betreiber_push.py --kanal           # zeigt, ob ein Thema gefunden wird (ohne es auszugeben)
Aus Python: from betreiber_push import senden; senden("LX1023-angelegt", "Titel", "Text", klick="https://…")
"""
import os, sys, time, urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_betreiber_push.txt")
CJ_BESTELLUNGEN = "https://www.cjdropshipping.com/my.html"   # CJ-Konsole (belegt); genaue Bestellseite erst, wenn der Betreiber sie schickt


def thema():
    t = os.environ.get("NTFY_TOPIC", "").strip()
    if t:
        return t
    for p in ("/etc/luxe/secrets.env",):
        try:
            for l in open(p):
                if l.startswith("NTFY_TOPIC="):
                    return l.split("=", 1)[1].strip().strip('"')
        except OSError:
            pass
    try:
        return open("/tmp/ntfy_topic").read().strip()
    except OSError:
        return ""


def schon(schluessel):
    try:
        return any(l.split("\t")[0] == schluessel for l in open(LEDGER))
    except OSError:
        return False


def senden(schluessel, titel, text, klick=None, prio="high", tags="moneybag"):
    """True = zugestellt (oder schon früher zugestellt); False = kein Kanal / Fehler."""
    if schluessel and schon(schluessel):
        return True
    t = thema()
    if not t:
        print("   (Push: kein ntfy-Thema eingerichtet — Meldung nur im Log)", flush=True)
        return False
    h = {"Title": titel.encode("utf-8").decode("latin-1", "ignore"), "Priority": prio, "Tags": tags}
    if klick:
        h["Click"] = klick
        h["Actions"] = f"view, Öffnen, {klick}".encode("utf-8").decode("latin-1", "ignore")
    for v in range(3):
        try:
            req = urllib.request.Request(f"https://ntfy.sh/{t}", data=text.encode("utf-8"), headers=h, method="POST")
            with urllib.request.urlopen(req, timeout=20) as r:
                if r.status == 200:
                    if schluessel:
                        with open(LEDGER, "a", encoding="utf-8") as f:
                            f.write(f"{schluessel}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\n")
                    return True
        except Exception as e:
            print(f"   (Push-Versuch {v + 1} gescheitert: {type(e).__name__})", flush=True)
            time.sleep(3 * (v + 1))
    return False


if __name__ == "__main__":
    if "--kanal" in sys.argv:
        print("ntfy-Thema gefunden" if thema() else "KEIN ntfy-Thema (NTFY_TOPIC / /etc/luxe/secrets.env / /tmp/ntfy_topic)")
    elif "--test" in sys.argv:
        ok = senden(None, "LuxeStyle: Testnachricht", "So sieht eine Bestell-Meldung aus. Tippen öffnet die CJ-Bestellungen.",
                    klick=CJ_BESTELLUNGEN, prio="default", tags="white_check_mark")
        print("zugestellt" if ok else "NICHT zugestellt")
    else:
        print(__doc__)
