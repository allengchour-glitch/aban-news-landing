#!/usr/bin/env python3
"""handy_bot.py — der LuxeStyle-Bot auf dem Handy des Betreibers (07.10.2026).

ANLASS (Betreiber 07.10. 18:09): «verbessere entwickle eine bot für automation». Die Automatik meldet viel, aber nur in
Logs, Keepalive-Zeilen und Chat-Antworten. Der Betreiber erfährt den Stand nur, wenn er eine Session fragt. Seit heute gibt
es einen Push-Kanal (betreiber_push.py, ntfy) für Bestellungen. Dieser Bot macht daraus einen ZWEIWEG-Kanal:

  * BEFEHLE: Der Betreiber schreibt in der ntfy-App auf das Thema «<sein Thema>-befehl» (z. B. «status»). Der Aufseher ruft
    `handy_bot.py --abholen` in jeder Runde auf (~alle 2–5 min), der Bot antwortet auf dem gewohnten Thema.
  * TAGESBERICHT: einmal am Morgen (ab 06:00 UTC = 08:00 Zürich), Ledger-Schlüssel «tagesbericht-JJJJ-MM-TT».

NUR LESEN. Der Bot ändert nichts am Shop, postet nichts, bestellt nichts. Schaltbefehle (z. B. Social-Stopp) kommen erst,
wenn der Betreiber sie will — wer das Thema kennt, könnte sonst schalten. Keine Kundennamen in Antworten (ntfy.sh ist ein
öffentlicher Dienst; das Thema ist das einzige Geheimnis). Thema nie im Repo (Quelle: betreiber_push.thema()).

Befehle (Gross/Klein egal, erstes Wort zählt):
  status | stand     Bestellungen, CJ-Zahlung, Betreiber-Punkte, Motoren, CJ-Bestand, Social heute
  bestellungen       offene Bestellungen (bestell_ampel.py)
  umsatz             Bestellungen + Umsatz heute / gestern / 7 Tage (Shopify)
  social             Posts geplant/übersprungen heute und gestern (Autopilot-Log)
  hilfe              diese Liste

  python3 automation/handy_bot.py --abholen        # Befehle holen und beantworten (Aufseher)
  python3 automation/handy_bot.py --tagesbericht   # einmal je Tag (Ledger), --jetzt erzwingt
  python3 automation/handy_bot.py --zeigen status  # Antwort nur ausgeben, nichts senden
  python3 automation/handy_bot.py --selbsttest
"""
import datetime, json, os, re, subprocess, sys, time, urllib.request

HIER = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HIER)
sys.path.insert(0, HIER)
import betreiber_push as bp  # noqa: E402

GESEHEN = os.path.join(REPO, "dropship", "_handy_bot.txt")     # verarbeitete ntfy-Nachrichten-IDs (überlebt Neustarts)
SOCIAL_LOG = "/tmp/social_autopilot.log"
TAG_STUNDE_UTC = int(os.environ.get("BOT_TAGESBERICHT_UTC", "6"))


def _lauf(skript, timeout=120):
    try:
        r = subprocess.run([sys.executable, os.path.join(HIER, skript)], capture_output=True, text=True, timeout=timeout)
        return (r.stdout or "").strip()
    except Exception as e:
        return f"{skript}: unklar ({type(e).__name__})"


def cj_bestand():
    try:
        return sum(1 for _ in open(os.path.join(REPO, "dropship", "cj_niche_done.txt")))
    except OSError:
        return None


def social_zaehlen(log=SOCIAL_LOG):
    """{datum: {geplant, uebersprungen}} aus dem Autopilot-Log (Datum aus den «=== JJJJ-MM-TT»-Kopfzeilen)."""
    tage, tag = {}, None
    try:
        zeilen = open(log, encoding="utf-8", errors="replace").read().splitlines()
    except OSError:
        return tage
    for z in zeilen:
        m = re.match(r"=== (\d{4}-\d{2}-\d{2})", z)
        if m:
            tag = m.group(1); continue
        if not tag:
            continue
        t = tage.setdefault(tag, {"geplant": 0, "uebersprungen": 0})
        if re.search(r"(geplant \d+|veroeffentlicht|veröffentlicht)", z) and "⛔" not in z:
            t["geplant"] += 1
        elif "⛔ Kein Post" in z:
            t["uebersprungen"] += 1
    return tage


def social_text():
    s = social_zaehlen()
    heute = datetime.datetime.utcnow().date()
    teile = []
    for d, n in ((heute, "heute"), (heute - datetime.timedelta(days=1), "gestern")):
        v = s.get(d.isoformat())
        teile.append(f"{n}: {v['geplant']} Planungen (IG/FB/Story je einzeln), {v['uebersprungen']} übersprungen" if v else f"{n}: keine Daten")
    return "SOCIAL " + " · ".join(teile)


def umsatz_text():
    try:
        from kaufwille_zeile import gql
    except Exception as e:
        return f"UMSATZ: unklar ({type(e).__name__})"
    heute = datetime.datetime.utcnow().date()
    ab = (heute - datetime.timedelta(days=7)).isoformat()
    try:
        r = gql('query($q:String){orders(first:100,query:$q,sortKey:CREATED_AT,reverse:true){nodes{name createdAt '
                'displayFinancialStatus test totalPriceSet{shopMoney{amount}}}}}', {"q": f"created_at:>={ab}"})
    except Exception as e:
        return f"UMSATZ: unklar (Shopify: {str(e)[:60]})"
    bez = {"PAID", "PARTIALLY_PAID", "PARTIALLY_REFUNDED"}
    summe = {"heute": [0, 0.0], "gestern": [0, 0.0], "7 Tage": [0, 0.0]}
    for o in (r.get("orders") or {}).get("nodes") or []:
        if o.get("test") or o.get("displayFinancialStatus") not in bez:
            continue
        d = o["createdAt"][:10]; chf = float(o["totalPriceSet"]["shopMoney"]["amount"])
        for k, gilt in (("heute", d == heute.isoformat()), ("gestern", d == (heute - datetime.timedelta(days=1)).isoformat()),
                        ("7 Tage", True)):
            if gilt:
                summe[k][0] += 1; summe[k][1] += chf
    return "UMSATZ (bezahlt) " + " · ".join(f"{k}: {n} / CHF {c:.2f}" for k, (n, c) in summe.items())


def antwort(befehl):
    b = (befehl or "").strip().lower().split()
    w = b[0] if b else "hilfe"
    if w in ("status", "stand"):
        zeilen = [_lauf("bestell_ampel.py"), _lauf("cj_zahlung_offen.py"), _lauf("betreiber_ampel.py"), _lauf("motor_ampel.py")]
        n = cj_bestand()
        zeilen.append(f"CJ-BESTAND: {n:,} importiert".replace(",", "'") if n else "CJ-BESTAND: unklar")
        zeilen.append(social_text())
        return "\n".join(z for z in zeilen if z)
    if w in ("bestellungen", "bestellung", "orders"):
        return _lauf("bestell_ampel.py")
    if w in ("umsatz", "verkauf", "verkäufe"):
        return umsatz_text()
    if w in ("social", "posts"):
        return social_text()
    return ("Befehle: status · bestellungen · umsatz · social · hilfe\n"
            "Ich lese nur und ändere nichts. Bestellungen melde ich dir sofort von selbst.")


def _gesehen():
    try:
        return {l.split("\t")[0] for l in open(GESEHEN)}
    except OSError:
        return set()


def abholen(senden=True):
    t = bp.thema()
    if not t:
        print("BOT: kein ntfy-Thema — nichts zu tun"); return 0
    gesehen = _gesehen()
    url = f"https://ntfy.sh/{t}-befehl/json?poll=1&since=2h"
    try:
        roh = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "luxestyle-bot"}), timeout=30).read()
    except Exception as e:
        print(f"BOT: Abholen gescheitert ({type(e).__name__})"); return 1
    neu = 0
    for zeile in roh.decode("utf-8", "replace").splitlines():
        try:
            m = json.loads(zeile)
        except ValueError:
            continue
        if m.get("event") != "message" or m.get("id") in gesehen:
            continue
        text = antwort(m.get("message", ""))
        ok = bp.senden(None, f"LuxeStyle-Bot: {(m.get('message') or '').strip()[:30]}", text, prio="default", tags="robot") if senden else True
        if not senden:
            print(text)
        if ok:
            with open(GESEHEN, "a", encoding="utf-8") as f:
                f.write(f"{m['id']}\t{time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())}\t{(m.get('message') or '')[:40]!r}\n")
            neu += 1
    print(f"BOT: {neu} Befehl(e) beantwortet")
    return 0


def tagesbericht(jetzt=False):
    h = datetime.datetime.utcnow()
    schluessel = f"tagesbericht-{h.date().isoformat()}"
    if not jetzt and (h.hour < TAG_STUNDE_UTC or bp.schon(schluessel)):
        return 0
    text = "\n".join([umsatz_text(), _lauf("bestell_ampel.py"), _lauf("cj_zahlung_offen.py"), social_text(),
                      _lauf("betreiber_ampel.py") or "BETREIBER: nichts offen",
                      "Antworte mit «status», «umsatz» oder «hilfe» auf dem Befehls-Thema."])
    ok = bp.senden(None if jetzt else schluessel, "LuxeStyle: Tagesbericht", text, prio="default", tags="sunrise")
    print("TAGESBERICHT:", "zugestellt" if ok else "nicht zugestellt")
    return 0


def selbsttest():
    import tempfile
    log = tempfile.NamedTemporaryFile("w", delete=False, suffix=".log")
    log.write("=== 2026-10-06 10:00:00 Start\ninstagram: ueber Metricool geplant 1\nfacebook: ueber Metricool geplant 2\n"
              "⛔ Kein Post — Gemini-Jury: x\n=== 2026-10-07 01:00:00 Start\n   ✅ veröffentlicht auf IG+FB\n"
              "⛔ Kein Post — Preis veraltet\n⛔ Kein Post — y\n")
    log.close()
    s = social_zaehlen(log.name); os.remove(log.name)
    t = [
        (s.get("2026-10-06") == {"geplant": 2, "uebersprungen": 1}, f"Social 06.10. gezählt {s.get('2026-10-06')}"),
        (s.get("2026-10-07") == {"geplant": 1, "uebersprungen": 2}, f"Social 07.10. gezählt {s.get('2026-10-07')}"),
        ("Befehle:" in antwort("quatsch"), "unbekannter Befehl → Hilfe"),
        ("Befehle:" in antwort(""), "leere Nachricht → Hilfe"),
        (antwort("SOCIAL").startswith("SOCIAL"), "Gross/Klein egal"),
    ]
    for ok, n in t:
        print(("✓ " if ok else "✗ ") + n)
    print(f"{sum(o for o, _ in t)}/{len(t)}")
    return 0 if all(o for o, _ in t) else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--selbsttest" in a:
        sys.exit(selbsttest())
    if "--zeigen" in a:
        i = a.index("--zeigen"); print(antwort(" ".join(a[i + 1:]) or "hilfe")); sys.exit(0)
    if "--tagesbericht" in a:
        sys.exit(tagesbericht(jetzt="--jetzt" in a))
    if "--abholen" in a:
        sys.exit(abholen())
    print(__doc__)
