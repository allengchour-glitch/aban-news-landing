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
import subprocess, json, os, re, subprocess, sys, time, urllib.request, datetime
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
        j = json.loads(r.read())
    try:   # 12.10.2026 (Zweites Gehirn «helfer-ohne-eimer»): die Ampel fragt jetzt mehr (Werbetest-Meldung) — Eimer-Boden halten
        from eimer_etikette import nachlauf
        nachlauf(j)
    except Exception as e:
        print(f"(Ampel: Eimer-Etikette nicht anwendbar: {type(e).__name__}: {e})", file=sys.stderr)
    return j


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
    # 01.10.2026: Grow aktiv (300 GB) ab dropship/_grow_aktiv.txt (Datum ab 16:00 UTC) — Fehlschläge
    # VOR dem Wechsel sind Vergangenheit; nur spätere melden (sonst ruft die Ampel 24 h lang falsch).
    try:
        g = open(os.path.join(REPO, "dropship", "_grow_aktiv.txt")).read().split("\t")[0].strip()
        grenze = max(grenze, datetime.datetime.fromisoformat(g + "T16:00:00+00:00"))
    except Exception:
        pass
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


def waffen_netz():
    """Wacht über das Waffen-Sicherheitsnetz SELBST (automation/waffen_bild_wache.py, 20.10.2026).

    Anlass: drei Waffen-Zubehör-Produkte (Zielklammer, Zielvorrichtung, Chest-Rig) standen in sechs Kanälen, und das Netz darunter
    war still — Bildprüf-Liste seit 15.10. unbearbeitet, Wochen-Volllauf seit 10.10. nicht mehr durchgelaufen (stirbt im
    Container-Neustart, das Log hat keine Schlusszeile). Ein Netz, das niemand misst, wirkt grün, obwohl es nichts mehr tut.
    """
    try:
        from waffen_bild_wache import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "waffen_bild_wache.py")
        spec = importlib.util.spec_from_file_location("waffen_bild_wache", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def cj_sku_netz():
    """CJ-SKU-Erkennung (automation/cj_sku_wache.py, 20.10.2026): liest den Tagesstand dropship/_cj_sku_stand.json — kein Shopify-Aufruf.
    Anlass: 3'466 nackte CJ-SKUs («CJYDQXHB00011-BROWN-39») fielen durch die Erkennung des Bestellmotors (Kunde zahlt, bei CJ wird nichts
    bestellt). Meldet unbekannte SKU-Formen in den Neuimporten, einen roten Code-Kanarienvogel oder einen Stand älter als 2 Tage."""
    try:
        from cj_sku_wache import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cj_sku_wache.py")
        spec = importlib.util.spec_from_file_location("cj_sku_wache", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def druck_profil_netz():
    """Druck-Profil «Druck auf Bestellung» (automation/druck_profil.py, 21.10.2026): liest den Tagesstand dropship/_druck_profil.json
    — kein Shopify-Aufruf. Anlass: Stufe 2 (20.10. 02:14 UTC) nahm Hoodie + Jutebeutel «selbst gestalten» ins Profil, deren Bestand am
    Printful-Standort liegt → KEIN Versandtarif in der Kasse; der Tageslauf starb danach bei jedem Aufruf (`:.2f` auf None), der
    Stand war 7 Tage alt, und keine Ampelzeile hat es gemeldet. Meldet gestorbenen Lauf, Stand > 2 Tage, Tarif-/Transit-Befund,
    Produkte ohne Kassen-Tarif und eine teure Korb-Matrix."""
    try:
        from druck_profil import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "druck_profil.py")
        spec = importlib.util.spec_from_file_location("druck_profil", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def kassen_sentinel_netz():
    """Kassen-Sentinel (automation/kassen_sentinel.py, 21.10.2026): liest dropship/_kassen_sentinel.json — kein Shopify-Aufruf. Meldet Varianten ohne
    Versandtarif an der Kasse (Schichten Standort/Profil/Neueste), einen leeren Lauf oder einen Stand älter als 2 Tage."""
    try:
        from kassen_sentinel import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kassen_sentinel.py")
        spec = importlib.util.spec_from_file_location("kassen_sentinel", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def guard_vollpass_netz():
    """Wöchentlicher Voll-Durchlauf von Tierschutz- und Medizin-Wächter (automation/guard_vollpass.py, 21.10.2026): liest nur die
    Stempel-Dateien. Anlass: der Tierschutz-Vollpass war am 20.10. fällig (Stempel 13.10.), scheiterte dreimal an der Shopify-
    Drosselung, und weder `absturz_nachholen` (die Fehlzeile trug kein «Error») noch eine Ampelzeile hat es bemerkt."""
    try:
        from guard_vollpass import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guard_vollpass.py")
        spec = importlib.util.spec_from_file_location("guard_vollpass", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def cj_nachpruefung_netz():
    """CJ-Nachprüfung (#1019-Schutz, automation/cj_nachpruefung_netz.py, 21.10.2026): ⚠️ wenn die sichtbare Ware (Stufe A) länger als 36 h nicht
    vollständig gegen «bei CJ ausgelistet» geprüft wurde oder der Wächter gar nichts mehr schreibt; ℹ️, solange der übrige Bestand in 30 T
    unter 50 % geprüft ist. Anlass: Spähtrupp wf_3b017e9f W1 — 6,8 % Abdeckung, niemand hat es gesehen."""
    try:
        from cj_nachpruefung_netz import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cj_nachpruefung_netz.py")
        spec = importlib.util.spec_from_file_location("cj_nachpruefung_netz", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def indexnow_netz():
    """IndexNow-Meldung an Bing (automation/indexnow_netz.py, 21.10.2026): ⚠️ wenn der letzte erfolgreiche Lauf > 36 h her ist (Takt 6 h) oder
    IndexNow die letzte Meldung abgelehnt hat. Anlass: Spähtrupp wf_32ed9d12 — die Meldung lief ohne jede Ampelzeile."""
    try:
        from indexnow_netz import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "indexnow_netz.py")
        spec = importlib.util.spec_from_file_location("indexnow_netz", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def theme_marken_netz():
    """Theme-Marken (automation/theme_marken_wache.py, 21.10.2026): ⚠️ wenn eine eigene Theme-Änderung im LIVE-Theme fehlt (Update/Editor hat
    überschrieben) oder die tägliche Prüfung seit 36 h nicht lief. Leer, solange die Prüfung nie lief."""
    try:
        from theme_marken_wache import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "theme_marken_wache.py")
        spec = importlib.util.spec_from_file_location("theme_marken_wache", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def merkliste_netz():
    """Merkliste (automation/merkliste_wache.py, 21.10.2026): ⚠️ wenn ein Teil des Herzens/der Liste im LIVE-Theme fehlt, die Prüfung «unklar» ist oder der
    Stand älter als 36 h ist. Leer, solange die Prüfung nie lief (ohne dropship/_merkliste_v3_aktiv.txt prüft sie nur den alten Stand)."""
    try:
        from merkliste_wache import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "merkliste_wache.py")
        spec = importlib.util.spec_from_file_location("merkliste_wache", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def echte_bewertungen_netz():
    """Echte Käufer-Bewertungen (automation/echte_bewertungen_wache.py, 21.10.2026): ℹ️ solange die Judge.me-Anfrage nach Lieferung nicht bestätigt ist
    (dropship/_judgeme_anfrage_an.txt), ⚠️ wenn sie ≥ 35 T läuft und trotz ≥ 3 fälliger Bestellungen 0 echte Bewertungen da sind oder der Stand > 36 h alt ist."""
    try:
        from echte_bewertungen_wache import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "echte_bewertungen_wache.py")
        spec = importlib.util.spec_from_file_location("echte_bewertungen_wache", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


def lux_assistent_netz():
    """Kostenloser Shop-Assistent (automation/lux_assistent.py, 21.10.2026): ⚠️ wenn Abschnitt/Verweis fehlen, eine feste Antwort nicht mehr zu den
    Richtlinien passt (Gratisschwelle, Fristen, Zahlarten …), ein verlinkter Abschnitt fehlt oder die Wache seit 36 h nicht geprüft hat. Leer, solange
    der Assistent nicht eingebaut ist."""
    try:
        from lux_assistent import zeile
    except Exception:
        import importlib.util
        spur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lux_assistent.py")
        spec = importlib.util.spec_from_file_location("lux_assistent", spur)
        if not spec or not spec.loader:
            return ""
        modul = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(modul)
        zeile = modul.zeile
    return zeile() or ""


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
    # 12.10.2026: Liechtenstein ist seit 09.10. Lieferland (Markets CH+LI). Meldungen nur für ein weiteres Lieferland blockieren
    # die Schweiz nicht, aber die Gratis-Einträge dort → eigene Zahl (Lieferländer stehen gemessen im Stand, nie aus einer Notiz).
    weitere = set(s.get("lieferlaender") or ()) - {"CH"}
    li = 0
    for k, v in (s.get("nur_ausland") or {}).items():
        m = re.search(r"\[([A-Z, ]+)\]\s*$", k)
        if m and {x.strip() for x in m.group(1).split(",")} & weitere:
            li += v
    liz = f" · {'/'.join(sorted(weitere))}: {li} ohne Google-Versandangabe (Lieferland → GOOGLE-FEEDBACK.md)" if li else ""
    # 13.10.2026 (Urteil B1): «Image/Title under review» = Prüf-Warteschlange bei Google, kein Blocker → eigene Zahl mit
    # Verweildauer (dropship/_google_pruefung_seit.json, Felder schreibt google_feedback_wache.py in den Stand).
    wz = ""
    if s.get("wartet"):
        aelt = s.get("wartet_aeltestes")
        aelt_tm = f"{aelt[8:10]}.{aelt[5:7]}." if aelt and len(aelt) >= 10 else "?"
        wz = (f" · {s.get('wartet_summe', sum(s['wartet'].values()))} warten bei Google ({s.get('wartet_ueber', '?')} > "
              f"{s.get('wartet_ueber_tage', 14)} T, ältestes seit {aelt_tm}{', Liste gedeckelt' if s.get('wartet_gedeckelt') else ''})")
    # 21.10.2026 (Spähtrupp wf_32ed9d12 M2a): Abdeckung der Rückmeldungen. «Leer» = Google hat nichts gemeldet (nicht «sauber»); ⚠️ wenn die jüngste
    # Rückmeldung älter als 72 h ist — dann liefert Googles Schub nicht mehr, und jede Blocker-Zahl oben ist veraltet.
    rz = ""
    rm = s.get("rueckmeldung")
    if rm:
        try:
            jh = (datetime.datetime.utcnow() - datetime.datetime.strptime(rm["juengste"], "%Y-%m-%dT%H:%M:%SZ")).total_seconds() / 3600
            rz = (f" · Rückmeldung: {rm['leer_prozent']} % ohne, jüngste vor {jh:.0f} h, {rm['frisch_24h']} in 24 h"
                  + (" · ⚠️ keine frische Rückmeldung seit > 72 h" if jh > 72 else ""))
        except Exception:
            rz = " · ⚠️ Rückmeldung: Stand unlesbar"
    return f"GOOGLE: {s.get('blocker')} Blocker ({top}){wz}{alt}{voll}{shopz}{liz}{rz}"



def ch_lager_profil_zeile():
    """CH-LAGER-PROFIL (13.10.2026): Ware ab Schweizer Lager liegt im Versandprofil «CH-Lager» (0.00-Tarife unter den Namen des
    General profile) — die Kasse zeigt ihr Datum (Maske 13.10.: «Di., 20. Okt–Mi., 21. Okt KOSTENLOS» statt «28. Okt–11. Nov»).
    Liest dropship/_ch_lager_profil.json + _ch_lager_profil_stufe.json. None = alles in Ordnung."""
    try:
        s = json.load(open(os.path.join(REPO, "dropship", "_ch_lager_profil.json"), encoding="utf-8"))
        st = json.load(open(os.path.join(REPO, "dropship", "_ch_lager_profil_stufe.json"), encoding="utf-8"))
    except Exception:
        return "⚠️ CH-LAGER-PROFIL: Stand fehlt (automation/ch_lager_profil.py)"
    if s.get("fehler"):
        return f"⚠️ CH-LAGER-PROFIL: {s['fehler']}"
    if not s.get("tarife_ok"):
        return (f"⚠️ CH-LAGER-PROFIL: Tarif-Befund {'; '.join((s.get('befunde') or [])[:2])} → Zuordnen gestoppt "
                f"(Rückweg: python3 automation/ch_lager_profil.py --zurueck --scharf)")
    try:
        alter = (datetime.datetime.utcnow() - datetime.datetime.strptime(s["stand"], "%Y-%m-%dT%H:%MZ")).total_seconds()
    except Exception:
        alter = 10 ** 9
    if alter > 30 * 3600:
        return f"⚠️ CH-LAGER-PROFIL: Stand von {s.get('stand')} — Tageslauf fehlt (Log /tmp/ch_lager_profil.log)"
    teile = []
    if s.get("fehlt_varianten") or s.get("falsch_varianten"):
        teile.append(f"{s.get('fehlt_varianten')} nicht zugeordnet, {s.get('falsch_varianten')} falsch")
    stufe = int(st.get("stufe", 1))
    faellig = {1: "2026-10-14", 2: "2026-10-17"}.get(stufe)
    if faellig and datetime.date.today().isoformat() >= faellig:
        teile.append(f"Stufe {stufe} → {stufe + 1} fällig (vorher google_feedback_wache auf «shipping»/«Inaccurate» prüfen, "
                     f"dann «stufe» in dropship/_ch_lager_profil_stufe.json)")
    return f"CH-LAGER-PROFIL Stufe {stufe}: {s.get('im_profil_varianten')} Varianten · " + " · ".join(teile) if teile else None


def kassen_lieferdatum():
    """KASSEN-DATUM (10.10.2026): Kasse zeigte «Zustellung 20. Okt», Produktseite «26. Okt – 9. Nov» — Bearbeitungszeit P1D, CJ
    versendet nach Median 2 / bis 5 Werktagen. Nur im Admin änderbar → Betreiber. Liest dropship/_kassen_lieferdatum.json
    (automation/kassen_lieferdatum_wache.py, Aufseher täglich)."""
    try:
        s = json.load(open(os.path.join(REPO, "dropship", "_kassen_lieferdatum.json"), encoding="utf-8"))
    except Exception:
        return None
    teile = []
    # 13.10.2026: Entscheid 1 («entscheide du») = Versandprofil «CH-Lager» (automation/ch_lager_profil.py, Aufseher täglich).
    # Die Zeile erscheint nur, wenn etwas zu tun ist: Tarif-Befund, Stand alt/fehlt, Rest nicht zugeordnet, Stufe fällig.
    z = ch_lager_profil_zeile()
    if z:
        teile.append(z)
    # 13.10.2026 (A7): Produktseite/Warenkorb rechnen das Kassen-Datum mit fest eingebauten Zahlen (LUX-KASSENDATUM) — weicht
    # die Bearbeitungszeit oder die Transitregel ab, zeigt die Seite still ein anderes Datum als die Kasse.
    tb = (s.get("theme_kassendatum") or {}).get("befunde") or []
    if tb:
        teile.append("⚠️ KASSEN-DATUM THEME: " + " · ".join(tb[:3]) + (f" (+{len(tb) - 3})" if len(tb) > 3 else "")
                     + " → automation/kassen_lieferdatum_wache.py --selbsttest, Zahlen in lux_delivery/lux_cart_trust anpassen")
    # 13.10.2026 (VERB-M1): Lieferzusage «ab Schweizer Lager» kürzer als die Kasse (Profil CH-Lager)? Feld von kassen_lieferdatum_wache.py
    # (Richtlinien, Seiten, Artikel, Kollektionen, KB, Theme, Social-Warteschlange, Vorlagen; Produkte korrigiert die Charge selbst).
    zc = s.get("zusage_ch_lager") or {}
    if zc.get("treffer") or zc.get("fehler"):
        bsp = "; ".join(f"{x.get('quelle')} {x.get('kennung')}" for x in (zc.get("liste") or [])[:3])
        teile.append(f"⚠️ ZUSAGE CH-LAGER: {zc.get('treffer', '?')} Stellen versprechen weniger als {zc.get('soll', '2–3')} Werktage"
                     + (f" ({bsp})" if bsp else f" ({zc.get('fehler')})") + " → python3 automation/kassen_lieferdatum_wache.py --zusage-liste")
    if not s.get("zu_frueh"):
        return " · ".join(teile) or None
    return " · ".join(teile + [""]) + (f"KASSEN-DATUM zu früh: Bearbeitungszeit {s.get('bearbeitungszeit_tage')} T, CJ versendet nach Median {s.get('median')} "
            f"Werktagen → Admin: Einstellungen → Versand und Zustellung → Voraussichtliche Zustellung → «Manuell» + {s.get('empfohlen')} Werktage")

def _werbetest_aktiviert(w, ql, heute):
    """13.10.2026 (Prüfung Werbetest A): Der Start in der Steuerdatei ist ein PLAN, kein Aktivierungstag. Die Ampel meldete am
    Vortag «Tag 1 … ⚠️ 0 Sitzungen», und aktiviert der Betreiber später, zählte sie Tage × Budget ab dem Plan — die Stopp-Regel
    «CHF 30 ohne Warenkorb» hätte zu früh gegriffen. Aktiviert = «aktiviert» in der Steuerdatei (von Hand gesetzt) ODER der
    erste Tag mit Sitzungen dieser utm_campaign ab dem geplanten Start. None = noch nicht aktiviert."""
    if w.get("aktiviert"):
        return datetime.date.fromisoformat(str(w["aktiviert"])[:10])
    geplant = datetime.date.fromisoformat(w["start"])
    if geplant > heute:
        return None
    tage = sorted(str(z.get("day"))[:10] for z in ql(
        f"FROM sessions SHOW sessions GROUP BY day WHERE utm_campaign = '{w['kampagne']}' SINCE {geplant.isoformat()} UNTIL today")
        if int(z.get("sessions") or 0) > 0)
    return datetime.date.fromisoformat(tage[0]) if tage else None

def werbetest():
    """WERBETEST (10.10.2026, Sidekick-Empfehlung 4 «miss nicht nur Klicks»): solange eine Testkampagne läuft, steht ihr Trichter
    (Sitzungen → Warenkorb → Kasse → Kauf, ShopifyQL je utm_campaign) in jeder Ampel — mit den Abbruchregeln aus
    dropship/WERBETEST-PLAN-2026-10-10.md. Ausgaben kennt der Shop nicht (kein Google-Ads-Zugang): CHF-Angabe = Obergrenze
    Tagesbudget × Tage AB AKTIVIERUNG. Steuerdatei dropship/_werbetest_aktiv.json {kampagne, start, ende, budget_tag, marge,
    handle | handles, aktiviert?}. 13.10.: mehrere Testprodukte («handles») prüft tools/werbetest_trichter.wache() — fremde
    Landeseiten, Google-Meldung [CH], seit Teststart geändert; ein einzelnes «handle» prüft der alte Weg unten."""
    try:
        w = json.load(open(os.path.join(REPO, "dropship", "_werbetest_aktiv.json"), encoding="utf-8"))
        heute = datetime.date.today()
        start, ende = datetime.date.fromisoformat(w["start"]), datetime.date.fromisoformat(w["ende"])
        if w.get("pausiert"):   # 12.10.: pausierte Kampagne → keine Stopp-Regel-Mahnung, nur der Stand
            if heute > ende + datetime.timedelta(days=3):
                return None
            return f"WERBETEST {w['kampagne']}: pausiert seit {w['pausiert'][:10]} (Werbe-Kontingent voll) — wieder an nach Kontingent-Erhöhung"
        sys.path.insert(0, os.path.join(REPO, "tools"))
        from werbetest_trichter import ql, FELDER, wache, zeile
        produkte = ""
        if w.get("handles"):
            try:
                produkte = " · " + zeile(wache(w)).split(": ", 1)[1]
            except (Exception, SystemExit) as e:
                produkte = f" · Produkte unklar ({type(e).__name__})"
        aktiv = _werbetest_aktiviert(w, ql, heute)
        if aktiv is None:
            if heute > ende + datetime.timedelta(days=3):
                return None
            if heute < start:
                return f"WERBETEST {w['kampagne']}: startet frühestens {start.strftime('%d.%m.')} — wartet auf Aktivierung durch den Betreiber{produkte}"
            ohne = (heute - start).days + 1
            hinweis = (f" · ⚠️ seit {start.strftime('%d.%m.')} ({ohne} T) 0 Sitzungen: noch nicht aktiviert — ODER Anzeigen ohne "
                       f"Auslieferung bzw. URL-Suffix «utm_campaign={w['kampagne']}» fehlt → Betreiber fragen") if ohne >= 3 else ""
            return f"WERBETEST {w['kampagne']}: noch nicht aktiviert (geplant ab {start.strftime('%d.%m.')}){hinweis}{produkte}"
        ende = aktiv + (ende - start)            # Testdauer gilt ab Aktivierung, nicht ab Plan
        if heute > ende + datetime.timedelta(days=3):
            return None
        start = aktiv
        tage = max(1, (min(heute, ende) - start).days + 1)
        r = ql(f"FROM sessions SHOW {FELDER} WHERE utm_campaign = '{w['kampagne']}' SINCE {start.isoformat()} UNTIL today")
        r = r[0] if r else {}
        s, k, c, b = (int(r.get(x) or 0) for x in ("sessions", "sessions_with_cart_additions",
                                                    "sessions_that_reached_checkout", "sessions_that_completed_checkout"))
        fremd = 0
        if w.get("handle"):                      # 10.10. 19:00: 10 bezahlte Klicks landeten auf Nagellack, Heizgerät … (Produktgruppe offen)
            for z in ql(f"FROM sessions SHOW sessions GROUP BY landing_page_path WHERE utm_campaign = '{w['kampagne']}' "
                        f"SINCE {start.isoformat()} UNTIL today"):
                if w["handle"] not in (z.get("landing_page_path") or ""):
                    fremd += int(z.get("sessions") or 0)
        # 12.10.2026 (Betreiber «warum google ads 0 klicks»): Sirène trug bei Google «Over capacity for Shopping ads (in CSS
        # program) [CH]» — das Merchant-Konto hat mehr Produkte als Werbe-Kontingent, das Testprodukt war nicht bewerbbar. Die
        # Kampagne (Produktgruppe nur Label «werbetest») lief damit ins Leere: 23 Sitz. am 10.10., danach 1/Tag. Gemessen wird
        # jetzt (a) die Google-Meldung am Testprodukt, (b) die Sitzungen der letzten 2 Tage.
        sperre = []
        if w.get("handle"):
            p = gql('query($h:String!){productByHandle(handle:$h){feedback{details{app{title} messages{message}}}}}',
                    {"h": w["handle"]}).get("data", {}).get("productByHandle") or {}
            for det in ((p.get("feedback") or {}).get("details") or []):
                for m in det.get("messages") or []:
                    if "Shopping_ads" in m["message"] and "[CH]" in m["message"]:
                        sperre.append(m["message"].split(" in [")[0])
        r2 = ql(f"FROM sessions SHOW sessions WHERE utm_campaign = '{w['kampagne']}' SINCE -1d UNTIL today")   # gestern + heute
        s2 = int((r2[0] if r2 else {}).get("sessions") or 0)
        # Schreibsperre muss bis Testende + 3 T reichen (Aktivierung später als geplant → Ende rutscht nach hinten)
        frist = ""
        try:
            from werbetest_sperre import lesen as _sperre_lesen
            _i, _h, sp_ende = _sperre_lesen(open(os.path.join(REPO, w.get("sperre") or "dropship/_werbetest_sperre.txt"),
                                                 encoding="utf-8").read(), heute=heute)
            if sp_ende and sp_ende < ende + datetime.timedelta(days=3):
                frist = (f" · ⚠️ Schreibsperre endet {sp_ende.strftime('%d.%m.')}, Test bis {ende.strftime('%d.%m.')} → "
                         f"«# ende:» in {w.get('sperre') or 'dropship/_werbetest_sperre.txt'} auf {(ende + datetime.timedelta(days=3)).isoformat()}")
        except Exception:
            pass
    except (Exception, SystemExit) as e:   # ql() beendete früher per sys.exit — das riss die ganze Ampel mit
        return f"WERBETEST: unklar ({type(e).__name__})" if os.path.exists(os.path.join(REPO, "dropship", "_werbetest_aktiv.json")) else None
    hoechst = tage * float(w.get("budget_tag", 0))
    regel = ""
    if b and hoechst / b <= float(w.get("marge", 0)):
        regel = " → lohnt (Kosten je Kauf ≤ Marge)"
    elif hoechst >= 30 and not k:
        regel = " → ⚠️ STOPP-REGEL: ~CHF 30 ohne Warenkorb → Kampagne pausieren"
    elif tage >= 1 and not s:
        regel = " → ⚠️ 0 Sitzungen mit dieser utm_campaign: Suffix der finalen URL fehlt oder Anzeigen laufen noch nicht"
    if fremd:
        regel += f" · ⚠️ {fremd} Sitzungen auf FREMDEN Produkten → Google Ads: Produktgruppe «Alles andere» ausschliessen"
    if sperre:
        regel += f" · ⛔ Testprodukt bei Google NICHT bewerbbar ({'; '.join(sorted(set(sperre)))}) → Werbe-Kontingent voll: im Merchant Center erhöhen lassen oder Kampagne pausieren (Produktwechsel hilft nicht — Aurora fiel 30 min nach der Änderung ebenfalls raus, 12.10.)"
    if tage >= 2 and s2 <= 2:
        regel += f" · ⚠️ gestern+heute {s2} Sitz. — Kampagne pausiert oder ohne Auslieferung"
    return (f"WERBETEST {w['kampagne']} Tag {tage} seit {start.strftime('%d.%m.')} (≤ CHF {hoechst:.0f}): {s} Sitz. · {k} Korb · {c} Kasse · {b} Kauf"
            f"{regel}{frist}{produkte}")

def _kategorie_live():
    """12.10.2026: Die Ampel zog früher vom Stand-Wert (211, vor dem Lauf um 06:33) ab und meldete 211, obwohl
    live 36 aktiv ohne Kategorie stehen: neue Produkte stehen nicht im Ledger, also wurden sie nie abgezogen.
    Deshalb zählt die Ampel jetzt LIVE (productsCount, EXACT). Fällt die Abfrage aus, bleibt der Stand-Wert."""
    try:
        sys.path.insert(0, os.path.join(REPO, "automation"))
        from seo_autopilot import gql
        d = gql('{ productsCount(query:"status:active AND -category_id:*"){ count precision } }')["productsCount"]
        return int(d["count"]), d.get("precision")
    except Exception:
        return None, None

def kategorie_offen():
    """KATEGORIE: N aktive ohne Taxonomie-Kategorie — Stand von automation/kategorie_wache.py (23.09.2026, Task #101).
    Der Shop-Kanal zeigt nur Produkte MIT Kategorie (33'863 «nicht auffindbar» gemessen). Liest den STAND (Datei)."""
    live_n, live_p = _kategorie_live()
    if live_n is not None:
        return None if live_n == 0 else f"KATEGORIE: {live_n} aktive ohne Kategorie (live gezählt, {live_p or '?'})"
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


def fortura_bestand_alter():
    """FORTURA-BESTAND (24.09.2026): Der Abgleich Feed → Shop stand vom 21.08. bis 24.09. still (hing am pausierten
    Import-Runner). Meldet nur, wenn der letzte Abgleich (letzte Zeile dropship/_fortura_bestand_log.tsv) > 30 h alt ist."""
    try:
        pfad = os.path.join(REPO, "dropship", "_fortura_bestand_log.tsv")
        with open(pfad, "rb") as f:
            f.seek(max(0, os.path.getsize(pfad) - 4000)); z = f.read().decode("utf-8", "ignore").strip().splitlines()[-1]
        t = datetime.datetime.strptime(z.split("\t")[0][:19], "%Y-%m-%dT%H:%M:%S")
        # 04.10.2026: Ein Lauf ohne Änderung schreibt KEINE Journalzeile — die Ampel hielte ihn für ausgeblieben. Der Bericht
        # (Kopfzeile «— JJJJ-MM-TT HH:MM UTC») entsteht bei jedem FERTIG; es zählt der jüngere der beiden Zeitpunkte.
        try:
            with open(os.path.join(REPO, "dropship", "_fortura_bestand_report.md"), encoding="utf-8") as f:
                m = re.search(r"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) UTC", f.readline())
            if m:
                t = max(t, datetime.datetime.strptime(m.group(1) + "T" + m.group(2), "%Y-%m-%dT%H:%M"))
        except Exception:
            pass
        h = (datetime.datetime.utcnow() - t).total_seconds() / 3600
        # 05.10.2026: fortura_bestand_taeglich.sh schreibt bei PAUSE nur noch die Marke /tmp/fortura_bestand.pause («Zeit Grund») und
        # lässt den Erfolgsstempel in Ruhe (vorher drehte nochmal() ihn auf «jetzt − 18 h» zurück). Steht eine Pause, die jünger ist als
        # der letzte Erfolg, soll die Ampel den Grund nennen — ein Automat, der still scheitert, ist für die Kundin keiner.
        pause = ""
        try:
            pz = open("/tmp/fortura_bestand.pause", encoding="utf-8").read().strip()
            if pz and pz[:19] > t.strftime("%Y-%m-%dT%H:%M:%S"):
                pause = f" · PAUSE seit {pz[11:16]} UTC: {pz[21:111]}"
        except OSError:
            pass
        if h > 30:
            return f"⚠️ FORTURA-BESTAND {h/24:.0f} T alt (letzter Abgleich {t:%d.%m. %H:%M}) — Ware ab CH-Lager mit eingefrorenem Bestand{pause}"
        return f"⚠️ FORTURA-BESTAND: letzter Abgleich {t:%d.%m. %H:%M}{pause}" if pause else ""
    except Exception as e:
        return f"FORTURA-BESTAND: unklar ({type(e).__name__})"


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


# 09.10.2026 (Verbesserungsrunde): «still: Pinterest» stand in «BRAUCHT DICH», obwohl der Autopilot Pinterest seit 06.10.
# bewusst nur alle 48 h bedient (Median 1 Aufruf je Pin) — die Ampel prüfte jeden Kanal fest auf 24 h. Der Takt kommt jetzt
# aus EINER Quelle, social_autopilot.sh (TIKTOK_/YOUTUBE_/PINTEREST_ABSTAND); still = letzter Post älter als Takt + Spielraum.
_TAKT_STANDARD = {"tiktok": 21600, "youtube": 43200, "pinterest": 172800}


def metricool_takt():
    """{kanal: Sekunden} aus den Standardwerten in automation/social_autopilot.sh (FALLBACK _TAKT_STANDARD)."""
    import re as _re
    takt = dict(_TAKT_STANDARD)
    try:
        sh = open(os.path.join(REPO, "automation/social_autopilot.sh"), encoding="utf-8").read()
        for k in takt:
            m = _re.search(rf"^{k.upper()}_ABSTAND=\$\{{{k.upper()}_ABSTAND:-(\d+)\}}", sh, _re.M)
            if m:
                takt[k] = int(m.group(1))
    except OSError:
        pass
    return takt


def kanal_still(alter_s, takt_s):
    """Still = kein Post seit Takt + Spielraum (25 % des Takts, mindestens 2 h: Autopilot-Runden, Neustarts, Planzeit).
    alter_s None = noch nie gepostet → still."""
    return alter_s is None or alter_s > takt_s + max(7200, takt_s // 4)


def _vorlauf_slots():
    """20.10.2026: {format: (vergangene, künftige, alle)} Termine aus dropship/_vorlauf_plan.json. «vergangen/künftig»
    zählt nur status=geplant MIT Metricool-ID — Metricool veröffentlicht zum Termin (autoPublish), `posted_at` im Ledger ist
    seit dem 7-Tage-Vorlauf (18.10.) nur die PLANUNGSZEIT. {} = Plan nicht lesbar → altes Verhalten (Ledger)."""
    try:
        import datetime as dt
        p = json.load(open(os.path.join(REPO, "dropship/_vorlauf_plan.json"), encoding="utf-8"))
        jetzt = dt.datetime.utcnow(); out = {}
        for s in (p.get("slots") or {}).values():
            t = dt.datetime.fromisoformat(s["termin_utc"].replace("Z", "")[:19])
            v, k, alle = out.setdefault(s["format"], ([], [], []))
            alle.append(t)
            if s.get("status") != "geplant" or not s.get("mc_ids"):
                continue
            (v if t <= jetzt else k).append(t)
        return out
    except Exception:
        return {}


def metricool_kanaele():
    """23.09.2026 «metricool maximal nutzen»: je Metricool-Kanal, wie viel in 24 h geplant wurde, und Fehler.
    Ein Kanal ist «still», wenn sein letzter Post älter ist als sein Takt aus social_autopilot.sh + Spielraum (09.10.).
    20.10.2026: Sendezeit = Termin des jüngsten vergangenen Vorlauf-Slots (Ledger-`posted_at` ist nur die Planungszeit →
    Fehlalarm «still: TikTok/YouTube» bei laufendem Posten). «Still» bleibt echter Lückenmelder: der Plan trägt nur, solange
    ein künftiger Slot steht UND der jüngste vergangene nicht länger her ist als der grösste Slot-Abstand des Formats + 2 h."""
    try:
        import csv, datetime as dt
        jetzt = dt.datetime.utcnow()
        grenze = jetzt - dt.timedelta(hours=24)
        def zeit(t):
            try: return dt.datetime.fromisoformat((t or "").replace("Z", "")[:19])
            except Exception: return None
        n = {"tiktok": 0, "youtube": 0}; fehler = []; letzt = {"tiktok": None, "youtube": None, "pinterest": None}
        rows = list(csv.DictReader(open(os.path.join(REPO, "automation/reels_seed.csv"), newline="")))
        for r in rows:
            st = (r.get("status") or "").strip()
            for k in n:
                if st == f"posted-{k}":
                    t = zeit(r.get("posted_at"))
                    if t:
                        n[k] += t >= grenze
                        letzt[k] = max(letzt[k] or t, t)
                if st == f"{k}-fehler": fehler.append(k)
        pins = 0
        lp = os.path.join(REPO, "dropship/_pinterest_pins.txt")
        if os.path.exists(lp):
            for z in open(lp):
                t = zeit(z.split("\t")[0]) if z.strip() else None
                if t:
                    pins += t >= grenze
                    letzt["pinterest"] = max(letzt["pinterest"] or t, t)
        takt = metricool_takt()
        plan = _vorlauf_slots(); gedeckt = {k: False for k in letzt}
        for k, f in (("tiktok", "tiktok"), ("youtube", "youtube"), ("pinterest", "pin")):
            v, kuenftig, alle = plan.get(f, ([], [], []))
            if v:
                if k in n: n[k] = max(n[k], sum(t >= grenze for t in v))
                else: pins = max(pins, sum(t >= grenze for t in v))
                letzt[k] = max(letzt[k] or max(v), max(v))   # nie hinter das Ledger zurück (Autopilot postet nach Planende selbst)
                if kuenftig:
                    alle = sorted(alle)
                    luecke = max((b_ - a_).total_seconds() for a_, b_ in zip(alle, alle[1:])) if len(alle) > 1 else 0
                    gedeckt[k] = (jetzt - max(v)).total_seconds() <= luecke + 7200
        teile = [f"TikTok {n['tiktok']}", f"YouTube {n['youtube']}", f"Pinterest {pins}"]
        warn = []
        for name, k in (("TikTok", "tiktok"), ("YouTube", "youtube"), ("Pinterest", "pinterest")):
            alter = (jetzt - letzt[k]).total_seconds() if letzt[k] else None
            if kanal_still(alter, takt[k]) and not gedeckt[k]:
                warn.append(f"{name} (letzter vor {int(alter // 3600)} h, Takt {takt[k] // 3600} h)" if alter else f"{name} (nie)")
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
            # 27.09.2026 Betreiber: «meta brauch nicht habe ja metricool» — Zugang wird NICHT erneuert; der Autopilot
            # schaltet bei Ablauf auf Metricool um (Bild, Reel, Karussell). Gerufen wird nur, wenn Metricool fehlt.
            mc = os.environ.get("METRICOOL_USER_TOKEN") or os.path.exists("/tmp/metricool.env")
            if tage < 14 and not mc:
                teile.append(f"{'⛔' if tage < 3 else '⚠️'} META-DATENZUGANG endet in {tage:.0f} Tagen "
                             f"({datetime.datetime.utcfromtimestamp(ende):%d.%m. %H:%M} UTC) und Metricool-Zugang fehlt")
    except Exception as e:
        teile.append(f"IG: unklar ({type(e).__name__})")
    try:
        grenze = datetime.datetime.now().timestamp() - 86400
        zeilen = subprocess.run(["git", "-C", REPO, "stash", "list", "--format=%ct %gs"],
                                capture_output=True, text=True, timeout=20).stdout.split("\n")
        neu = sum(1 for z in zeilen if z.strip() and int(z.split()[0]) > grenze)
        # 24.09.2026: Nicht mehr Stashes zaehlen, sondern messen, was drin FEHLT. Gezaehlt wurden nur «autostash»-
        # Stashes; die Quittung des Smartwatch-Posts (02:13) lag in einem «WIP»-Stash von repo_vorspulen.sh.
        r = subprocess.run(["python3", os.path.join(REPO, "automation", "quittung_rueckspiel.py")],
                           capture_output=True, text=True, timeout=60, env={**os.environ, "SCHARF": ""})
        fehlt = sum(1 for z in r.stdout.splitlines() if z.startswith(("  ✓", "  +")))
        if fehlt:
            teile.append(f"⚠️ {fehlt} Post-Quittung(en) nur im Stash → SCHARF=1 python3 automation/quittung_rueckspiel.py")
        elif neu:
            teile.append(f"Stashes 24 h: {neu} (Quittungen alle im Repo)")
    except Exception:
        pass
    return " · ".join(teile)



def startseiten_optik():
    """OPTIK (30.09.2026): Befunde von automation/startseite_optik_wache.mjs (gerenderte Startseite, 390 px)."""
    try:
        d = json.load(open(os.path.join(REPO, "dropship", "_startseite_optik.json"), encoding="utf-8"))
    except Exception:
        return "OPTIK: noch kein Lauf (automation/startseite_optik_wache.mjs)"
    b = d.get("befunde") or []
    if not b:
        return ""  # nur melden, wenn etwas zu tun ist
    arten = {}
    for x in b:
        arten[x["art"]] = arten.get(x["art"], 0) + 1
    return "⚠️ OPTIK Startseite: " + ", ".join(f"{k} {v}" for k, v in arten.items()) + " — dropship/STARTSEITE-OPTIK.md"

def startseiten_gewicht():
    """STARTSEITE-GEWICHT (14.10.2026, Stufe A): letzte echte Messung aus dropship/_startseite_gewicht.tsv gegen die Grenzen
    von startseite_gewicht.py, dazu die letzte Zeile von startseite_schlank_patch (Theme-Update hat Bausteine überschrieben?).
    Nur melden, wenn etwas zu tun ist oder der Wächter steht (> 48 h ohne echte Messung)."""
    teile = []
    try:
        import startseite_gewicht as sg
        zeilen = [l.rstrip("\n").split("\t") for l in open(os.path.join(REPO, "dropship", "_startseite_gewicht.tsv"), encoding="utf-8")][1:]
        echt = [z for z in zeilen if len(z) >= 13 and z[12] == "0"]
        if not echt:
            teile.append("⚠️ STARTSEITE-GEWICHT: noch keine echte Messung (nur Cache-Kopien)")
        else:
            z = echt[-1]
            alter = (datetime.datetime.now(datetime.timezone.utc)
                     - datetime.datetime.strptime(z[0], "%Y-%m-%dT%H:%MZ").replace(tzinfo=datetime.timezone.utc)).total_seconds()
            w = {"bytes": int(z[1]), "links": int(z[2]), "ueberschriften": int(z[3]), "h1": int(z[4]),
                 "h1_versteckt": int(z[5]), "variant_links": int(z[6])}
            if len(z) >= 14 and z[13].isdigit():
                w["fuss"] = int(z[13])            # Byte-Offset der Fussleiste (Googlebot liest nur 2 MiB, 21.10.2026)
            b = sg.befunde(w, False)
            if alter > 48 * 3600:
                b.append(f"letzte echte Messung vor {alter / 3600:.0f} h (Wächter steht?)")
            if b:
                teile.append(f"⚠️ STARTSEITE-GEWICHT {w['bytes'] / 1e6:.2f} MB: " + "; ".join(b))
    except Exception as e:
        teile.append(f"STARTSEITE-GEWICHT: unklar ({type(e).__name__})")
    try:
        letzte = [l for l in open("/tmp/startseite_schlank_patch.log", encoding="utf-8") if l.startswith("SCHLANK:")]
        if letzte and "⚠️" in letzte[-1]:
            teile.append(letzte[-1].strip()[:200])
    except OSError:
        pass
    return " · ".join(teile)


def grow_zaehler():
    """GROW (23.09.2026, Betreiber: «wen noch 3 verkäufe dann upgrade ich shopyfi grow 300 gb»): zaehlt bezahlte,
    nicht erstattete Bestellungen FREMDER Kunden seit dem Start in dropship/_grow_bedingung.txt. Eigenbestellungen des
    Betreibers (eine feste Kunden-ID) zaehlen nicht. Meldet immer den Stand; ab Ziel als Ruf an den Betreiber."""
    # 01.10.2026: Betreiber «grow plan aktiv» (gemessen: shop.plan.displayName = «Shopify» = Grow) → Zähler erledigt.
    if os.path.exists(os.path.join(REPO, "dropship", "_grow_aktiv.txt")):
        return ""
    try:
        cfg = dict(l.rstrip("\n").split("\t", 1) for l in open(os.path.join(REPO, "dropship", "_grow_bedingung.txt"), encoding="utf-8") if "\t" in l)
        start, ziel, eigen = cfg["start"], int(cfg.get("ziel", "3")), cfg.get("eigene_kunden_id", "")
        # ⚠️ 30.09.2026 (#1019): eine voll erstattete Bestellung blieb «PAID», solange die Rückbuchung PENDING ist, und zählte
        # als Verkauf (GROW 2/3 statt 1/3). Gezählt wird jetzt: nicht storniert UND erstattete Buchungen < Bestellbetrag.
        d = gql('query($q:String!){ orders(first:50, query:$q){ nodes{ name displayFinancialStatus cancelledAt customer{ id } '
                'totalPriceSet{ shopMoney{ amount } } refunds(first:5){ transactions(first:5){ nodes{ kind status amountSet{ shopMoney{ amount } } } } } } } }',
                {"q": f"created_at:>='{start}'"})
        from erstattung import zurueck
        n = [o["name"] for o in (((d.get("data") or {}).get("orders") or {}).get("nodes") or [])
             if o.get("displayFinancialStatus") in ("PAID", "PARTIALLY_PAID", "PARTIALLY_REFUNDED") and not o.get("cancelledAt")
             and zurueck(o) < float(o["totalPriceSet"]["shopMoney"]["amount"]) - 0.005
             and ((o.get("customer") or {}).get("id") or "") != eigen]
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
    # NACH-STOPP zuerst (Prüfung 20.10.): sonst überdeckt ein «unvollstaendig» die Nach-Stopp-Meldung und «NACH-STOPP: unklar» bekäme den falschen Rat.
    if "SCHREIBT WEITER" in zeile:
        return (f"⭐ {zeile} — jemand schreibt NEU trotz Stopp (dropship/_bewertungen_stopp.txt) Bewertungen nach Judge.me: "
                f"Sitzung auf main stoppen (COWORK-BEFEHL 20.10.); ausblenden entscheidet der Betreiber")
    if "NACH-STOPP: unklar" in zeile:
        return f"⭐ {zeile} — Zeile `AB-ID: <n>` in dropship/_bewertungen_stopp.txt prüfen (fehlt oder zweimal mit verschiedenem Wert)"
    if "unklar" in zeile or "unvollstaendig" in zeile:
        return f"⭐ {zeile} — Judge.me-Zugang (/tmp/judgeme.env) oder API-Deckel pruefen"
    st = re.search(r"NACH-STOPP: (\d+) veroeffentlicht", zeile)
    if st and int(st.group(1)) > 0:
        return (f"⭐ {zeile} — Altbestand aus der Zeit nach dem Stopp noch sichtbar; Betreiber-Entscheid ausstehend "
                f"(ausblenden: automation/judgeme_nach_stopp_ausblenden.py, Trockenlauf zuerst)")
    n = re.match(r"JUDGEME: (\d+) verdaechtig", zeile)
    if n and int(n.group(1)) > 0:
        return f"⭐ {zeile} — dropship/JUDGEME-WACHE.md lesen: ausblenden (PUT curated=spam) oder in _judgeme_freigabe.txt freigeben"
    return None


def such_boosts():
    """Such-Boosts der Shop-Suche (automation/such_boost.py, 12.10.2026). Liest die Ampel-Zeile aus dropship/SUCH-BOOSTS.md;
    meldet Begriffe unter 6/8 Soll-Ware in den ersten 8 der Enter-Suche oder einen Bericht älter als 2 Tage."""
    p = os.path.join(REPO, "dropship", "SUCH-BOOSTS.md")
    try:
        text = open(p, encoding="utf-8").read()
    except OSError:
        return None
    m = re.search(r"\*\*(SUCHSEITE: [^*\n]+)\*\*", text)
    stand = re.search(r"^Stand: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) UTC", text, re.M)
    if not m or not stand:
        return None
    try:
        tage = (datetime.datetime.now(datetime.timezone.utc)
                - datetime.datetime.strptime(stand.group(1), "%Y-%m-%d %H:%M").replace(tzinfo=datetime.timezone.utc)).days
    except Exception:
        tage = 99
    if tage >= 2:
        return f"🔎 Such-Boosts seit {tage} T nicht gemessen — Aufseher-Block SUCH-BOOSTS prüfen"
    n = re.search(r"· (\d+) Begriffe unter 6/8", m.group(1))
    if n and int(n.group(1)) > 0:
        return f"🔎 {m.group(1)} — dropship/SUCH-BOOSTS.md"
    return None


def alter_lieferblock():
    """Alter Lieferblock «Lieferzeit (je nach Land) … 🇺🇸 USA: 12–22 Tage» (13.10.2026). GEMESSEN: der root-Cron des
    Hetzner-Servers startet täglich 04:00 UTC run-api-jobs.sh aus dem toten Klon /opt/luxe/repo (Zweig
    claude/luxestyle-product-CizQ6, Stand 06.09.); dessen delivery_block.mjs schreibt den Block in bis zu 1'000
    Produkte zurück (13.10.: 746, darunter Sirène und Aurora). versand_jenachland repariert ab 04:25, braucht bei
    leerem Eimer aber Stunden. Gemessen wird der ZUSTAND (productsCount, Volltext), nicht die Absicht — die Zeile
    verschwindet erst, wenn die Cron-Zeilen aus sind UND die Reparatur durch ist."""
    try:
        c = gql('{productsCount(query:"status:active AND \\"je nach Land\\""){count precision}}')["data"]["productsCount"]
    except Exception as e:
        return f"LIEFERBLOCK ALT: unklar ({type(e).__name__})"
    if not c["count"]:
        return None
    # 13.10. 07:45 UTC: Cron-Zeilen per Wartungsaktion alt_cron_aus abgeschaltet (Quittung auftraege/erledigt/
    # alt-cron-aus-2026-10-13.json). Ab jetzt sinkt die Zahl nur noch (Reparatur versand_jenachland). Steigt sie nach
    # 04:00 UTC wieder, schreibt ein ANDERER alter Job — dann Zeitpläne lesen (crontab_luxe, dienste_server).
    return (f"📦 LIEFERBLOCK ALT: {c['count']} aktive Produkte zeigen «je nach Land · USA» — Reparatur läuft; "
            "alter Server-Cron seit 13.10. aus. Steigt die Zahl wieder → dropship/ZOMBIE-CRON-2026-10-13.md")


def gsc_tot():
    """Tote Google-Seiten (13.10.2026): tote_landeseiten.py GSC=1 liest den Search-Console-Schnappschuss
    dropship/_gsc_seiten.json. Den kann nur eine Claude-Sitzung erneuern (OpenSEO-Konnektor, tools/gsc_schnappschuss.py).
    Meldet NUR, wenn der Schnappschuss älter als 3 Tage ist — dann ist der GSC-Teil des Wächters blind.
    Auf dem Server still (13.10.2026, Befund IDX-Prüfer): dort startet die Ampel aus der /tmp-Spiegelkopie (REPO «/»), der
    Schnappschuss fehlt immer, und erneuern kann ihn nur eine Claude-Sitzung — wie index_stand()."""
    if AUF_SERVER:
        return None
    p = os.path.join(REPO, "dropship", "_gsc_seiten.json")
    try:
        stand = json.load(open(p, encoding="utf-8"))["stand"]
        alter = (datetime.datetime.utcnow() - datetime.datetime.strptime(stand, "%Y-%m-%dT%H:%MZ")).days
    except Exception:
        return "🔎 GSC-TOT: kein Search-Console-Schnappschuss — Verbesserungsrunde: tools/gsc_schnappschuss.py"
    if alter <= 3:
        return None
    try:
        st = json.load(open(os.path.join(REPO, "dropship", "_gsc_tot_stand.json"), encoding="utf-8"))
        rest = f" · zuletzt {st.get('offen')} offen ({st.get('impr_woche_offen')} Impr./Woche)"
    except Exception:
        rest = ""
    return f"🔎 GSC-TOT: Schnappschuss {alter} T alt — tote Google-Seiten ungeprüft{rest} → tools/gsc_schnappschuss.py"


def index_stand():
    """INDEX (13.10.2026): Index-Messgerät tools/index_probe.py — Search Console inspect_urls für ~36 feste Seiten (Hubs,
    Saison, Suchbegriff-Kollektionen, Top-Produkte, Ratgeber), Mo+Do aus der Verbesserungsrunde (nur dort lesbar, OpenSEO).
    Liest NUR dropship/_index_stand.tsv. Meldet nur, wenn der letzte gültige Lauf älter als 8 Tage ist oder weniger Seiten
    indexiert sind als im vorigen Lauf («INDEX: x/y indexiert · ältester Abruf TT.MM. — ⚠️ …»). Auf dem Server still:
    Search Console ist dort nicht lesbar, die Datei käme nur über git an."""
    if AUF_SERVER:
        return None
    sys.path.insert(0, os.path.join(REPO, "tools"))
    from index_probe import bewerte, lies_stand
    r = bewerte(lies_stand(os.path.join(REPO, "dropship", "_index_stand.tsv")))
    return f"🔎 {r['zeile']}" if r["alarm"] else None


def wearable_seo():
    """WEARABLE-SEO (13.10.2026, SEO-Sofort ON-M1A): Messversprechen (Blutdruck/EKG/Blutzucker) in SEO-Titel/-Beschreibung
    von Wearables. Der Aufseher startet automation/wearable_messversprechen.py täglich, Log /tmp/wearable_mess.log; dessen
    letzte Zeile «WEARABLE-SEO: …» trägt ⚠️ bei offenen Stellen und «unklar», wenn der Export scheitert. Liest nur das Log.
    Still: auf dem Server, ohne Log, ohne Lauf mit SEO-Teil, bei «0 offen»."""
    if AUF_SERVER:
        return None
    try:
        with open("/tmp/wearable_mess.log", encoding="utf-8", errors="ignore") as f:
            z = [l.strip() for l in f if "WEARABLE-SEO:" in l][-1:]
    except Exception:
        return None
    if z and ("⚠️" in z[0] or "unklar" in z[0]):
        return z[0][:200]
    return None


def koll_versprechen(stand="/tmp/koll_versprechen_stand.json", log="/tmp/versprechen_wache.log", jetzt=None):
    """KOLL-VERSPRECHEN (14.10.2026, S3): unbelegte Versprechen in Kollektionstexten. versprechen_wache.py (Aufseher, täglich) schreibt
    den Stand nach /tmp/koll_versprechen_stand.json (koll_stand_schreiben: zeit, pub, unpub, pub_handles, manuell, premium) und die
    Zeile «KOLL-VERSPRECHEN: …» (an der FERTIG-Zeile) nach /tmp/versprechen_wache.log — ohne Stand-Datei gilt die letzte FERTIG-Zeile.
    ⚠️ NUR bei veröffentlichten Kollektionen mit Verstoss (ohne «manuell» = Titel/SEO-Titel, ohne Premium-Hinweis) oder wenn der
    Stand älter als 48 h ist. Liest nur Dateien. Still: auf dem Server, ohne Stand/Log solange das Log jünger als 48 h ist."""
    if AUF_SERVER:
        return None
    jetzt = time.time() if jetzt is None else jetzt
    zeit = pub = None
    handles = []
    try:
        d = json.load(open(stand, encoding="utf-8"))
        zeit = datetime.datetime.strptime(d["zeit"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()
        pub, handles = int(d["pub"]), list(d.get("pub_handles") or [])
    except Exception:
        try:
            with open(log, encoding="utf-8", errors="ignore") as f:
                z = [l for l in f if l.startswith("FERTIG ") and "KOLL-VERSPRECHEN:" in l]
        except OSError:
            z = []
        m = re.match(r"FERTIG (\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ).*?KOLL-VERSPRECHEN: (\d+) veröffentlicht", z[-1]) if z else None
        if m:
            zeit = datetime.datetime.strptime(m.group(1), "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()
            pub = int(m.group(2))
    teile = []
    if zeit is None:
        try:
            log_alter = jetzt - os.path.getmtime(log)
        except OSError:
            log_alter = None
        if log_alter is not None and log_alter <= 48 * 3600:
            return None                     # Wächter läuft, der Kollektionsteil kommt mit dem nächsten Lauf
        return "⚠️ KOLL-VERSPRECHEN: kein Stand seit über 48 h (automation/versprechen_wache.py im Aufseher?)"
    alter_h = (jetzt - zeit) / 3600
    if pub:
        teile.append(f"{pub} veröffentlichte Kollektion{'en' if pub != 1 else ''} mit unbelegtem Versprechen"
                     + (f" ({', '.join(handles[:3])}{' …' if len(handles) > 3 else ''})" if handles else "")
                     + " — dropship/KOLL-VERSPRECHEN.md; Regel R6 (Vorlage) beheben mit automation/kollektion_versprechen_s3.py, "
                     "R9 (Marke ohne aktive Ware) kann S3 NICHT — leer → kollektion_leer.py meldet/heilt, gemischt → Satzpaar in INHALT_PAARE")
    if alter_h > 48:
        teile.append(f"Stand {alter_h:.0f} h alt (Wächter steht?)")
    return ("⚠️ KOLL-VERSPRECHEN: " + " · ".join(teile)) if teile else None


def koll_leer(stand=None, jetzt=None):
    """LEERE-KOLLEKTIONEN (19.10.2026, Spähtrupp koll K1/K3): kollektion_leer.py (Aufseher, 2×/Tag, SCHARF) heilt leere veröffentlichte Kollektionen
    (301 auf gefüllte Nachbarn, dann aus allen Kanälen nehmen) und schreibt dropship/_koll_leer_stand.json. ⚠️ bei Rest > 0, Fehlern, Rückfällen
    (Handle war schon einmal abgemeldet) oder wenn der Stand älter als 30 h ist; ℹ️-Teil «n abgemeldet», solange der Stand jünger als 30 h ist.
    Am 18.10. 18:57 UTC stellte ein unbekannter Schreiber (App «autopilot2») 52 leere Kollektionen in den Onlineshop; das Log meldete es 17 h lang ungelesen.
    Liest nur die Datei. Still auf dem Server."""
    if AUF_SERVER:
        return None
    jetzt = time.time() if jetzt is None else jetzt
    pfad = stand or os.path.join(REPO, "dropship", "_koll_leer_stand.json")
    try:
        d = json.load(open(pfad, encoding="utf-8"))
        zeit = datetime.datetime.strptime(d["stand"], "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=datetime.timezone.utc).timestamp()
    except Exception:
        return "⚠️ LEERE-KOLLEKTIONEN: kein Stand (automation/kollektion_leer.py im Aufseher?)"
    alter_h = (jetzt - zeit) / 3600
    teile = []
    rest = int(d.get("leer_nach_lauf") or 0)
    if rest:
        teile.append(f"{rest} leere Kollektion{'en' if rest != 1 else ''} im Onlineshop"
                     + ("" if d.get("scharf") else " (Stand nur Trockenlauf)") + " — automation/kollektion_leer.py (SCHARF=1) heilt: 301 → abmelden")
    if d.get("fehler"):
        teile.append(f"{len(d['fehler'])} nicht abgemeldet ({', '.join(str(x[0]) for x in d['fehler'][:3])}: {d['fehler'][0][1]})")
    if d.get("wiederholt"):
        teile.append(f"{len(d['wiederholt'])} {'Rückfälle' if len(d['wiederholt']) != 1 else 'Rückfall'} (nach früherer Abmeldung wieder veröffentlicht: "
                     f"{', '.join(d['wiederholt'][:3])}{' …' if len(d['wiederholt']) > 3 else ''}) — Schreiber unbekannt")
    ev = d.get("veroeffentlicht_48h") or {}
    if (d.get("leer_gefunden") or 0) and (ev.get("gesamt") or 0) > 3:
        teile.append(f"{ev['gesamt']} Kollektionen in 48 h veröffentlicht von {ev.get('apps')} (erste {ev.get('von')})")
    if d.get("abgemeldet") and alter_h <= 30:
        teile.append(f"ℹ️ {d['abgemeldet']} leere automatisch abgemeldet (301 gesetzt, Ledger dropship/_tote_colls_entfernt.txt)")
    if alter_h > 30:
        teile.append(f"Stand {alter_h:.0f} h alt (Wächter steht?)")
    return ("⚠️ LEERE-KOLLEKTIONEN: " + " · ".join(teile)) if any(not t.startswith("ℹ️") for t in teile) else (
        ("ℹ️ LEERE-KOLLEKTIONEN: " + " · ".join(t.replace("ℹ️ ", "") for t in teile)) if teile else None)


def texte_angehalten(marke=None, jetzt=None):
    """DÜNNE TEXTE ANGEHALTEN (19.10.2026, Spähtrupp aufseher AUF-6): dropship/_duenne_texte_angehalten stoppt die Schreib-Pipeline (40 Texte/Tag) UND bis heute auch die
    Nachprüfung; die Marke stand seit 12.10. (7 Tage), ohne dass eine Ampelzeile davon sprach. ⚠️ ab 2 Tagen Alter. Liest nur die Datei. Still auf dem Server."""
    if AUF_SERVER:
        return None
    jetzt = time.time() if jetzt is None else jetzt
    pfad = marke or os.path.join(REPO, "dropship", "_duenne_texte_angehalten")
    try:
        alter_t = (jetzt - os.path.getmtime(pfad)) / 86400
        grund = open(pfad, encoding="utf-8").read().strip()[:90]
    except OSError:
        return None
    # Prüfung koll F5: das Setz-Datum steht im Inhalt («2026-10-12T09:30Z — …»); die Dateizeit wird von der täglichen Nachprüfung und von git neu gesetzt
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})Z", grund)
    if m:
        try:
            import calendar
            gesetzt = calendar.timegm(tuple(int(x) for x in m.groups()) + (0, 0, 0))
            alter_t = max(alter_t, (jetzt - gesetzt) / 86400)
        except (ValueError, OverflowError):
            pass
    return (f"⚠️ DÜNNE TEXTE ANGEHALTEN seit {alter_t:.0f} T ({grund}) — Treffer in /tmp/produkttext_duenn_nachpruefen.log, die Nachprüfung löscht die Marke "
            "selbst, sobald es keinen sachlichen Treffer mehr gibt") if alter_t >= 2 else None


def cj_suche_tor():
    """K8 (13.10.2026): Relevanz-Tor der CJ-Suchaufträge (cj_sku_import.mjs --stand: 20 Kanarien, liest nur Dateien, kein
    CJ-/Shopify-Aufruf). Meldet nur rote Kanarien — dann bleibt die Suchqueue zu. Braucht keinen Token (nicht in MIT_TOKEN).
    Still auf dem Server und wenn Node oder das Skript fehlen."""
    node = "/opt/node22/bin/node"
    skript = os.path.join(REPO, "automation", "cj_sku_import.mjs")
    if AUF_SERVER or not os.path.exists(node) or not os.path.exists(skript):
        return None
    try:
        r = subprocess.run([node, skript, "--stand"], cwd=REPO, capture_output=True, text=True, timeout=60)
    except Exception:
        return None
    z = (r.stdout or "").strip().splitlines()
    z = z[-1] if z else ""
    return f"🎯 {z}" if "ROT" in z else None


def waisen_verzeichnis():
    """WAISEN-KOLLEKTIONEN + VERZEICHNIS (13.10.2026, SEO-Sofort ON-M5): Tageslauf im Aufseher (kategorien_verzeichnis.py →
    interne_links.py --waisen). Liest dropship/_waisen_kollektionen.json + dropship/_kategorien_verzeichnis_stand.json.
    Meldet nur Befund oder einen Stand älter als 2 T. Still auf dem Server und wenn die Dateien fehlen."""
    if AUF_SERVER:
        return None
    aus = []
    pw = os.path.join(REPO, "dropship", "_waisen_kollektionen.json")
    if os.path.exists(pw):
        try:
            w = json.load(open(pw, encoding="utf-8"))
            alter = (datetime.datetime.utcnow() - datetime.datetime.strptime(w["stand"], "%Y-%m-%dT%H:%MZ")).days
            if alter >= 2:
                aus.append(f"🔗 WAISEN-KOLLEKTIONEN: Stand {alter} T alt — Aufseher-Block KATEGORIEN-VERZEICHNIS prüfen "
                           "(/tmp/kategorien_verzeichnis.log)")
            elif w.get("waisen"):
                aus.append(f"🔗 WAISEN-KOLLEKTIONEN: {w['waisen']} ("
                           + ", ".join(str(x.get("handle")) for x in (w.get("liste") or [])[:8]) + ")")
        except Exception as e:
            aus.append(f"🔗 WAISEN-KOLLEKTIONEN: unklar ({type(e).__name__})")
    pv = os.path.join(REPO, "dropship", "_kategorien_verzeichnis_stand.json")
    if os.path.exists(pv):
        try:
            v = json.load(open(pv, encoding="utf-8"))
            if (v.get("rueckgang") or 0) > 5 and not v.get("geschrieben"):
                aus.append(f"🔗 VERZEICHNIS: Rückgang {v['rueckgang']} ({v.get('links_alt')} → {v.get('links_neu')}) — nicht geschrieben; "
                           "gewollt? ERZWINGEN=1 python3 automation/kategorien_verzeichnis.py")
        except Exception:
            pass
    return " · ".join(aus) or None


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


# Zugangsdateien, ohne die ein Teil des Betriebs blind ist. Nur NAMEN werden gemeldet, nie Inhalte.
ZUGAENGE = [(TOKPFAD, "Shop-Token (Bestell-Ampel, Waechter, Poster-Pruefung)"),
            ("/tmp/meta_page_token", "Meta-Token (Instagram/Facebook)"),
            ("/tmp/cj_token.json", "CJ-Token (Bestellungen, Zahlung)")]


def zugang_weg():
    """26.09.2026: Nach einem frischen Container (Klon von main, /tmp leer) endete main() still, weil der
    Shop-Token fehlte — die Ampel schwieg genau dann, als Posten, Bestell-Ampel und Waechter blind waren
    (letzter Bildpost 06:10, 12:12 «Kein Shop-Token → No-op»). Fehlender Zugang ist ein Befund, keine Ruhe."""
    weg = [was for pfad, was in ZUGAENGE if not (os.path.exists(pfad) and os.path.getsize(pfad) > 0)]
    if not weg:
        return None
    if AUF_SERVER:
        weg = [w for w in weg if not w.startswith("Meta")]   # Meta-Posting laeuft nur in der Cloud-Sitzung
        if not weg:
            return None
    return ("⛔ ZUGANG WEG: " + ", ".join(weg) +
            " — Secrets als Umgebungsvariablen setzen (SHOPIFY_CLIENT_ID/_SECRET) oder Schluessel im Chat geben")


def ki_guthaben():
    """04.10.2026: Gemini antwortete 402 (seit 21:53), OpenAI «no credits remaining» (seit 20:11) — alles, was auf zwei
    Prüfmodelle baut (Kauderwelsch-, Titel-Bild-, Google-Fein-Wache, Bildtausch, SEO-Faktenprüfung), läuft dann nur über
    Groq (Tageskontingent 200'000 Tokens je Modell, Schlüssel 1+2 teilen eines) oder pausiert. Die Marken setzt zweitmodell.py
    bei jedem 402/insufficient_quota (gültig 6 h, danach wird erneut versucht → verschwindet von selbst nach dem Aufladen)."""
    leer = []
    # 19.10.2026 (Betreiber «openai github haben jetzt mit chat gpt arbeiten leider ohne api»): ChatGPT arbeitet über GitHub, nicht über die API —
    # ein leeres OpenAI-API-Konto ist dann GEWOLLT und kein Aufladegrund. Die Marke dropship/_openai_ohne_api.txt nimmt OpenAI aus dem Ruf; die
    # Zweitprüfer-Wachen laufen weiter über Groq/Gemini (zweitmodell.py setzt /tmp/openai_leer bei jedem 429, ein Versuch je 6 h).
    ohne_api = os.path.exists(os.path.join(REPO, "dropship", "_openai_ohne_api.txt"))
    for name, pfad in (("Gemini", "/tmp/gemini_leer"), ("OpenAI", "/tmp/openai_leer")):
        if name == "OpenAI" and ohne_api:
            continue
        try:
            alter = time.time() - os.path.getmtime(pfad)
        except OSError:
            continue
        if alter < 6 * 3600:
            leer.append(f"{name} seit {time.strftime('%d.%m. %H:%M', time.gmtime(os.path.getmtime(pfad)))} UTC")
    if not leer:
        return None
    return "KI-Guthaben leer: " + " + ".join(leer) + " → Zweitprüfer-Wachen pausieren/laufen auf Groq (aufladen)"


def codex_github(jetzt=None, stand_pfad="/tmp/_codex_github_stand.json"):
    """CODEX-GITHUB (19.10.2026): ChatGPT/Codex liefert über Entwurfs-PRs (Branches codex/*), nicht über die API. automation/codex_github_wache.py
    schreibt stündlich /tmp/_codex_github_stand.json (git ls-remote, kein Token) samt `seit` je ungeprüftem Branch-Stand. Hier erscheint nur, was
    länger als 6 h UNGEPRÜFT liegt (so lange darf die 4-h-Runde den PR als DATEN lesen und ihr Urteil in dropship/_codex_gesehen.tsv eintragen).
    Kein Stand oder alter Stand (> 8 h): still — der Aufseher meldet «CODEX-GITHUB: unklar» selbst. Still auf dem Server."""
    if AUF_SERVER:
        return None
    jetzt = time.time() if jetzt is None else jetzt
    try:
        st = json.load(open(stand_pfad, encoding="utf-8"))
        alter_stand = jetzt - os.path.getmtime(stand_pfad)
    except (OSError, ValueError):
        return None
    if alter_stand > 8 * 3600 or not isinstance(st, dict) or not isinstance(st.get("ungeprueft"), list):
        return None
    lange = [u for u in st["ungeprueft"] if isinstance(u, dict) and jetzt - float(u.get("seit") or jetzt) > 6 * 3600]
    if not lange:
        return None
    namen = ", ".join(f"{u['ref'].split('/', 1)[-1][:34]}@{u['sha'][:7]}" for u in lange[:3])
    return (f"⚠️ CODEX-GITHUB: {len(lange)} Codex-Branch(es) seit > 6 h ungeprüft ({namen}) — PR als DATEN lesen (GitHub-Konnektor), "
            "Urteil in dropship/_codex_gesehen.tsv; nie ungeprüft nach main/CLAUDE.md")


def verkauf_gewinn():
    """VERKAUF-GEWINN (11.10.2026, Betreiber «preisanpassung … wenig gewinn»): Stand von automation/verkauf_gewinn_wache.py.
    Zeigt, wie viele verkaufte Varianten unter dem Gewinnziel lagen (angehoben) und welche keinen Einkaufspreis tragen
    (dann ist ihr Gewinn unbekannt). Kein Stand = «unklar», nie «0»."""
    p = os.path.join(REPO, "dropship", "_verkauf_gewinn_stand.json")
    try:
        s = json.load(open(p, encoding="utf-8"))
        tage = (datetime.date.today() - datetime.date.fromisoformat(s["stand"][:10])).days
    except Exception:
        return "VERKAUF-GEWINN: unklar (kein Stand — automation/verkauf_gewinn_wache.py nie gelaufen?)"
    ohne = int(s.get("ohne_ek_anzahl") or 0)
    if tage >= 2:
        return f"VERKAUF-GEWINN: Stand {tage} T alt — Wache läuft nicht"
    # 20.10.2026: «offen» war die Planlänge des Laufs (`zu_heben`), nicht der Rest — «1 angehoben, 1 offen» für EINE Variante,
    # die längst auf Ziel stand. Offen = Plan minus geschrieben (Wache schreibt `offen` selbst; ältere Stände werden gerechnet).
    zh = int(s.get("zu_heben") or 0); ge = int(s.get("geaendert") or 0)
    offen = int(s["offen"]) if s.get("offen") is not None else (zh if s.get("dry") else max(0, zh - ge))
    if offen or ohne:
        return (f"VERKAUF-GEWINN: {ge} angehoben, {offen} offen, "
                f"{ohne} verkaufte Variante(n) ohne Einkaufspreis (Gewinn unbekannt)")
    return None


def social_sperre():
    """SOCIAL-SPERRE (13.10.2026, Betreiber «cj kostüme ja»): CJ-Halloween-Kostüme/-Partydeko 15.10.–01.11. aus TikTok, FB/IG,
    Pinterest (automation/anlass_social_sperre.py, Aufseher täglich + erster Lauf kurz nach 15.10. 00:00 UTC). Zeile aus dem
    Stand (--ampel), aber nur, wenn etwas zu tun ist: ⚠️ offen > 0, Fenstergrenze überschritten und noch kein scharfer Lauf
    danach (> 1 h), oder im Fenster Stand älter als 30 h. Still auf dem Server (Stand liegt in der Cloud-Sitzung) und ohne Datei."""
    if AUF_SERVER:
        return None
    pfad = os.path.join(REPO, "dropship", "_anlass_social_sperre.json")
    if not os.path.exists(pfad):
        return None
    sys.path.insert(0, os.path.join(REPO, "automation"))
    import anlass_social_sperre as ass
    st = json.load(open(pfad, encoding="utf-8"))
    zeilen = ass.ampel_zeilen(st)
    warn = [z for z in zeilen if z.startswith("⚠️")]
    jetzt = datetime.datetime.now(datetime.timezone.utc)
    for r in ass.regel():
        grenze = ass.zeit(r["ab"]) if jetzt < ass.zeit(r["bis"]) else ass.zeit(r["bis"])
        if ass.faellig(jetzt, pfad) and jetzt >= grenze + datetime.timedelta(hours=1):
            warn.append(f"⚠️ SOCIAL-SPERRE {r['anlass']}: Fenstergrenze {grenze:%d.%m. %H:%M} UTC überschritten, kein scharfer Lauf "
                        f"danach → python3 automation/anlass_social_sperre.py --scharf (Log /tmp/anlass_social_sperre.log)")
        a = (st.get("anlaesse") or {}).get(r["anlass"]) or {}
        try:
            alter = (jetzt - datetime.datetime.strptime(st["stand"], "%Y-%m-%dT%H:%MZ").replace(
                tzinfo=datetime.timezone.utc)).total_seconds()
        except Exception:
            alter = 0
        if a.get("phase") == "im" and alter > 30 * 3600:
            warn.append(f"⚠️ SOCIAL-SPERRE {r['anlass']}: Stand {st.get('stand')} — Tageslauf fehlt (neue Importe ungesperrt)")
    return " · ".join(dict.fromkeys(warn)) or None


def main():
    ohne_token = not os.path.exists(TOKPFAD)
    # Pruefungen, die den Shop-Token brauchen, laufen ohne ihn nicht — alle anderen schon (26.09.).
    MIT_TOKEN = (liechtenstein_gesperrt, klingen_pingpong, grow_zaehler, drafts_ohne_quittung, datei_speicher_voll, video_deckel, alter_lieferblock)
    pruefungen = (bot_puls, waffen_netz, cj_sku_netz, druck_profil_netz, guard_vollpass_netz, cj_nachpruefung_netz, indexnow_netz, theme_marken_netz, merkliste_netz, echte_bewertungen_netz, lux_assistent_netz, kassen_sentinel_netz, shopify_rechnung, bigbuy_ticket, cj_dispute_1017, liechtenstein_gesperrt, klingen_pingpong, verlust_kaufbar, google_feedback, kassen_lieferdatum, werbetest, verkauf_gewinn, kategorie_offen, kollektion_doppel_offen, fortura_bestand_alter, grow_zaehler, metricool_kanaele, social_meta_live, drafts_ohne_quittung, fortura_zugang, azure_stimme, datei_speicher_voll, video_deckel, tiktok_queue_alt, ki_textstufe, ki_guthaben, codex_github, server_waechter, judgeme_verdacht, iban_grep, startseiten_optik, startseiten_gewicht, such_boosts, alter_lieferblock, social_sperre, gsc_tot, index_stand, wearable_seo, koll_versprechen, koll_leer, texte_angehalten, cj_suche_tor, waisen_verzeichnis)
    teile = [zugang_weg()]
    for f in pruefungen:
        if ohne_token and f in MIT_TOKEN:
            continue
        try:
            teile.append(f())
        except Exception as e:           # eine kaputte Pruefung darf die Ampel nicht zum Schweigen bringen
            teile.append(f"{f.__name__}: unklar ({type(e).__name__})")
    teile = [t for t in teile if t]
    rest = offene_punkte()
    if not teile and not rest:
        return
    if rest:
        teile.append(f"{rest} Punkte in COWORK-AUFTRAEGE.md")
    print("BRAUCHT DICH: " + " · ".join(teile))


if __name__ == "__main__":
    main()
