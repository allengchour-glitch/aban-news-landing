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
import json, os, re, subprocess, sys, urllib.request, datetime

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOP = "au3j0y-hq.myshopify.com"
TOKPFAD = "/tmp/cj_shop_token.txt"
QUEUE_CDN = ("https://cdn.shopify.com/s/files/1/0943/6856/3585/files/"
             "tiktok_queue.json")


def gql(q, v=None):
    tok = open(TOKPFAD).read().strip()
    req = urllib.request.Request(
        f"https://{SHOP}/admin/api/2024-10/graphql.json",
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


def cj_dispute_1017():
    """CJ-Rueckerstattung fuer die zurueckgesandte Messer-Bestellung (16.09.2026).

    Gleiches Muster wie bigbuy_ticket(): die Erinnerung haengt an der Quittung, die
    der naechste Schritt ohnehin erzeugt, und verschwindet, sobald eine Fallnummer
    darin steht. Ein Auftragsdokument liest nur, wer danach fragt — eine Zeile in
    der stuendlichen Ampel sieht man.
    """
    quittung = os.path.join(REPO, "dropship", "_cj_dispute_1017_ref.txt")
    if os.path.exists(quittung) and open(quittung, encoding="utf-8").read().strip():
        return None
    return ("🔪 CJ-Rueckerstattung USD 25.54 offen (Auftrag DP2609071450210661800, Messer "
            "zurueckgesandt) — CJ hat am 17.09. 07:21 geantwortet, aber auf die ALTE Anfrage vom "
            "09.09. und mit der falschen Aussage, beide Pakete seien unterwegs. Korrektur "
            "mit Messung ist am 17.09. 07:35 raus (Gmail-Thread 1a066a03bf2c8dd2). "
            "disputes/create gibt weiterhin 9009, disputeId ist leer — der API-Weg bleibt "
            "zu. Ohne Antwort binnen 48 h: Dispute in der KONSOLE oeffnen, Grund 6 "
            "'Product Returned'. Fallnummer oder Gutschrift nach "
            "dropship/_cj_dispute_1017_ref.txt · Text: COWORK-BEFEHL.md Punkt 0")


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
    teile = [t for t in (shopify_rechnung(), bigbuy_ticket(), cj_dispute_1017(), datei_speicher_voll(), video_deckel(), tiktok_queue_alt(), ki_textstufe()) if t]
    rest = offene_punkte()
    if not teile and not rest:
        return
    if rest:
        teile.append(f"{rest} Punkte in COWORK-AUFTRAEGE.md")
    print("BRAUCHT DICH: " + " · ".join(teile))


if __name__ == "__main__":
    main()
