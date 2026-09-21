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

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
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
    """Der PC-Poster liest die Queue vom CDN. Steht sie still, postet er alten Stand.

    ⚠️ NICHT am HTTP-Kopf messen: Shopifys CDN setzt `last-modified` auf den Zeitpunkt, zu dem
    der EDGE die Datei geholt hat — gemessen stand dort «jetzt» fuer eine Datei vom 31.08.
    Ein Zeitstempel des Zustellers ist kein Alter des Inhalts. Das Alter steht IM Inhalt
    (Feld `stand`), das schreibt tiktok_cowork_auftrag.py bei jedem Lauf.
    """
    try:
        roh = subprocess.run(
            ["curl", "-s", "--max-time", "20", QUEUE_CDN + "?v=ampel"],
            capture_output=True, text=True, timeout=30).stdout
        stand = (json.loads(roh) or {}).get("stand")
        tag = datetime.date.fromisoformat(stand)
    except Exception:
        return None                      # kein Befund aus einer kaputten Abfrage
    tage = (datetime.date.today() - tag).days
    return f"TikTok-Queue {tage} Tage alt" if tage >= 3 else None


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
    if os.path.exists("/tmp/fortura_env.sh"):
        return ""
    return ("🔑 FORTURA-ZUGANG WEG (/tmp/fortura_env.sh fehlt nach Container-Neustart) — "
            "ohne ihn laedt der Artikel-Feed nicht und der Bild-Nachschub steht still. "
            "Zugangsdaten neu in die Sitzung geben; Dauerloesung: FORTURA_FTP_USER und "
            "FORTURA_FTP_PW als Umgebungsvariablen in den Claude-Einstellungen "
            "(Kundennr. 544341, webtransfer.fortura.ch)")


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
    """13 sichtbare Zusagen nennen Liechtenstein — der LI-Korb bleibt leer. Selbstklaerend.

    GEMESSEN 19.09.2026:
      · Markt «Switzerland» (gid://shopify/Market/99383214465) fuehrt regions = [CH].
      · cartCreate @inContext(country: LI) → 0 Versandoptionen, Warenkorb-Total 0.00,
        waehrend der CH-Kanarienvogel im selben Lauf 2 Optionen bekommt (tools/testkorb_ausland.py).
      · Sichtbar versprochen wird LI an 13 Stellen: 7 veroeffentlichte Seiten und
        6× in den Rechtstexten, die Shopify IM CHECKOUT verlinkt
        (SHIPPING_POLICY 4×, REFUND_POLICY 1×, TERMS_OF_SERVICE 1×). Wortlaut der
        Versandbedingungen: «Wir liefern ausschliesslich in die Schweiz und nach Liechtenstein.»
      · CJ liefert nach LI (4 Optionen ab USD 14.16, 20–60 Tage) — die Zusage ist also
        machbar, nur nicht eingeschaltet.

    ⚠️ Diese Wache prueft den ZUSTAND, nicht eine Quittung. Sobald LI im Markt steht,
    verschwindet die Zeile von selbst — niemand muss etwas abhaken. Eine Quittungsdatei
    haette dieselbe Schwaeche wie jede Behauptung: sie kann gesetzt sein, ohne dass es stimmt.
    """
    try:
        d = gql('{ markets(first:10){ nodes{ id regions(first:50){ nodes{ '
                '... on MarketRegionCountry { code } } } } } }')
        knoten = ((d.get("data") or {}).get("markets") or {}).get("nodes") or []
    except Exception:
        return None                      # kein Befund aus einer kaputten Abfrage
    if not knoten:
        return None                      # nichts gemessen heisst nicht «alles gut»
    laender = {r.get("code") for m in knoten for r in (m.get("regions") or {}).get("nodes") or []}
    if "LI" in laender:
        return None                      # eingeschaltet → Zeile faellt weg
    return ("🇱🇮 Liechtenstein ist an 13 sichtbaren Stellen zugesagt (davon 6× in den "
            "Rechtstexten im Checkout) — kann aber NICHT bestellen: LI-Korb 0 Versandoptionen. "
            "Entweder einschalten (Markt + Zone «Domestic», 2 Minuten) oder LI aus den Texten "
            "streichen. Anleitung: COWORK-BEFEHL.md Punkt 5")


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


def main():
    if not os.path.exists(TOKPFAD):
        return
    teile = [t for t in (bot_puls(), shopify_rechnung(), bigbuy_ticket(), cj_dispute_1017(), liechtenstein_gesperrt(), fortura_zugang(), datei_speicher_voll(), video_deckel(), tiktok_queue_alt(), ki_textstufe(), server_waechter()) if t]
    rest = offene_punkte()
    if not teile and not rest:
        return
    if rest:
        teile.append(f"{rest} Punkte in COWORK-AUFTRAEGE.md")
    print("BRAUCHT DICH: " + " · ".join(teile))


if __name__ == "__main__":
    main()
