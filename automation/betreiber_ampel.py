#!/usr/bin/env python3
"""EINE Zeile in jedem Keepalive: was gerade WIRKLICH den Betreiber braucht.

Der Betreiber am 04.09.2026: «mach das alles geht ohne mich». Das meiste geht — was nicht
geht, sind Klicks in fremden Konsolen und Geld. Bisher stand das in
`dropship/COWORK-AUFTRAEGE.md`, also in einem Dokument, das nur liest, wer danach fragt.

⚠️ Und ein Dokument veraltet: Ein Punkt, den er längst erledigt hat, steht dort weiter und
macht die Liste unglaubwürdig — dieselbe Klasse wie «ein Ledger sagt, was einmal geschrieben
wurde». Deshalb wird alles MESSBARE hier live nachgemessen und verschwindet von selbst,
sobald es behoben ist. Nur der unmessbare Rest wird gezählt, nicht behauptet.

Gibt genau eine Zeile aus (oder nichts, wenn nichts blockiert). MELDET NUR.
"""
import subprocess, json, os, re, subprocess, sys, urllib.request, datetime
import os as _os_takt, sys as _sys_takt
_sys_takt.path.insert(0, _os_takt.path.join(_os_takt.environ.get('REPO', '/home/user/aban-news-landing'), 'automation'))
from cj_takt import takt  # 21.09.: reservierte Startzeiten gegen CJs 1/s-Drossel

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# 23.09.2026: Dieselbe Ampel laeuft auch auf dem Hetzner-Server (luxe-waechter, /opt/…). Dort gibt es
# weder den Meta-Token noch den Fortura-Zugang in /tmp — die Zeilen «IG: unklar (FileNotFoundError)» und
# «FORTURA-ZUGANG WEG» meldeten alle 10 Minuten einen Cloud-Zustand, den es auf dem Server nie gab.
# 23.09. 22:15: der Server-Aufseher startet die Ampel aus der /tmp-Spiegelkopie (engine_keepalive 3b) — dort ist
# REPO «/» und die Cloud-Zeilen (AZURE-STIMME WEG, FORTURA-ZUGANG WEG) standen doch wieder im Journal. Deshalb
# zaehlen auch die systemd-Umgebung (REPO=/opt/…) und das Server-Verzeichnis selbst.
AUF_SERVER = (REPO.startswith("/opt/") or os.environ.get("REPO", "").startswith("/opt/")
              or os.path.isdir("/opt/luxe-waechter"))
SHOP = "au3j0y-hq.myshopify.com"
TOKPFAD = "/tmp/cj_shop_token.txt"
QUEUE_CDN = ("https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
             "tiktok_queue.json")


def gql(q, v=None):
    tok = open(TOKPFAD).read().strip()
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2026-01/graphql.json",
        data=json.dumps({"query": q, "variables": v or {}}).encode(),
        headers={"X-Shopify-Access-Token": tok, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read())


def datei_speicher_voll():
    """Scheiterte in den letzten 24 h ein Upload am Speicherdeckel? Selbstklärend."""
    try:
        # ⚠️ NICHT die neuesten Dateien lesen: der Grind legt ~2'000 Produktbilder/Tag an,
        # ein Fehlschlag von heute Morgen ist mittags schon 2'000 Eintraege zurueck.
        # `query:"status:FAILED"` trifft ihn direkt (gegengeprueft: liefert genau die
        # gescheiterten; `file_status:` wird still ignoriert und liefert PROCESSING).
        d = gql('{files(first:10,query:"status:FAILED",sortKey:CREATED_AT,reverse:true)'
                '{nodes{createdAt fileErrors{code}}}}')
        knoten = ((d.get("data") or {}).get("files") or {}).get("nodes") or []
    except Exception:
        return None                      # kein Befund aus einer kaputten Abfrage
    grenze = (datetime.datetime.now(datetime.timezone.utc)
              - datetime.timedelta(hours=24))
    for k in knoten:
        codes = [f.get("code") for f in (k.get("fileErrors") or [])]
        if "FILE_STORAGE_LIMIT_EXCEEDED" not in codes:
            continue
        try:
            wann = datetime.datetime.fromisoformat(k["createdAt"].replace("Z", "+00:00"))
        except Exception:
            continue
        if wann > grenze:
            # 21.09.2026 Betreiber-Entscheid: «grow plan, in einer monat machen, brauche zuerst
            # kunde» → dropship/_dateispeicher_entscheid.txt (art, datum, zitat). Bis zum Datum
            # ist der volle Speicher ein GEWOLLTER Zustand: die Zeile bleibt (Messung), wird aber
            # zur Information statt zum Ruf. Nach dem Datum ruft sie wieder — Quittung mit Ablauf,
            # nicht Quittung für immer (Klasse der 95 Klingen: ein Urteil ohne Vollstreckung).
            try:
                z = open("dropship/_dateispeicher_entscheid.txt").read().split("\t")
                bis = datetime.date.fromisoformat(z[1].strip())
                if datetime.date.today() <= bis:
                    return (f"Datei-Speicher voll — Entscheid Betreiber 21.09.: {z[0].strip()}-Plan bis "
                            f"{bis:%d.%m.}, bis dahin scheitern neue Bild-Uploads (gewollt)")
            except Exception:
                pass
            return "Shopify-Datei-Speicher voll (Einstellungen → Dateien)"
    return None


def video_deckel():
    """Shopify deckelt Videos je PLAN — gemessen 07.09.: 250, und der Deckel ist voll.

    ⚠️ NICHT die Videos zaehlen: `files(media_type:VIDEO)` meldete 249, Shopify lehnte
    trotzdem ab. Gemessen wird deshalb der ZWECK — ob ein Upload-Ziel entsteht. Und ein
    zurueckgegebenes Ziel allein beweist nichts: bei erreichtem Deckel kommt es MIT
    `url: null`, die Absage steht nur in `userErrors`.
    """
    try:
        d = gql('mutation{stagedUploadsCreate(input:[{resource:VIDEO,filename:"ampel.mp4",'
                'mimeType:"video/mp4",httpMethod:POST,fileSize:"1048576"}])'
                '{stagedTargets{url} userErrors{message}}}')
        r = ((d.get("data") or {}).get("stagedUploadsCreate") or {})
    except Exception:
        return None                      # kein Befund aus einer kaputten Abfrage
    fehler = " ".join(e.get("message", "") for e in (r.get("userErrors") or []))
    ziel = (r.get("stagedTargets") or [{}])[0].get("url")
    if re.search(r"250 videos|does not permit", fehler, re.I) or not ziel:
        return "Shopify-Video-Deckel voll (250) — 126 Plaetze ohne Kundennutzen, s. dropship/VIDEO-DECKEL.md"
    return None


def tiktok_queue_alt():
    """23.09.2026: TikTok laeuft seit dem 22.09. ueber Metricool (Ledger automation/reels_seed.csv,
    Status posted-tiktok, post_url `metricool:<id> tiktok:<url>` nach der Nachmessung). Die alte
    Messung am PC-Poster (dropship/tiktok_queue.json, Feld `stand`) meldete «23 Tage alt» fuer einen
    Weg, den niemand mehr geht — ein Wächter fuer einen toten Weg ist Laerm. Jetzt drei Fragen an den
    Ledger: Fehler? · geplant, aber seit >2 h nicht bestaetigt? · kein bestaetigter Post seit >2 Tagen?
    """
    import csv
    try:
        rows = list(csv.DictReader(open(os.path.join(ROOT, "automation", "reels_seed.csv"), encoding="utf-8")))
    except Exception:
        return None
    fehler = [r for r in rows if (r.get("status") or "") == "tiktok-fehler"]
    if fehler:
        return f"TikTok: {len(fehler)} Post-Fehler in reels_seed.csv ({fehler[0].get('post_url','')[:60]})"
    jetzt = datetime.datetime.now(datetime.timezone.utc)
    letzte = None
    ungeprueft = 0
    for r in rows:
        if (r.get("status") or "") != "posted-tiktok":
            continue
        try:
            t = datetime.datetime.fromisoformat((r.get("posted_at") or "").replace("Z", "+00:00"))
        except Exception:
            continue
        if "tiktok:" in (r.get("post_url") or ""):
            letzte = t if letzte is None or t > letzte else letzte
        elif (jetzt - t).total_seconds() > 2 * 3600:
            ungeprueft += 1
    if ungeprueft:
        return f"TikTok: {ungeprueft} geplante Posts seit >2 h ohne Bestaetigung (PRUEFEN=1 metricool_tiktok_post.mjs)"
    if letzte is None:
        return "TikTok: noch kein bestaetigter Metricool-Post"
    tage = (jetzt - letzte).total_seconds() / 86400
    return f"TikTok: letzter bestaetigter Post vor {tage:.1f} T" if tage >= 2 else None


def ki_textstufe():
    """14.09.2026: Die Importer trugen seit dem 05.09. einen UNGUELTIGEN Groq-Schluessel (55 statt
    56 Zeichen, Task #41) — Groq 401, DeepSeek 402, und ALLE ~2'050 Produkttexte seither schrieb
    das bezahlte Gemini-Fallback, ohne dass es irgendwo stand (der Runner meldet nur «✅»).
    Der Betreiber will alles kostenlos; die Nachbesserungs-Schicht in groq_text.mjs war damit
    ebenfalls tot. Gemessen wird der Schluessel am GRATIS-Endpunkt /v1/models — er beweist nur
    die Gueltigkeit (Lehre 08.09.), und genau die ist hier die Frage. Netzfehler ist kein Befund."""
    key = ""
    for pfad in ("/tmp/dienste.env", "/tmp/groq_key"):
        try:
            for z in open(pfad, encoding="utf-8", errors="ignore"):
                m = re.match(r"\s*(?:export\s+)?GROQ_API_KEY=([\"']?)(.*?)\1\s*$", z)
                if m and m.group(2).strip():
                    key = m.group(2).strip()
                    break
        except OSError:
            continue
        if key:
            break
    if not key:
        return "Groq-Schlüssel fehlt → Produkttexte laufen über Gemini (bezahlt)"
    # 14.09.2026 16:40: Groq/Cloudflare sperrt den Standard-User-Agent «Python-urllib» mit 403 — der GUELTIGE
    # 56-Zeichen-Schluessel bekam mit curl 200, mit urllib 403. Ohne eigenen User-Agent misst diese Zeile den
    # Absender, nicht den Schluessel (Fehlalarm «ungueltig» nach dem Tausch).
    req = urllib.request.Request("https://api.groq.com/openai/v1/models",
                                 headers={"Authorization": "Bearer " + key, "User-Agent": "luxestyle-ampel/1.0 (curl-kompatibel)"})
    try:
        urllib.request.urlopen(req, timeout=20).read()
        return None
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            return f"Groq-Schlüssel ungültig ({len(key)} Zeichen, HTTP {e.code}) → Produkttexte laufen über Gemini (bezahlt)"
        return None
    except Exception:
        return None


def cj_dispute_stand():
    """Fragt CJ selbst: gibt es fuer die zurueckgesandte Messer-Bestellung eine Reklamation?

    Rueckgabe: (offen, hinweis)
      offen=True   → keine Reklamation vorhanden (gemessen)
      offen=False  → mindestens eine Reklamation liegt bei CJ (gemessen)
      offen=None   → nicht messbar; hinweis nennt den Grund

    ⚠️ Bewusst KEIN `return None` bei einem Messfehler: hier geht es um Geld, das noch
    aussteht. Eine Wache, die bei kaputtem Token schweigt, sieht aus wie «erledigt».
    Deshalb bleibt die Zeile stehen und sagt dazu, dass sie den Stand nicht kennt.
    Timeout kurz (15 s, EIN Versuch) — die Ampel laeuft stuendlich und darf nicht haengen.
    """
    try:
        tok = json.load(open("/tmp/cj_token.json")).get("accessToken")
    except Exception as e:
        return None, f"kein CJ-Token ({type(e).__name__})"
    if not tok:
        return None, "/tmp/cj_token.json ohne accessToken"
    url = ("https://developers.cjdropshipping.com/api2.0/v1/"
           "disputes/getDisputeList?pageNum=1&pageSize=20")
    req = urllib.request.Request(url, headers={"CJ-Access-Token": tok,
                                               "Content-Type": "application/json"})
    try:
        takt()
        with urllib.request.urlopen(req, timeout=15) as r:
            d = json.loads(r.read().decode())
    except Exception as e:
        return None, f"CJ antwortet nicht ({type(e).__name__})"
    if d.get("code") != 200:
        return None, f"CJ-Code {d.get('code')}: {str(d.get('message'))[:60]}"
    gesamt = ((d.get("data") or {}).get("total"))
    if gesamt is None:
        return None, "CJ-Antwort ohne Feld total"
    return (int(gesamt) == 0), f"{gesamt} Reklamation(en) bei CJ"


def cj_dispute_1017():
    """CJ-Rueckerstattung fuer die zurueckgesandte Messer-Bestellung (16.09.2026).

    ⚠️ Seit 21.09.2026 prueft diese Wache den ZUSTAND bei CJ, nicht mehr nur eine
    Quittungsdatei (gleiche Umstellung wie bei `liechtenstein_gesperrt`): sobald im
    CJ-Konto eine Reklamation liegt, verschwindet die Zeile von selbst. Eine Quittung
    hat die Schwaeche jeder Behauptung — sie kann gesetzt sein, ohne dass es stimmt,
    und sie kann fehlen, obwohl laengst gehandelt wurde. Die Datei bleibt als
    ausdruecklicher Schlussstrich des Betreibers erhalten.

    GEMESSEN 21.09.2026 07:1x UTC: Wallet `amount 0.0`, `getDisputeList` total 0 —
    die Reklamation ist noch NICHT eroeffnet.

    📭 Und der Mailweg ist seit heute endgueltig als tot belegt: Gmail hat die Nachricht
    vom 16.09. 21:26 UTC nach 72 Stunden Zustellversuchen am 19.09. 21:44 UTC hart
    abgewiesen — `support@cjdropshipping.com`, Status 4.4.1, vier Cloudflare-Adressen
    «timed out». Ein weiterer Brief ist also kein Ersatz fuer den Klick im Portal.
    """
    quittung = os.path.join(REPO, "dropship", "_cj_dispute_1017_ref.txt")
    if os.path.exists(quittung) and open(quittung, encoding="utf-8").read().strip():
        return None
    offen, hinweis = cj_dispute_stand()
    if offen is False:
        return None                      # bei CJ liegt eine Reklamation → Zeile faellt weg
    stand = "" if offen else f" ⚠️ Stand bei CJ nicht messbar: {hinweis}."
    return ("🔪 CJ-Rueckerstattung USD 25.54 — CJ hat am 18.09. 08:44 SCHRIFTLICH ZUGESAGT: "
            "Dispute im WEB-PORTAL oeffnen (cjdropshipping.com/article-details/172), danach "
            "zahlen sie 25.54 (Ware 18.24 + Fracht 7.30) auf die CJ-Wallet. Sie bestaetigen "
            "auch: der Rueckversand geschah wegen des verbotenen Artikels, es gibt KEINE "
            "Linie fuer Klingen in die CH. Der Grund fuer 9009 ist jetzt bekannt und "
            "endgueltig: die Bestellung kam ueber den SHOPIFY-KANAL, nicht ueber die Open "
            "API — CJ verbietet API-Disputes fuer nicht per API angelegte Auftraege, kein "
            "Parameter aendert das. 📭 Nachfassen per Mail geht NICHT: CJs Mailserver nimmt "
            "keine Verbindung an (harte Abweisung 19.09. 21:44 nach 72 h). Also: Formular im "
            "Portal, 2 Minuten. Text: COWORK-BEFEHL.md Punkt 0" + stand)


def bigbuy_ticket():
    """EUR 1'000.00 liegen seit dem 15.07. bei BigBuy. Das Geld ist real und faellig.

    ⚠️ Anders als die uebrigen Punkte kann dieser sich NICHT selbst live messen: seit dem
    Abo-Ende antwortet `/rest/user/purse.json` mit HTTP 401 (gemessen 16.09.). Deshalb haengt
    er an einer Quittung — sobald die Ticket-Referenz in der Datei steht, verschwindet die
    Zeile. Das erzwingt genau das Artefakt, das man spaeter braucht: eine Nummer, auf die man
    sich berufen kann.

    Warum ueberhaupt ein Ticket: fuenf Mails an customers@bigbuy.eu, zurueck kamen zwei
    WORTGLEICHE Auto-Antworten, die beide auf das Formular verweisen. Der genannte Kanal war
    nie benutzt. bigbuy.eu/en/contact gibt uns HTTP 403 (beide Ausgaenge) — es braucht einen
    echten Browser. Anleitung: dropship/COWORK-BEFEHL.md Punkt 1.
    """
    quittung = os.path.join(REPO, "dropship", "_bigbuy_ticket_ref.txt")
    if os.path.exists(quittung) and open(quittung, encoding="utf-8").read().strip():
        return None
    tage = (datetime.date.today() - datetime.date(2026, 7, 15)).days
    return (f"⭐ BigBuy EUR 1'000.00 seit {tage} Tagen nicht ausgezahlt — Ticket "
            f"bigbuy.eu/en/contact (Administration) oeffnen, Referenz nach "
            f"dropship/_bigbuy_ticket_ref.txt · Text: COWORK-BEFEHL.md Punkt 1")


def shopify_rechnung():
    """Unsere EIGENE Shopify-Rechnung ueber CHF 44.68 ist am 17.09. gescheitert.

    Das ist NICHT die Kasse: alle vier Kundenzahlungen seit dem 18.08. stehen auf SUCCESS
    mit errorCode None, und am 10.09. hat Shopify uns CHF 65.44 aufs Bankkonto ueberwiesen.
    Gescheitert ist die Abbuchung von UNSERER hinterlegten Karte (Ablaufdatum oder Deckung).

    Warum es eilt: Shopify versucht es am 19.09. erneut. Bleibt es dabei, friert Shopify den
    Shop irgendwann ein — dann ist luxestyle.ch offline, und kein Wächter dieser Ampel kann
    das verhindern.

    ⚠️ Auch dieser Punkt kann sich nicht selbst live messen: die Admin-API kennt die
    Organisations-Rechnungen des Shops nicht (nur die App-Abrechnungen). Deshalb haengt er
    wie der BigBuy-Punkt an einer Quittung. Eine Zeile in die Datei, sobald bezahlt ist.
    """
    quittung = os.path.join(REPO, "dropship", "_shopify_rechnung_ref.txt")
    if os.path.exists(quittung) and open(quittung, encoding="utf-8").read().strip():
        return None
    return ("💳 Shopify-Rechnung CHF 44.68 GESCHEITERT (17.09.) — Ursache gemessen: seit dem "
            "26.08. ist GAR KEINE gueltige Zahlungsmethode hinterlegt (Shopify-Mail fuer "
            "LuxeStyle, FitForge CH, TechHub CH). Erst Methode hinterlegen: "
            "/admin/settings/organization-billing/profile · DANN Rechnung 590825596 bezahlen: "
            "/admin/settings/billing/invoice/590825596 · 'Erneut versuchen' allein scheitert "
            "wieder. Naechster Automatik-Versuch 19.09., bei erneutem Fehlschlag droht die "
            "Sperre. Danach eine Zeile nach dropship/_shopify_rechnung_ref.txt")


def fortura_zugang():
    """Der Fortura-Zugang liegt NUR in /tmp und stirbt mit jedem Container-Neustart.

    Zweimal passiert (14.08. und 17.09.2026), beide Male unbemerkt: der Feed-Holer
    steigt zwar mit einer klaren Meldung aus, aber die stand nur in seinem eigenen Log.
    Beim zweiten Mal lag der Bild-Nachschub deshalb wochenlang still, ohne dass es
    jemand sah. **Ein Automat, der still scheitert, ist fuer den Betrieb dasselbe wie
    keiner** — also gehoert der Befund in die Ampel, nicht ins Log.

    Die Zeile verschwindet von selbst, sobald die Datei wieder da ist. Dauerhaft weg ist
    sie erst, wenn FORTURA_FTP_USER/PW als Umgebungsvariablen in den Claude-Einstellungen
    stehen — die ueberleben den Neustart, /tmp nicht.
    """
    if os.path.exists("/tmp/fortura_env.sh") or AUF_SERVER:   # Fortura laeuft nur in der Cloud-Sitzung
        return ""
    return ("🔑 FORTURA-ZUGANG WEG (/tmp/fortura_env.sh fehlt nach Container-Neustart) — "
            "ohne ihn laedt der Artikel-Feed nicht und der Bild-Nachschub steht still. "
            "Zugangsdaten neu in die Sitzung geben; Dauerloesung: FORTURA_FTP_USER und "
            "FORTURA_FTP_PW als Umgebungsvariablen in den Claude-Einstellungen "
            "(Kundennr. 544341, webtransfer.fortura.ch)")


def azure_stimme():
    """23.09.2026: Die Sprecherstimme der Reels laeuft NUR ueber Azure (Werbelizenz). Der Schluessel liegt in
    /tmp/azure_speech.env und stirbt wie der Fortura-Zugang mit einem Wipe — dann entstehen die Reels still
    ohne Stimme. Dauerloesung: AZURE_SPEECH_KEY + AZURE_SPEECH_REGION als Umgebungsvariablen."""
    if AUF_SERVER or os.environ.get("AZURE_SPEECH_KEY") or os.path.exists("/tmp/azure_speech.env"):
        return ""
    return ("🔑 AZURE-STIMME WEG (/tmp/azure_speech.env fehlt) — Reels entstehen ohne Stimme. Schluessel neu in die "
            "Sitzung geben; Dauerloesung: AZURE_SPEECH_KEY + AZURE_SPEECH_REGION=switzerlandnorth als Umgebungsvariablen")


def bot_puls():
    """Lebt der Hetzner-Browser-Agent? Er ist der EINZIGE mit einem echten Browser.

    GEMESSEN 18.09.2026: `grep -rln luxe_auftrag_runner automation/ tools/` gab **0
    Treffer**. Der Agent stand in keiner Wacht-Liste — er konnte sterben, ohne dass
    irgendwo eine Zeile anders wird. Und weil sein Runner bei leerer Warteschlange
    mit `exit 0` endete, hinterliess der haeufigste Lauf gar keine Spur: «acht
    Stunden keine Quittung» war nicht von «tot» zu unterscheiden.

    Steht er, ist ALLES unerreichbar, was einen angemeldeten Browser braucht —
    Shopify-Admin, Pinterest, die echte Storefront (unsere eigene IP sieht nur eine
    stundenalte Bot-Cache-Kopie). Die Regel und ihre sechs Gegenproben stehen in
    automation/bot_puls.py.
    """
    try:
        from bot_puls import puls_zeile, haengende_auftraege
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_puls.py")
        spec = importlib.util.spec_from_file_location("bot_puls", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        puls_zeile = modul.puls_zeile
        haengende_auftraege = modul.haengende_auftraege
    else:
        from bot_puls import haengende_auftraege

    # ⚠️ ZWEI FRAGEN, NICHT EINE (19.09.2026). Der Puls beweist, dass der Runner LEBT —
    # er beweist nicht, dass ein Auftrag ANKOMMT. Am 18.09. starb der Storefront-Lauf beim
    # ersten Seitenaufruf, die Quittung stand seit 10:09 auf «laufend», und gemeldet hat es
    # niemand, weil der Puls daneben lueckenlos alle fuenf Minuten «leer» schrieb. Gemessen
    # am 19.09.: ZWEI Quittungen hingen seit dem 17.09. — 37 Stunden unbemerkt.
    zeilen = [puls_zeile(), haengende_auftraege()]
    return " · ".join(z for z in zeilen if z)


def liechtenstein_gesperrt():
    """Liechtenstein: Zustand in BEIDE Richtungen — Markt UND sichtbare Zusagen.

    GEMESSEN 19.09.2026: Markt «Switzerland» (gid://shopify/Market/99383214465) fuehrt regions = [CH];
    cartCreate @inContext(country: LI) → 0 Versandoptionen, waehrend der CH-Kanarienvogel 2 bekommt
    (tools/testkorb_ausland.py). Versprochen war LI an 13 sichtbaren Stellen (7 Seiten, 6x Rechtstexte)
    und — erst am 22.09. gemessen — in 1'190 Produkt-Lieferbloecken (versand_jenachland schrieb die Phrase).

    ENTSCHIEDEN 22.09.2026 (Betreiber, Weg B): LI aus den Texten gestrichen — `automation/liechtenstein_raus.py`
    (taeglich im Aufseher, Phrasentabelle, Ruecklesen, Bericht dropship/LIECHTENSTEIN-RAUS.md).
    Die Wache fragt deshalb jetzt: steht LI im Markt? → still. Sonst: nennt eine VEROEFFENTLICHTE Seite
    oder ein Rechtstext LI wieder? → melden, mit Zahl. Nichts davon → still (Zusage und Kasse stimmen ueberein).
    Ein Fehler der Abfrage ist kein Befund (still, kein Fehlalarm).
    """
    try:
        d = gql('{ markets(first:10){ nodes{ id regions(first:50){ nodes{ '
                '... on MarketRegionCountry { code } } } } } }')
        knoten = ((d.get("data") or {}).get("markets") or {}).get("nodes") or []
    except Exception:
        return None
    laender = {r.get("code") for m in knoten for r in ((m.get("regions") or {}).get("nodes") or [])}
    if not laender or "LI" in laender:
        return None                      # nichts gemessen / eingeschaltet → Zeile faellt weg
    try:
        d = gql('{ shop { shopPolicies { body } } pages(first:250){ nodes{ isPublished body } } }')
        dd = d.get("data") or {}
        texte = [p.get("body") or "" for p in ((dd.get("shop") or {}).get("shopPolicies") or [])]
        texte += [p.get("body") or "" for p in ((dd.get("pages") or {}).get("nodes") or []) if p.get("isPublished")]
    except Exception:
        return None
    n = sum(t.count("Liechtenstein") for t in texte)
    if n == 0:
        return None
    return (f"🇱🇮 Liechtenstein steht wieder an {n} sichtbaren Stellen (Seiten/Rechtstexte) — aber der Markt "
            "ist nur CH, LI kann nicht bestellen. Betreiber-Entscheid 22.09. war Weg B (streichen): "
            "automation/liechtenstein_raus.py laeuft taeglich; wer die Phrase schreibt, steht im Journal 22.09.")


def klingen_pingpong():
    """Klingen-Ping-Pong (22.09.): eine Klinge mit Sperr-Tag darf NIE aktiv sein.
    Misst den Zustand, nicht die Absicht — 0 EXACT ist die einzige gute Antwort."""
    try:
        teile = []
        for t in ("handklinge-kein-ch-versand", "cj-nicht-versendbar-ch"):
            c = gql('{productsCount(query:"status:active tag:%s"){count precision}}' % t)["data"]["productsCount"]
            if c["count"]:
                teile.append(f"{c['count']} aktiv mit {t} ({c['precision']})")
        if teile:
            return "KLINGEN: " + ", ".join(teile) + " → python3 automation/test_klingen_tor.py --live; FIX=1 klinge_ch_wache"
        return None
    except Exception as e:
        return f"KLINGEN: unklar ({type(e).__name__})"


def verlust_kaufbar():
    """VERLUST: N kaufbar — Stand des letzten Laufs von automation/verlustbringer.py (dropship/_verlust_stand.json).

    Gegenpruefung 22.09.2026: zwei Verlustartikel (Kinder-Autositz 14.90 bei EK 25.07, Atemschutzmasken 16.90 bei
    EK 49.32) standen in 6 Kanaelen kaufbar; der Waechter vom 15.09. hatte keinen Starter, kein Log, das Ledger
    stand still. Diese Zeile liest den STAND (Datei), nicht den Shop — ein alter Stand ist selbst der Befund
    («Waechter laeuft nicht»). Kein Stand = «unklar», nie «0». Die Zahl ist Export-Stand (/tmp/kost28.jsonl der
    taeglichen Kosten-Kette), keine Live-Messung; «heben» (416) wartet auf die Preisschreiber-Absprache."""
    p = os.path.join(REPO, "dropship", "_verlust_stand.json")
    try:
        s = json.load(open(p, encoding="utf-8"))
        tage = (datetime.date.today() - datetime.date.fromisoformat(s["stand"])).days
    except Exception:
        return "VERLUST: unklar (kein Stand — automation/verlustbringer.py nie gelaufen?)"
    if s.get("wartet_auf_export"):
        return (f"VERLUST: wartet auf Export (juengster {s.get('export')} ist {s.get('export_alter_h')} h alt; "
                "automation/kosten_export_bauen.py baut /tmp/kost28.jsonl)")
    n = int(s.get("kaufbar") or 0)
    if tage >= 3:
        return f"VERLUST: Stand {tage} T alt ({n} kaufbar am {s['stand']}) — Waechter laeuft nicht"
    if n == 0:
        return None
    return (f"VERLUST: {n} kaufbar ({s.get('rest_raus', 0)} raus-Rest, {s.get('heben', 0)} nur Preis-Meldung, "
            f"Stand {s['stand']})")


def google_feedback():
    """GOOGLE: N Free-Listings-Blocker — Stand von automation/google_feedback_wache.py (Task #100, 23.09.2026).
    Google-Diagnosen stehen als product.feedback der App «Google & YouTube» an jedem Produkt; Meldungen mit
    [Shopping_ads] betreffen nur bezahlte Anzeigen und zaehlen nicht. Liest den STAND (Datei); kein Stand = «unklar»,
    alter Stand = Befund (Waechter laeuft nicht)."""
    p = os.path.join(REPO, "dropship", "_google_feedback_stand.json")
    try:
        s = json.load(open(p, encoding="utf-8"))
        alter_h = (datetime.datetime.utcnow() - datetime.datetime.strptime(s["stand"], "%Y-%m-%dT%H:%MZ")).total_seconds() / 3600
    except Exception:
        return "GOOGLE: unklar (kein Stand — automation/google_feedback_wache.py nie gelaufen?)"
    top = " · ".join(f"{k} {v}" for k, v in list(s.get("klassen", {}).items())[:3])
    alt = f" · ⚠️ Stand {alter_h/24:.1f} T alt" if alter_h > 48 else ""
    voll = "" if s.get("vollstaendig", True) else " · ⚠️ Scan unvollstaendig"
    shop = sum(v for k, v in (s.get("andere_apps") or {}).items() if k.startswith("[Shop]"))
    shopz = f" · Shop-Kanal: {shop} Meldungen" if shop else ""
    return f"GOOGLE: {s.get('blocker')} Free-Listings-Blocker ({top}){alt}{voll}{shopz}"


def kategorie_offen():
    """KATEGORIE: N aktive ohne Taxonomie-Kategorie — Stand von automation/kategorie_wache.py (23.09.2026, Task #101).
    Der Shop-Kanal zeigt nur Produkte MIT Kategorie (33'863 «nicht auffindbar» gemessen). Liest den STAND (Datei)."""
    p = os.path.join(REPO, "dropship", "_kategorie_stand.json")
    try:
        s = json.load(open(p, encoding="utf-8"))
    except Exception:
        return "KATEGORIE: unklar (kein Stand — automation/kategorie_wache.py nie gelaufen?)"
    unbek = s.get("unbekannte_typen") or {}
    u = f" · unbekannte Typen {sum(unbek.values())} ({', '.join(list(unbek)[:3])})" if unbek else ""
    n = s.get("ohne_kategorie_nachher", s.get("ohne_kategorie_vorher"))
    # 23.09.: der Stand wird erst am ENDE eines Laufs geschrieben; ein stundenlanger Nachlauf, den der
    # Container-Neustart toetet, hinterlaesst keinen — die Ampel meldete «heute gesetzt 0» bei 2'925 Ledger-Zeilen.
    # Das Ledger (je Zeile eine rueckgelesene Zuweisung) ist die Wahrheit ueber das Geschriebene.
    heute = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    try:
        led = [l for l in open(os.path.join(REPO, "dropship", "_kategorie_gesetzt.txt"), encoding="utf-8") if l.strip()]
        ledger_heute = sum(1 for l in led if l.rstrip("\n").split("\t")[-1].startswith(heute))
        # 23.09. 19:15: nur Zuweisungen NACH dem Stand abziehen (Zeitstempel, nicht Tag) — mit «>= Tag» zog die Zeile die
        # 45'114 Zuweisungen des ganzen Tages von 650 Restposten ab und meldete «~0», gemessen waren 650.
        n = max(0, int(s.get("ohne_kategorie_vorher", n) or 0) - sum(1 for l in led if l.rstrip("\n").split("\t")[-1] > s.get("stand", "")))
    except Exception:
        ledger_heute = s.get("gesetzt")
    return None if (n == 0 and not unbek) else f"KATEGORIE: ~{n} aktive ohne Kategorie (Stand {s.get('stand','?')[:16]}, Ledger heute {ledger_heute}){u}"


def kollektion_doppel_offen():
    """KOLL-DOPPEL: n offene Gruppen mit gleicher Regel und zwei Web-Adressen — Stand von automation/kollektion_doppel.py
    (23.09.2026, täglich scharf im Aufseher). Liest die Kopfzeile «OFFEN: n» des Berichts; 0 → keine Zeile."""
    try:
        sys.path.insert(0, os.path.join(REPO, "automation"))
        import kollektion_doppel
        n = kollektion_doppel.zaehlen()
    except Exception:
        return "KOLL-DOPPEL: unklar (automation/kollektion_doppel.py nicht lesbar)"
    if n < 0:
        return "KOLL-DOPPEL: unklar (kein Bericht — kollektion_doppel.py nie gelaufen?)"
    return None if n == 0 else f"KOLL-DOPPEL: {n} Kollektionen mit gleicher Regel offen (dropship/KOLLEKTION-DOPPEL.md)"


def metricool_kanaele():
    """23.09.2026 «metricool maximal nutzen»: je Metricool-Kanal, wie viel in 24 h geplant wurde, und Fehler.
    Ein Kanal mit 0 in 24 h ist ein Befund (Autopilot: TikTok/YouTube 12 h, Pinterest 6 h)."""
    try:
        import csv, datetime as dt
        grenze = dt.datetime.utcnow() - dt.timedelta(hours=24)
        def jung(t):
            try: return dt.datetime.fromisoformat(t.replace("Z", "")[:19]) >= grenze
            except Exception: return False
        n = {"tiktok": 0, "youtube": 0}; fehler = []
        rows = list(csv.DictReader(open(os.path.join(REPO, "automation/reels_seed.csv"), newline="")))
        for r in rows:
            st = (r.get("status") or "").strip()
            for k in n:
                if st == f"posted-{k}" and jung(r.get("posted_at") or ""): n[k] += 1
                if st == f"{k}-fehler": fehler.append(k)
        pins = 0
        lp = os.path.join(REPO, "dropship/_pinterest_pins.txt")
        if os.path.exists(lp):
            pins = sum(1 for z in open(lp) if z.strip() and jung(z.split("\t")[0]))
        teile = [f"TikTok {n['tiktok']}", f"YouTube {n['youtube']}", f"Pinterest {pins}"]
        warn = [k for k, v in (("TikTok", n["tiktok"]), ("YouTube", n["youtube"]), ("Pinterest", pins)) if v == 0]
        txt = "METRICOOL 24 h: " + " · ".join(teile)
        if fehler: txt += f" · ⚠️ {len(fehler)} Fehler ({', '.join(sorted(set(fehler)))})"
        if warn: txt += f" · still: {', '.join(warn)}"
        return txt
    except Exception as e:
        return f"METRICOOL: unklar ({type(e).__name__})"


def social_meta_live():
    """23.09.2026 (Social-Messung, Massnahme 7): die IG-Kadenz aus der PLATTFORM, nicht aus den Queues —
    eine Queue-Zeile «posted» kann ein IG-Fehler sein (02:08-Fall), ein Autostash kann eine Quittung
    verschlucken (Kristall 14:39). Dazu die Tage bis zum Ende des Meta-Datenzugangs (debug_token,
    05.10.2026 gemessen) und neue Autostashes (= zwei Schreiber kollidierten im Arbeitsbaum)."""
    teile = []
    if AUF_SERVER and not os.path.exists("/tmp/meta_page_token"):
        return ""   # Meta-Posting laeuft in der Cloud-Sitzung; die Server-Ampel misst es nicht (kein Token dort)
    try:
        tok = open("/tmp/meta_page_token").read().strip()
        ig = open("/tmp/meta_ig_id").read().strip()
        def graph(pfad):
            with urllib.request.urlopen(f"https://graph.facebook.com/v21.0/{pfad}&access_token={tok}", timeout=25) as r:
                return json.loads(r.read())
        media = graph(f"{ig}/media?fields=timestamp,media_type,media_product_type&limit=30").get("data") or []
        jetzt = datetime.datetime.now(datetime.timezone.utc)
        zeiten = [(datetime.datetime.strptime(m["timestamp"], "%Y-%m-%dT%H:%M:%S%z"), m) for m in media]
        tag = [m for t, m in zeiten if (jetzt - t).total_seconds() < 86400]
        reels = sum(1 for m in tag if m.get("media_product_type") == "REELS")
        karussell = sum(1 for m in tag if m.get("media_type") == "CAROUSEL_ALBUM")
        seit = min(((jetzt - t).total_seconds() / 3600 for t, _ in zeiten), default=999)
        txt = f"IG 24 h: {len(tag)} (Reels {reels} · Karussell {karussell}) · letzter vor {seit:.0f} h"
        if not tag and not os.path.exists(os.path.join(REPO, "dropship", "_SOCIAL_STOPP")):
            txt = "⚠️ " + txt
        teile.append(txt)
        d = graph(f"debug_token?input_token={tok}").get("data") or {}
        ende = d.get("data_access_expires_at") or 0
        if ende:
            tage = (ende - jetzt.timestamp()) / 86400
            if tage < 14:
                teile.append(f"{'⛔' if tage < 3 else '⚠️'} META-DATENZUGANG endet in {tage:.0f} Tagen "
                             f"({datetime.datetime.utcfromtimestamp(ende):%d.%m. %H:%M} UTC) — Betreiber erneuert im Graph-Explorer")
    except Exception as e:
        teile.append(f"IG: unklar ({type(e).__name__})")
    try:
        grenze = datetime.datetime.now().timestamp() - 86400
        zeilen = subprocess.run(["git", "-C", REPO, "stash", "list", "--format=%ct %gs"],
                                capture_output=True, text=True, timeout=20).stdout.split("\n")
        neu = sum(1 for z in zeilen if z.strip() and "autostash" in z and int(z.split()[0]) > grenze)
        if neu:
            teile.append(f"⚠️ {neu} neue Autostashes in 24 h (Quittungen pruefen: git stash show)")
    except Exception:
        pass
    return " · ".join(teile)


def grow_zaehler():
    """GROW (23.09.2026, Betreiber: «wen noch 3 verkäufe dann upgrade ich shopyfi grow 300 gb»): zaehlt bezahlte,
    nicht erstattete Bestellungen FREMDER Kunden seit dem Start in dropship/_grow_bedingung.txt. Eigenbestellungen des
    Betreibers (eine feste Kunden-ID) zaehlen nicht. Meldet immer den Stand; ab Ziel als Ruf an den Betreiber."""
    try:
        cfg = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(REPO, "dropship", "_grow_bedingung.txt"), encoding="utf-8") if "\t" in l)
        start, ziel, eigen = cfg["start"], int(cfg.get("ziel", "3")), cfg.get("eigene_kunden_id", "")
        d = gql('query($q:String!){ orders(first:50, query:$q){ nodes{ name displayFinancialStatus customer{ id } } } }',
                {"q": f"created_at:>='{start}'"})
        n = [o["name"] for o in (((d.get("data") or {}).get("orders") or {}).get("nodes") or [])
             if o.get("displayFinancialStatus") in ("PAID", "PARTIALLY_PAID") and ((o.get("customer") or {}).get("id") or "") != eigen]
    except Exception:
        return "GROW: Zähler unklar (Abfrage fehlgeschlagen)"
    if len(n) >= ziel:
        return f"⭐ GROW FÄLLIG: {len(n)} Verkäufe seit 23.09. ({', '.join(n)}) — Betreiber-Zusage: jetzt Shopify Grow (300 GB)"
    return f"GROW: {len(n)}/{ziel} Verkäufe seit 23.09. ({', '.join(n) or 'noch keiner'})"


def drafts_ohne_quittung():
    """DRAFT-OHNE-QUITTUNG: Produkte mit Tag `cj-nicht-mehr-verfuegbar`, die in
    dropship/_cj_verfuegbarkeit.txt KEINE Zeile haben.

    ANLASS 22./23.09.2026 (Auftrag drafts15): 15 Produkte trugen den Tag ohne Ledger-Zeile —
    der 68er-Rueckholer vom 21.09. waehlte aus dem Ledger und sah sie nie; 9 davon lebten
    bei CJ (productSku → 200) und standen zwei Tage unnoetig im Entwurf. Ein Tag ohne
    Quittung ist ein Draft, den kein Rueckholer je prueft. Gemessen: 341 mit Tag, nach der
    Nachpruefung 0 ohne Zeile (Bericht dropship/DRAFTS-OHNE-QUITTUNG-2026-09-22.md).
    Frische Drafts (< 15 min) zaehlen nicht: der Waechter schreibt die Zeile erst NACH den
    zwei Mutationen. Kosten: 2 Seiten a 250 IDs (~500 Punkte) je Lauf. Fehler = still.
    """
    pfad = os.path.join(REPO, "dropship", "_cj_verfuegbarkeit.txt")
    try:
        quittiert = {l.split("\t")[0] for l in open(pfad, encoding="utf-8")}
    except OSError:
        return None
    grenze = (datetime.datetime.utcnow() - datetime.timedelta(minutes=15)).strftime("%Y-%m-%dT%H:%M:%SZ")
    ohne, cur = [], None
    try:
        while True:
            d = gql('query($c:String){ products(first:250, after:$c, query:"tag:cj-nicht-mehr-verfuegbar"){ '
                    'pageInfo{hasNextPage endCursor} nodes{ id updatedAt } } }', {"c": cur})
            pg = ((d.get("data") or {}).get("products") or {})
            for n in pg.get("nodes") or []:
                if n["id"] not in quittiert and (n.get("updatedAt") or "") < grenze:
                    ohne.append(n["id"].rsplit("/", 1)[-1])
            if not (pg.get("pageInfo") or {}).get("hasNextPage"):
                break
            cur = pg["pageInfo"]["endCursor"]
    except Exception:
        return None
    if not ohne:
        return None
    return (f"DRAFT-OHNE-QUITTUNG: {len(ohne)} Produkte tragen cj-nicht-mehr-verfuegbar ohne Ledger-Zeile "
            f"(z. B. {', '.join(ohne[:3])}) — kein Rueckholer sieht sie; Nachpruefung wie in "
            "dropship/DRAFTS-OHNE-QUITTUNG-2026-09-22.md (drei CJ-Formen + Klingen-Tor), dann Ledger-Zeile")


def server_waechter():
    """Laufen die Waechter schon auf dem Hetzner-Server? Zustand statt Quittung: ein Commit des
    Autors «luxe-waechter», juenger als 2 h, belegt es (der Server-Aufseher committet seine Ledger
    selbst). Fehlt er, bleibt der Ruf — COWORK Punkt 7 (21.09.2026, «schneller automation»)."""
    try:
        out = subprocess.run(["git", "-C", REPO, "log", "--since=2 hours ago", "--author=luxe-waechter",
                              "-1", "--format=%cI"], capture_output=True, text=True, timeout=20).stdout.strip()
    except Exception:
        return None                      # nicht messbar → kein erfundener Befund
    if out:
        return None                      # Server pusht → Zeile verschwindet von selbst
    return ("🖥️ Waechter laufen nur in Session-Arbeitszeit — Setup auf dem Hetzner-Server "
            "(5 Min, server/luxe-waechter-setup.sh, COWORK Punkt 7)")


def judgeme_verdacht():
    """Unechte Bewertungen bei Judge.me (Hausregel: NIE Fake-Reviews, UWG). Liest den Bericht des
    taeglichen Lese-Waechters `automation/judgeme_fake_wache.py` (dropship/JUDGEME-WACHE.md — im Repo,
    ueberlebt /tmp-Wipes), nicht das Log. Meldet: harte Befunde > 0, «unklar»/«unvollstaendig», oder
    Bericht aelter als 2 Tage. Anlass 22.09.2026: Bewertung 1335720164 («Test»/«Probelauf», 5★,
    Shop-Ebene) stand 8 Tage veroeffentlicht und zaehlte in der Startseiten-Zahl mit. Die Zahl
    «Namen unmaskiert» ist nur Bericht, kein Ruf (CJ-Nutzernamen, API kann sie nicht aendern)."""
    p = os.path.join(REPO, "dropship", "JUDGEME-WACHE.md")
    try:
        text = open(p, encoding="utf-8").read()
    except OSError:
        return "⭐ Judge.me-Wache hat noch keinen Bericht (automation/judgeme_fake_wache.py nie gelaufen?)"
    m = re.search(r"\*\*(JUDGEME: [^*\n]+)\*\*", text)
    stand = re.search(r"^Stand: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) UTC", text, re.M)
    if not m or not stand:
        return "⭐ Judge.me-Wache: Bericht ohne Ampel-Zeile (dropship/JUDGEME-WACHE.md)"
    zeile = m.group(1)
    try:
        tage = (datetime.datetime.now(datetime.timezone.utc)
                - datetime.datetime.strptime(stand.group(1), "%Y-%m-%d %H:%M").replace(tzinfo=datetime.timezone.utc)).days
    except Exception:
        tage = 99
    if tage >= 2:
        return f"⭐ Judge.me-Wache seit {tage} T ohne Lauf (zuletzt {stand.group(1)}Z) — Aufseher-Block pruefen"
    if "unklar" in zeile or "unvollstaendig" in zeile:
        return f"⭐ {zeile} — Judge.me-Zugang (/tmp/judgeme.env) oder API-Deckel pruefen"
    n = re.match(r"JUDGEME: (\d+) verdaechtig", zeile)
    if n and int(n.group(1)) > 0:
        return f"⭐ {zeile} — dropship/JUDGEME-WACHE.md lesen: ausblenden (PUT curated=spam) oder in _judgeme_freigabe.txt freigeben"
    return None


def offene_punkte():
    """Zählt die Abschnitte in COWORK-AUFTRAEGE.md VOR dem Erledigt-Teil."""
    p = os.path.join(REPO, "dropship", "COWORK-AUFTRAEGE.md")
    if not os.path.exists(p):
        return 0
    text = open(p, encoding="utf-8", errors="ignore").read()
    schnitt = re.split(r"(?im)^#+\s*(?:✅\s*|bereits\s+)?erledigt", text)[0]
    # Nur echte Auftraege zaehlen: nummerierte Punkte und neu markierte. Kopfzeilen wie
    # «Wenn du heute nur drei Dinge machst» sind Wegweiser, keine Aufgaben — sie mitzuzaehlen
    # blaeht die Zahl auf, und eine aufgeblaehte Zahl wird beim zweiten Mal nicht mehr geglaubt.
    return len(re.findall(r"(?m)^##\s+(?:🆕|\d+[a-z]?\.)", schnitt))


def iban_grep():
    """Das Repo ist OEFFENTLICH (gemessen 18.09.). Am 18.09. standen Bankinstitut + Kontoinhaber 17 Minuten auf
    diesem Zweig und seit 20:46 UTC LIVE auf main (Gegenpruefung 22.09.). Diese Zeile sucht taeglich nach
    IBAN-NUMMERN (CH/LI/DE-Muster) und Bank-/Kontoinhaber-Feldern in den Textdateien, die Sessions schreiben.
    Das Wort «IBAN» allein ist kein Fund (Journal beschreibt Vorgaenge) — nur Nummern und ausgefuellte Felder."""
    # Volle IBAN-Laengen (CH/LI 21, DE 22, AT 20 Zeichen) mit Wortgrenze — ein kurzes Muster traf Hex-Hashes
    # («de2776694760» in _bildhash.txt, gemessen 22.09.). Feldnamen zaehlen nur mit ausgefuelltem Wert.
    muster = re.compile(r"\b(?:CH|LI)\d{2}(?:\s?\d{4}){4}\s?\d\b|\bDE\d{2}(?:\s?\d{4}){4}\s?\d{2}\b|\bAT\d{2}(?:\s?\d{4}){4}\b|(?:Kontoinhaber|Account holder|Bankinstitut|Bank name)\s*[:=]\s*[A-Za-zÄÖÜäöü]{2,}", re.I)
    treffer = []
    for wurzel in ("dropship", "brain", "auftraege", "social", "."):
        basis = os.path.join(REPO, wurzel)
        for dp, dn, fn in os.walk(basis):
            if "/.git" in dp or "node_modules" in dp:
                continue
            if wurzel == "." and dp != basis:
                continue          # im Wurzelordner nur die Dateien direkt dort (CLAUDE.md, SHARED-MEMORY.md, Journal)
            for f in fn:
                if not f.endswith((".md", ".txt", ".json", ".csv")):
                    continue
                pf = os.path.join(dp, f)
                try:
                    if os.path.getsize(pf) > 20_000_000:
                        continue
                    text = open(pf, encoding="utf-8", errors="ignore").read()
                except OSError:
                    continue
                if muster.search(text):
                    treffer.append(os.path.relpath(pf, REPO))
    if not treffer:
        return ""
    return f"🏦 BANKANGABE im Repo ({len(treffer)}): " + ", ".join(sorted(treffer)[:5]) + " — sofort entfernen (Repo ist oeffentlich)"


def main():
    if not os.path.exists(TOKPFAD):
        return
    teile = [t for t in (bot_puls(), shopify_rechnung(), bigbuy_ticket(), cj_dispute_1017(), liechtenstein_gesperrt(), klingen_pingpong(), verlust_kaufbar(), google_feedback(), kategorie_offen(), kollektion_doppel_offen(), grow_zaehler(), metricool_kanaele(), social_meta_live(), drafts_ohne_quittung(), fortura_zugang(), azure_stimme(), datei_speicher_voll(), video_deckel(), tiktok_queue_alt(), ki_textstufe(), server_waechter(), judgeme_verdacht(), iban_grep()) if t]
    rest = offene_punkte()
    if not teile and not rest:
        return
    if rest:
        teile.append(f"{rest} Punkte in COWORK-AUFTRAEGE.md")
    print("BRAUCHT DICH: " + " · ".join(teile))


if __name__ == "__main__":
    main()
