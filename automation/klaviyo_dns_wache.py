#!/usr/bin/env python3
"""klaviyo_dns_wache.py — sind die vier genehmigten Klaviyo-DNS-Einträge für luxestyle.ch öffentlich sichtbar? (19.10.2026). Nur lesend, KEIN Schlüssel.

ANLASS: Die Klaviyo-Sendedomain send.luxestyle.ch steht seit 17.10. auf «pending» (GEMESSEN 19.10., get_sending_domains: 5 Einträge verified=false; öffentlich NXDOMAIN).
Der Betreiber hat die vier Einträge genehmigt (an Codex UND an uns: dropship/KONNEKTOREN-STAND-2026-10-19.md KL-2, Codex-Übergabe #2689); es fehlt der Schreibzugang —
nur der Betreiber kann sie bei Namecheap (Advanced DNS) setzen. Die Wache sagt, wann er es getan hat, damit die Sitzung den Verifizierungs-Job anstossen kann.

WIE: DNS-over-HTTPS bei Cloudflare (curl, läuft über den Proxy). Geprüft werden genau diese Namen/Werte (QUELLE: Klaviyo-Oberfläche laut Codex-Übergabe und KL-2; stimmt die Oberfläche
einmal anders, gilt die Oberfläche — dann die Tabelle HIER anpassen):
    CNAME send.luxestyle.ch              → 3848818023763335087.klaviyodns.com
    CNAME mtd1._domainkey.luxestyle.ch   → mtd1._domainkey.3848818023763335087.klaviyodns.com
    CNAME mtd2._domainkey.luxestyle.ch   → mtd2._domainkey.3848818023763335087.klaviyodns.com
    TXT   luxestyle.ch                   enthält klaviyo-site-verification=XWqMAD
Fehler (kein Netz, kaputte Antwort) = «unklar», nie «0/4». SPF/DMARC/Zoho werden NICHT angefasst und hier nicht geprüft.

Zeile für die Keepalive-Meldung:  KLAVIYO-DNS: n/4 sichtbar …   ⚠️ erst ab 24.10. (7 Tage pending), solange < 4/4.
    python3 automation/klaviyo_dns_wache.py
    python3 automation/klaviyo_dns_wache.py --selbsttest
"""
import datetime as dt
import json
import subprocess
import sys

DOMAIN = "luxestyle.ch"
ZIEL = "3848818023763335087.klaviyodns.com"
EINTRAEGE = [
    ("CNAME", f"send.{DOMAIN}", ZIEL),
    ("CNAME", f"mtd1._domainkey.{DOMAIN}", f"mtd1._domainkey.{ZIEL}"),
    ("CNAME", f"mtd2._domainkey.{DOMAIN}", f"mtd2._domainkey.{ZIEL}"),
    ("TXT", DOMAIN, "klaviyo-site-verification=XWqMAD"),
]
WARNT_AB = dt.date(2026, 10, 24)      # pending seit 17.10. + 7 Tage


def doh(name, typ):
    """→ (Status|None, [Antworten] , Fehler|None). Status 0 = ok, 3 = NXDOMAIN."""
    url = f"https://cloudflare-dns.com/dns-query?name={name}&type={typ}"
    try:
        r = subprocess.run(["curl", "-s", "--max-time", "15", "-H", "accept: application/dns-json", url], capture_output=True, text=True, timeout=25)
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, [], type(e).__name__
    if r.returncode != 0 or not r.stdout.strip():
        return None, [], f"curl Exit {r.returncode}"
    try:
        d = json.loads(r.stdout)
    except ValueError:
        return None, [], "Antwort kein JSON"
    if not isinstance(d, dict) or "Status" not in d:
        return None, [], "Antwort ohne Status"
    antw = [str(a.get("data", "")) for a in d.get("Answer") or [] if isinstance(a, dict)]
    return d["Status"], antw, None


def passt(typ, soll, antworten):
    norm = [a.strip().strip('"').rstrip(".").lower() for a in antworten]
    if typ == "TXT":
        return any(soll.lower() in a for a in norm)
    return soll.lower().rstrip(".") in norm


def messen(abfrage=doh):
    """→ (sichtbar [bool], fehler [str])."""
    sichtbar, fehler = [], []
    for typ, name, soll in EINTRAEGE:
        status, antw, err = abfrage(name, typ)
        if err:
            fehler.append(f"{name}: {err}")
            sichtbar.append(None)
        else:
            sichtbar.append(passt(typ, soll, antw))
    return sichtbar, fehler


def zeile(sichtbar, fehler, heute=None):
    heute = heute or dt.date.today()
    if fehler:
        return f"KLAVIYO-DNS: unklar ({'; '.join(fehler)[:120]})"
    n = sum(1 for s in sichtbar if s)
    fehlt = [f"{typ} {name.replace('.' + DOMAIN, '') if name != DOMAIN else '@'}" for (typ, name, _), s in zip(EINTRAEGE, sichtbar) if not s]
    if n == len(EINTRAEGE):
        return "KLAVIYO-DNS: 4/4 sichtbar → Sitzung: Klaviyo get_sending_domain 3438728 lesen, bei verified=false create_sending_domain_verification_job (nach Betreiber-OK)"
    kopf = "⚠️ KLAVIYO-DNS" if heute >= WARNT_AB else "KLAVIYO-DNS"
    return f"{kopf}: {n}/4 sichtbar (fehlt: {', '.join(fehlt)}) — Betreiber-Klick bei Namecheap, dropship/KONNEKTOREN-STAND-2026-10-19.md KL-2"


def selbsttest():
    f = []
    if not passt("CNAME", ZIEL, [ZIEL + "."]) or passt("CNAME", ZIEL, ["anderes.example."]):
        f.append("passt CNAME")
    if not passt("TXT", "klaviyo-site-verification=XWqMAD", ['"v=spf1 include:zohomail.eu ~all"', '"klaviyo-site-verification=XWqMAD"']) or passt("TXT", "klaviyo-site-verification=XWqMAD", ['"v=spf1 ~all"']):
        f.append("passt TXT")
    def alle_da(name, typ):
        for t, n, s in EINTRAEGE:
            if n == name and t == typ:
                return 0, ['"' + s + '"'] if typ == "TXT" else [s + "."], None
        return 3, [], None
    def keiner(name, typ):
        return 3, [], None
    def kaputt(name, typ):
        return None, [], "curl Exit 28"
    s, e = messen(alle_da)
    if s != [True] * 4 or e or not zeile(s, e).startswith("KLAVIYO-DNS: 4/4"):
        f.append(f"alle da: {s} {e}")
    s, e = messen(keiner)
    z_vor = zeile(s, e, dt.date(2026, 10, 20)); z_nach = zeile(s, e, dt.date(2026, 10, 24))
    if s != [False] * 4 or z_vor.startswith("⚠️") or not z_nach.startswith("⚠️") or "0/4" not in z_nach:
        f.append(f"keiner da: {s} | {z_vor} | {z_nach}")
    s, e = messen(kaputt)
    z = zeile(s, e)
    if "unklar" not in z or "0/4" in z:
        f.append(f"Fehler muss 'unklar' sein, nie 0/4: {z}")
    def teils(name, typ):                       # nur der send-CNAME ist da
        return (0, [ZIEL + "."], None) if name == f"send.{DOMAIN}" else (3, [], None)
    s, e = messen(teils)
    z = zeile(s, e, dt.date(2026, 10, 25))
    if s != [True, False, False, False] or "1/4" not in z or "fehlt: CNAME mtd1._domainkey, CNAME mtd2._domainkey, TXT @" not in z:
        f.append(f"teilweise: {s} | {z}")
    print("SELBSTTEST klaviyo_dns_wache:", "OK" if not f else "FEHLER " + " | ".join(f))
    return 0 if not f else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        s, e = messen()
        print(zeile(s, e))
        sys.exit(0)
    if a == ["--selbsttest"]:
        sys.exit(selbsttest())
    print(f"unbekannter Schalter {a!r} — Abbruch (kein Lauf). Erlaubt: (ohne) · --selbsttest")
    sys.exit(2)
