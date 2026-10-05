#!/usr/bin/env python3
"""zusagen_abgleich.py — Zusagen auf Service-Seiten, in den Policies und im Produkttext-Standardblock
an die Richtlinien angleichen (04./05.10.2026, Betreiber «fix 12 h lang alles», Bereich Vertrauen & Recht).

WAHRHEIT = die shopPolicies (Rückgabe, Versand, AGB), gemessen 05.10.2026 01:25 UTC:
  Rückgabe   30 Tage freiwillig, unbenutzt/originalverpackt, Rücksendung zahlt die Kundin (bei Mangel wir),
             Erstattung innert 14 Tagen nach Eingang, Ausnahmen Hygiene/personalisiert, Mangel innert 7 Tagen melden.
  Versand    nur Schweiz, gratis ab CHF 50 (sonst CHF 7.00), CH-Lager 1–2 WT · EU-Lager 2–7 · Druck 7–14 ·
             Direktversand 10–20 WT, Richtwerte (keine garantierten Termine).
  Zahlung    Visa, Mastercard, TWINT, PayPal, Klarna, Apple Pay, Google Pay.
  Garantie   gesetzliche Gewährleistung OR 197 ff., KEINE Geld-zurück-Garantie, KEIN «keine Fragen».
  Service    Antwort in der Regel innert 24 h an Werktagen (kontakt-support: bewusst keine Telefon-Hotline).

BEFUND (Zahlen im Bericht dropship/VERTRAUEN-RECHT-ZUSAGEN-2026-10-04.md):
  Produkte   106 Produkttexte (14 aktiv) tragen den Block «Schweizer Versprechen» mit
             «30 Tage Geld-zurück-Garantie · Keine Fragen · volle Rückerstattung», 85 davon «Versand aus Belp ·
             7–12 Werktage» (Belp ist die Impressum-Adresse, kein Lager; 0 davon ch-lager), 106× «7 Tage die Woche».
  Seiten     23 veröffentlichte Seiten mit Widersprüchen (Geld-zurück, «gesetzlich 14», Garantie bei
             Allergie, 7-14 business days, WhatsApp/Telefon, AMEX/Vorkasse, POD 10-20, «Maximum-Zeiten»,
             «In der Schweiz gedruckt», EU-Widerruf, «aus der Schweiz» im H1 bei nicht-schweizer Ware …).
  Policies   AGB §7 «Für EU-Kund:innen gilt zusätzlich das gesetzliche 14-tägige Widerrufsrecht» — der Shop hat
             einen Markt (CH); die Versandrichtlinie schliesst EU aus.

REGELN: Jede Ersetzung ist eine EXAKTE Zeichenkette und muss genau so oft treffen wie erwartet (Standard 1×),
sonst wird an dieser Seite NICHTS geschrieben (Lehre 08.09.: ein <strong> mitten in der Phrase macht blind —
lieber melden als halb reparieren). Quittung nur nach Rücklesen. Ledger der Altwerte in
dropship/_zusagen_abgleich_seiten.tsv / _policies.tsv / _produkte.tsv (nur die ersetzten Schnipsel; Voll-
Backups der Seiten liegen im Scratchpad, nicht im Repo — Lehre 04.10., Token-Platzhalter).

Nutzung:   python3 automation/zusagen_abgleich.py                 (NUR=messen: Zähl-Zeile, schreibt nichts)
           NUR=seiten|policies|produkte python3 …                 (trocken: zeigt Treffer je Regel)
           SCHARF=1 NUR=produkte python3 …                        (schreibt; idempotent, täglich tauglich)
Produkte-Modus hält /tmp/lock_produkttext.lock NICHT selbst — der Aufseher gibt es (flock -w 240).
"""
import json, os, re, sys, time, html

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaufwille_zeile import gql  # noqa: E402
try:
    from eimer_etikette import nachlauf
except Exception:  # pragma: no cover
    def nachlauf(d): return 0.0

SCHARF = os.environ.get("SCHARF") == "1"
NUR = os.environ.get("NUR", "messen")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LEDGER = os.path.join(REPO, "dropship", "_zusagen_abgleich_%s.tsv")
SCRATCH = os.environ.get("SCRATCH", "/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad")
STAMP = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
SERVICE_DE = "Antwort in der Regel innert 24 Stunden an Werktagen"


def ledger(art, zeile):
    p = LEDGER % art
    neu = not os.path.exists(p)
    with open(p, "a", encoding="utf-8") as f:
        if neu:
            f.write("zeit\tid\thandle\talt\tneu\n")
        f.write("\t".join([STAMP] + [str(x).replace("\t", " ").replace("\n", "\\n") for x in zeile]) + "\n")


def backup(name, body):
    os.makedirs(os.path.join(SCRATCH, "zusagen_backup"), exist_ok=True)
    with open(os.path.join(SCRATCH, "zusagen_backup", name + ".html"), "w", encoding="utf-8") as f:
        f.write(body or "")


def ersetze(body, regeln, wer):
    """regeln: Liste (alt, neu[, erwartet]). Gibt (neu_body, ok, protokoll). ok=False → nichts schreiben."""
    neu = body; ok = True; prot = []
    for r in regeln:
        alt, nn = r[0], r[1]; erw = r[2] if len(r) > 2 else 1
        c = body.count(alt)
        # schon erledigt: Alt fehlt und Neu steht (oder Alt war zu löschen) → kein Fehler, nichts tun
        erledigt = c == 0 and (nn == "" or nn in body)
        prot.append(f"    {'✔ schon' if erledigt else ('✔' if c == erw else '⛔')} {c}× (erwartet {erw}) «{html.unescape(re.sub('<[^>]+>', '', alt))[:70]}»")
        if erledigt:
            continue
        if c != erw:
            ok = False
        else:
            neu = neu.replace(alt, nn)
    return neu, ok, prot


# ───────────────────────────── SEITEN ─────────────────────────────
# (alt, neu[, erwartete Anzahl]); 'titel' = neuer Seitentitel (page.title), optional.
SEITEN = {
 'garantie': {'body': [
   ("in den meisten Fällen musst du den Artikel nicht einmal zurückschicken",
    "ob der Artikel zurück muss, sagen wir dir in unserer Antwort")]},
 'warum-luxestyle': {'body': [
   ("<li>30 Tage Geld-zurück</li>", "<li>30 Tage Rückgaberecht</li>"),
   ('>Garantie</td>\n<td style="padding:10px;border-bottom:1px solid #e5e7eb">30 Tage Geld-zurück</td>',
    '>Rückgabe</td>\n<td style="padding:10px;border-bottom:1px solid #e5e7eb">30 Tage Rückgaberecht</td>'),
   ("Email, WhatsApp, Telefon — alles auf Deutsch. Innerhalb 24h Antwort.",
    "Per E-Mail, alles auf Deutsch. " + SERVICE_DE + "."),
   ("11 PREMIUM Produkte sorgfältig getestet und ehrlich beschrieben. Qualität über Quantität.",
    "Angaben, Bilder, Preise und Lieferzeiten werden laufend geprüft und ehrlich beschrieben — was Kundinnen zurückmelden, fliesst direkt ein."),
   ("Stöber durch unsere 11 handverlesenen Produkte:", "Stöber durch unsere Empfehlungen:")]},
 'schweizer-vs-deutsche-marken': {'body': [
   ("<li>✅ Kürzere Lieferketten</li>\n", ""),
   ("<li>🎁 Premium-Geschenkbox bei JEDER Bestellung</li>\n", ""),
   ("<li>🛡️ 30 Tage Garantie (gesetzlich 14)</li>",
    "<li>🛡️ 30 Tage Rückgaberecht — freiwillig; ein gesetzliches Widerrufsrecht gibt es in der Schweiz nicht</li>"),
   ("Großmengen", "Grossmengen")]},
 'schmuck-pflege-edelstahl': {'body': [
   ("Falls trotzdem Reaktion: zurückschicken bei LuxeStyle, 30 Tage Garantie.",
    'Falls trotzdem eine Reaktion auftritt: Melde dich bei uns — wir schauen jeden Fall einzeln an (<a href="/pages/garantie">Garantie &amp; Rückgabe</a>).')]},
 'zahlungsmethoden': {'body': [
   ("(Visa, Mastercard, AMEX)", "(Visa, Mastercard)"),
   ("<li>🏦 <strong>Vorkasse / Banküberweisung</strong>\n</li>\n", ""),
   ("14 Tage Zahlungsziel ohne Zinsen.", "Zahlungsziel und Bedingungen zeigt dir Klarna im Checkout."),
   ("Antwort innerhalb 24h", SERVICE_DE)]},
 'versand-lieferung': {'body': [
   ("<li>📦 <strong>Bestell- / Print-on-Demand- &amp; Übersee-Artikel:</strong> 10-20 Werktage</li>",
    "<li>🖨️ <strong>Druck auf Bestellung (Selbst gestalten):</strong> 7–14 Werktage</li>\n<li>📦 <strong>Direktversand ab Lieferantenlager:</strong> 10–20 Werktage</li>"),
   ("Angegeben sind Maximum-Zeiten inklusive Bearbeitung und Transit. Tatsächliche Zeiten sind oft kürzer.",
    "Richtwerte inklusive Bearbeitung und Transit, keine garantierten Zustelltermine — im Einzelfall (Zoll, Feiertage, hohe Nachfrage) kann es länger dauern; dann melden wir uns per E-Mail.")]},
 'tracking': {'body': [
   ("<strong>7–14 Werktage</strong>, einzelne Artikel aus Übersee 20–30 Werktage — steht am Produkt</li>",
    "<strong>7–14 Werktage</strong></li>")]},
 'designs-galerie': {'body': [
   ("🇨🇭 In der Schweiz gedruckt · ab CHF 8", "🇨🇭 Schweizer Shop · in Europa gedruckt · ab CHF 8")]},
 'ueber-uns': {'body': [("keine Lügen, Länder-spezifisch", "keine Lügen, je Artikel")]},
 'refund-policy-en': {'body': [
   ('<h2>EU Right of Withdrawal</h2><div class="legal"><p>EU customers also have the 14-day statutory right of withdrawal. See our <a href="/pages/widerrufsbelehrung">Withdrawal Instructions</a>.</p></div>', ""),
   ('<div class="highlight">🇨🇭 30-Day Money-Back Guarantee — No Questions Asked</div>',
    '<div class="highlight">🇨🇭 30-Day Return Policy — unused items, within 30 days of delivery</div>')]},
 'about-us-en': {'body': [
   ("<h4>🛡️ Swiss Guarantee</h4>\n<p>30-day money-back. Period. Doesn't work — we'll fix it.</p>",
    "<h4>🛡️ 30-Day Returns</h4>\n<p>Return unused items within 30 days. Doesn't work — we'll fix it.</p>"),
   ("Direct from manufacturer. 7-14 business day shipping. Great prices.",
    "Direct from the supplier's warehouse. 10–20 business days shipping (1–2 from our Swiss warehouse). Great prices."),
   ("<h2>Why 7-14 Business Days Shipping?</h2>", "<h2>Why 10–20 Business Days Shipping?</h2>"),
   ("I'm upfront: <strong>7-14 business days</strong>.",
    "I'm upfront: <strong>10–20 business days</strong> for direct shipping, 1–2 from our Swiss warehouse — the exact figure is on every product page."),
   ("Doesn't work? Send it back. Money back. No questions asked.",
    "Doesn't work? Tell us within 7 days with a photo — replacement or refund, your choice. Unused items can be returned within 30 days."),
   ("Available via WhatsApp, phone, email. Responses within 24h.",
    "Available via email. Responses usually within 24h on business days.")]},
 'why-luxestyle-en': {'body': [
   ("<h3>2. 30-Day Money-Back — Unconditional</h3>\n<p>Don't like it? Doesn't work? Send it back. We refund. No complicated forms.</p>",
    "<h3>2. 30-Day Returns</h3>\n<p>Don't like it? Send it back unused, we refund. No complicated forms. Exceptions (personalised items, opened hygiene products) are listed in our refund policy.</p>"),
   ("<p>7-14 business days — honestly. No 'shipping in 2 days' lies. Direct from manufacturer for great prices.</p>",
    "<p>10–20 business days for direct shipping, 1–2 from our Swiss warehouse — honestly. No 'shipping in 2 days' lies. The exact figure is on every product page.</p>"),
   (">7-14 business days</td>", ">10–20 business days (1–2 from Swiss warehouse)</td>"),
   (">Guarantee</td>", ">Returns</td>"),
   (">30-day money-back</td>", ">30-day returns</td>"),
   ("Email, WhatsApp, phone — all responses within 24h.", "Email — responses usually within 24h on business days."),
   ("11 PREMIUM products carefully tested and honestly described. Quality over quantity.",
    "Listings, images, prices and delivery times are checked continuously and described honestly.")]},
 'a-propos-fr': {'body': [
   ('<h4 style="color:#10b981">🛡️ Garantie 30 Jours</h4>\n<p>Pas satisfait? Argent remboursé. Sans discussion.</p>',
    '<h4 style="color:#10b981">🛡️ Retours sous 30 jours</h4>\n<p>Pas satisfait? Retourne l\'article non utilisé, nous remboursons. Les exceptions figurent dans notre politique de retour.</p>'),
   ("Expédition 7-14 jours ouvrés.", "Livraison 10–20 jours ouvrés en expédition directe, 1–2 jours depuis notre stock suisse."),
   ("Email, WhatsApp, téléphone — réponses sous 24h.", "Email — réponses en général sous 24h les jours ouvrables.")]},
 'chi-siamo-it': {'body': [
   ("Garanzia 30 Giorni", "Reso entro 30 giorni"),
   ("Non ti piace? Rimborso totale.", "Non ti piace? Restituisci l'articolo non usato, rimborsiamo. Le eccezioni sono nella politica di reso."),
   ("Spedizione 7-14 giorni lavorativi.", "Consegna 10–20 giorni lavorativi in spedizione diretta, 1–2 giorni dal nostro magazzino svizzero."),
   ("Email, WhatsApp, telefono — risposta entro 24h.", "Email — risposta di norma entro 24h nei giorni lavorativi.")]},
 'personalisierte-geschenke-fuer-sie': {'body': [("Ja. Sie haben 30 Tage Rückgaberecht.", "Ja. Du hast 30 Tage Rückgaberecht.")]},
 'herren-mode-fuer-ihn': {'body': [("Bezahlen Sie bequem mit", "Bezahle bequem mit")]},
 'geburtsstein-schmuck-bedeutung': {'body': [("Rechnst du mit einer Lieferzeit", "Rechne mit einer Lieferzeit")]},
 'schmuck-personalisiert-schweiz': {'body': [("Schmuck-Geschenke aus der Schweiz</h2>", "Schmuck-Geschenke für die Schweiz</h2>")],
                                    'titel': ("Personalisierter Schmuck & Schmuck-Geschenke aus der Schweiz", "Personalisierter Schmuck & Schmuck-Geschenke für die Schweiz")},
 'wasserfeste-goldkette-damen': {'body': [("Edelstahlschmuck aus der Schweiz</h2>", "Edelstahlschmuck für die Schweiz</h2>")]},
 'geschenke': {'body': [("Geschenkideen aus der Schweiz</h2>", "Geschenkideen für die Schweiz</h2>")],
               'titel': ("Geschenke & personalisierte Geschenkideen aus der Schweiz", "Geschenke & personalisierte Geschenkideen für die Schweiz")},
 'weihnachtsgeschenke-last-minute': {'body': [
   ("<li>🚚 <code>SHIP50</code> — Gratis Versand ab CHF 50</li>", "<li>🚚 Gratis Versand ab CHF 50 — automatisch, ohne Code</li>")]},
}


def seiten():
    print(f"== SEITEN ({'SCHARF' if SCHARF else 'trocken'}) — {len(SEITEN)} Seiten")
    ok_n = 0; sk = 0
    for h, reg in SEITEN.items():
        d = gql('query($q:String){pages(first:2,query:$q){nodes{id handle title isPublished body}}}', {"q": f"handle:{h}"})
        n = [x for x in d['pages']['nodes'] if x['handle'] == h]
        if not n:
            print(f"⛔ {h}: nicht gefunden"); sk += 1; continue
        p = n[0]
        neu, ok, prot = ersetze(p['body'], reg['body'], h)
        t_alt, t_neu = reg.get('titel', (None, None))
        t_ok = True
        if t_alt is not None:
            t_ok = (p['title'] == t_alt) or (p['title'] == t_neu)
            prot.append(f"    {'✔' if t_ok else '⛔'} Titel «{p['title'][:60]}» → «{t_neu[:60]}»")
        schon = all(p['body'].count(r[0]) == 0 for r in reg['body']) and (t_alt is None or p['title'] == t_neu)
        print(f"{'✅' if ok and t_ok else '⚠️'} {h} ({'veröffentlicht' if p['isPublished'] else 'ENTWURF'}){' — schon erledigt' if schon else ''}")
        for z in prot: print(z)
        if schon or not (ok and t_ok):
            if not schon: sk += 1
            continue
        if not SCHARF:
            continue
        backup("page_" + h, p['body'])
        inp = {"body": neu}
        if t_alt is not None and p['title'] == t_alt:
            inp["title"] = t_neu
        r = gql('mutation($id:ID!,$p:PageUpdateInput!){pageUpdate(id:$id,page:$p){page{id title body} userErrors{message}}}', {"id": p['id'], "p": inp})
        pu = r['pageUpdate']
        if pu['userErrors']:
            print("    ⛔ FEHLER:", pu['userErrors']); sk += 1; continue
        live = pu['page']['body']
        rest = [r0[0] for r0 in reg['body'] if r0[0] in live and r0[1] != r0[0]]
        if rest:
            print("    ⛔ Rücklesen: alte Phrase noch da:", rest[:1]); sk += 1; continue
        for r0 in reg['body']:
            ledger("seiten", [p['id'].split('/')[-1], h, r0[0], r0[1]])
        if t_alt is not None and "title" in inp:
            ledger("seiten", [p['id'].split('/')[-1], h, "TITEL: " + t_alt, "TITEL: " + t_neu])
        ok_n += 1; print("    ✔ geschrieben + rückgelesen")
        time.sleep(1.0)
    print(f"SEITEN: {ok_n} geschrieben, {sk} übersprungen/Fehler")


# ───────────────────────────── POLICIES ─────────────────────────────
POLICIES = {
 'TERMS_OF_SERVICE': [
   (" Für EU-Kund:innen gilt zusätzlich das gesetzliche 14-tägige Widerrufsrecht.", ""),
   ("<strong>Stand: 18. Mai 2026</strong>", "<strong>Stand: 5. Oktober 2026</strong>")],
}


def policies():
    print(f"== POLICIES ({'SCHARF' if SCHARF else 'trocken'})")
    d = gql('{shop{shopPolicies{type body}}}')['shop']['shopPolicies']
    for p in d:
        reg = POLICIES.get(p['type'])
        if not reg: continue
        neu, ok, prot = ersetze(p['body'], reg, p['type'])
        schon = all(p['body'].count(r[0]) == 0 for r in reg)
        print(f"{'✅' if ok else '⚠️'} {p['type']}{' — schon erledigt' if schon else ''}")
        for z in prot: print(z)
        if schon or not ok or not SCHARF: continue
        backup("policy_" + p['type'], p['body'])
        r = gql('mutation($p:ShopPolicyInput!){shopPolicyUpdate(shopPolicy:$p){shopPolicy{id body} userErrors{message}}}', {"p": {"type": p['type'], "body": neu}})
        pu = r['shopPolicyUpdate']
        if pu['userErrors']:
            print("    ⛔ FEHLER:", pu['userErrors']); continue
        live = pu['shopPolicy']['body']
        if any(r0[0] in live for r0 in reg):
            print("    ⛔ Rücklesen: alte Phrase noch da"); continue
        for r0 in reg: ledger("policies", [pu['shopPolicy']['id'].split('/')[-1], p['type'], r0[0], r0[1]])
        print("    ✔ geschrieben + rückgelesen")


# ───────────────────────────── PRODUKTE ─────────────────────────────
NEU_RUECK = ('<strong>30 Tage Rückgaberecht</strong><br><small>Unbenutzt &amp; originalverpackt zurück · Erstattung innert 14 Tagen · '
             'Rücksendung zahlst du, bei Mangel wir</small>')
NEU_SERVICE = 'Schweizer Shop · Support auf Deutsch &amp; Englisch · Antwort innert 24 h an Werktagen'
PROD_REGELN = [  # (alt, neu) — jede darf 0..n× treffen; mindestens EINE muss treffen, sonst kein Schreiben
 ('<strong>30 Tage Geld-zurück-Garantie</strong><br><small>Keine Fragen · volle Rückerstattung · einfacher Retoure-Prozess</small>', NEU_RUECK),
 ('<strong>30 Tage Rückgabe</strong><br><small>Keine Fragen · volle Rückerstattung · einfacher Retoure-Prozess</small>', NEU_RUECK),
 ('Schweizer Brand · DE/EN-Support · 7 Tage die Woche', NEU_SERVICE),
 ('30 Tage Geld-zurück-Garantie, ohne Wenn und Aber.', '30 Tage Rückgaberecht, Details in der Rückgaberichtlinie.'),
 ('unkomplizierter 30-Tage-Geld-zurück-Garantie', 'unkompliziertem 30-Tage-Rückgaberecht'),
 ('30-Tage-Geld-zurück-Garantie', '30-Tage-Rückgaberecht'),
 ('30 Tage Geld-zurück-Garantie', '30 Tage Rückgaberecht'),
 ('30 Tage Geld-zurück', '30 Tage Rückgaberecht'),
 # «Anlauf-Garantie … oder Geld zurück» (9 Schmuckstücke, 7 aktiv): eine eigene Garantie, die die Garantieseite
 # ausschliesst («Eine separate Herstellergarantie gibt es bei Dropship-Ware nicht») → Zusage auf das Nachlesbare
 ('💧 Anlauf-Garantie – läuft nicht an oder Geld zurück', '💧 Anlauffrei – läuft es trotzdem an, melde dich, wir schauen jeden Fall einzeln an'),
 ('Wir geben die Anlauf-Garantie: läuft sie an, bekommst du dein Geld zurück.', 'Läuft sie trotzdem an, melde dich bei uns — wir schauen jeden Fall einzeln an.'),
 ('Schwitzen kein Problem – sonst Geld zurück.', 'Schwitzen kein Problem – läuft es trotzdem an, melde dich bei uns.'),
 ('30 Tage Rückgabe – ohne Risiko, Geld zurück.', '30 Tage Rückgabe – unbenutzt und originalverpackt.'),
 ('30 Tage Rückgabe – oder Geld zurück', '30 Tage Rückgabe'),
 # Fliesstext-Varianten derselben Alt-Importe (gemessen 05.10. an 8 Stichproben)
 ('<strong>Versand aus Belp:</strong> mit Tracking, damit', '<strong>Versand mit Tracking:</strong> damit'),
 ('Versand aus Belp mit Tracking', 'Versand mit Tracking'),
 ('DE/EN-Support, 7 Tage die Woche', 'DE/EN-Support, Antwort innert 24 h an Werktagen'),
 # Zoll-Zusage: die FAQ sagt, ab ~CHF 60 Warenwert können im Direktversand Einfuhrsteuer + Verzollungsgebühr
 # des Zustellers anfallen — «Endpreis» verspricht das Gegenteil.
 ('Faire Preise ohne Zoll-Überraschungen', 'Faire Preise ohne versteckte Aufschläge'),
 ('<strong>Endpreis ist Endpreis</strong> – keine versteckten Zoll-Überraschungen an der Grenze.',
  '<strong>Transparente Preise</strong> – Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ.'),
 ('Versand aus Belp mit Tracking, keine Zoll-Überraschungen', 'Versand mit Tracking; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ'),
 ('Versand mit Tracking, keine Zoll-Überraschungen', 'Versand mit Tracking; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ'),
 (' – der Endpreis bleibt der Endpreis.', '; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ.'),
 (': Was du siehst, ist der Endpreis.', '; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ.'),
 ('mit DE/EN-Support 7 Tage die Woche', 'mit DE/EN-Support, Antwort innert 24 h an Werktagen'),
 (': Der angezeigte Preis ist der Endpreis.', '; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ.'),
 (' – der angezeigte Preis ist der Endpreis.', '; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ.'),
 (' – der angezeigte Preis ist der Endpreis', '; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ'),
 (' – der Endpreis ist der Endpreis', '; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ'),
 ('Faire Preise und ein transparenter Endpreis ohne versteckte Zusatzkosten.', 'Faire Preise; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ.'),
 ('Faire Preise und transparente Endpreise – keine versteckten Aufschlaege.', 'Faire Preise ohne versteckte Aufschlaege; Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ.'),
]
ZOLL_RE = [  # wenige Entwurfs-Varianten mit freiem Satzende — nur innerhalb eines <li>, DRY zeigt den Treffer
 (re.compile(r'Endpreis ist Endpreis – keine versteckten Zoll[^<]*'), 'Transparente Preise – Hinweise zu Einfuhrsteuer bei Direktversand stehen in den FAQ'),
]
BELP = 'Versand aus Belp · 7–12 Werktage'
SUCHEN = ['"Keine Fragen"', '"Geld-zurück"', '"Versand aus Belp"', '"7 Tage die Woche"', '"Zoll-Überraschungen"', '"Endpreis"', '"Geld zurück"', '"Anlauf-Garantie"']
RESTWORTE = re.compile(r'Keine Fragen|Geld[- ]zur[üu]ck|Anlauf-Garantie|Versand aus Belp|7 Tage die Woche|Zoll-Überraschung|Endpreis')


def produkte():
    cap = int(os.environ.get("CAP", "300"))
    print(f"== PRODUKTE ({'SCHARF' if SCHARF else 'trocken'}, CAP {cap})")
    kand = {}
    for q in SUCHEN:
        c = None
        while True:
            r = gql('query($q:String,$c:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id handle status tags descriptionHtml}}}', {"q": q, "c": c})['products']
            for p in r['nodes']: kand[p['id']] = p
            if not r['pageInfo']['hasNextPage']: break
            c = r['pageInfo']['endCursor']
    print(f"Kandidaten (Suche {', '.join(SUCHEN)}): {len(kand)} · aktiv {sum(p['status']=='ACTIVE' for p in kand.values())}")
    n_w = 0; n_rest = 0; n_treffer = 0; unbekannt = {}
    for pid, p in sorted(kand.items(), key=lambda kv: kv[1]['status'] != 'ACTIVE'):
        h = p['descriptionHtml'] or ''; neu = h; prot = []
        for alt, nn in PROD_REGELN:
            c = neu.count(alt)
            if c: prot.append(f"{c}× {alt[:40]}"); neu = neu.replace(alt, nn)
        for rx, nn in ZOLL_RE:
            c = len(rx.findall(neu))
            if c: prot.append(f"{c}× RE {rx.pattern[:30]}"); neu = rx.sub(nn, neu)
        if BELP in neu:
            ziel = 'Ab Schweizer Lager · 1–2 Werktage' if 'ch-lager' in p['tags'] else 'Direktversand ab Lieferantenlager · 10–20 Werktage'
            prot.append(f"{neu.count(BELP)}× Belp→{ziel[:20]}"); neu = neu.replace(BELP, ziel)
        if neu == h:
            # Kandidat ohne bekannte Regel: Kontext festhalten (nicht raten)
            t = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', h)))
            for m in RESTWORTE.finditer(t):
                unbekannt.setdefault(t[max(0, m.start()-60):m.end()+40], []).append(p['handle'])
            continue
        n_treffer += 1
        rest = RESTWORTE.findall(re.sub(r'<[^>]+>', ' ', neu))
        print(f"  {'●' if p['status']=='ACTIVE' else '○'} {p['handle'][:50]:52} {' · '.join(prot)}{'  ⚠️ Rest: '+str(set(rest)) if rest else ''}")
        if not SCHARF or n_w >= cap: continue
        r = gql('mutation($i:ProductInput!){productUpdate(input:$i){product{id descriptionHtml} userErrors{message}}}', {"i": {"id": pid, "descriptionHtml": neu}})
        pu = r['productUpdate']
        if pu['userErrors']:
            print("    ⛔ FEHLER:", pu['userErrors']); continue
        live = pu['product']['descriptionHtml'] or ''
        if any(alt in live for alt, _ in PROD_REGELN) or BELP in live:
            print("    ⛔ Rücklesen: alte Phrase noch da"); n_rest += 1; continue
        ledger("produkte", [pid.split('/')[-1], p['handle'], ' | '.join(prot), 'Block → Rückgaberecht/Service/Lieferweg laut Richtlinie'])
        n_w += 1
        time.sleep(0.6)
    if unbekannt:
        print("  Kandidaten ohne Regel (Kontext → Handles):")
        for k, v in list(unbekannt.items())[:12]: print(f"    {len(v)}× «{k}» z. B. {v[:2]}")
    print(f"PRODUKTE: {n_treffer} mit Treffer, {n_w} geschrieben, {n_rest} Rücklese-Fehler, {len(unbekannt)} Kontexte ohne Regel")
    return n_treffer


def messen():
    """Eine Zeile für die Keepalive-Meldung. Schreibt nichts."""
    try:
        def cnt(q): return gql('query($q:String){productsCount(query:$q,limit:null){count}}', {"q": q})['productsCount']['count']
        a = cnt('status:active AND "Keine Fragen"'); b = cnt('status:active AND "Geld-zurück"'); c = cnt('status:active AND "Versand aus Belp"')
        d = cnt('status:active AND "7 Tage die Woche"')
        # Seiten: verbotene Phrasen in veröffentlichten Seiten
        pages = []; cur = None
        while True:
            r = gql('query($c:String){pages(first:100,after:$c,query:"published_status:published"){pageInfo{hasNextPage endCursor} nodes{handle body title}}}', {"c": cur})['pages']
            pages += r['nodes']
            if not r['pageInfo']['hasNextPage']: break
            cur = r['pageInfo']['endCursor']
        VERBOT = re.compile(r'Geld-zur[üu]ck|money-back|Keine Fragen|No questions asked|Sans discussion|Rimborso totale|bedingungslos|Unconditional|'
                            r'gesetzlich 14|14-t[äa]gig\w* R[üu]ckgabe|7-14 business|7-14 jours|7-14 giorni|WhatsApp|EU customers|EU-Kund|'
                            r'20–30 Werktage|In der Schweiz gedruckt|Maximum-Zeiten|Versand aus Belp', re.I)
        treffer = []
        for p in pages:
            t = html.unescape(re.sub(r'<[^>]+>', ' ', p['body'] or ''))
            m = VERBOT.findall(t)
            if m: treffer.append(f"{p['handle']}({len(m)})")
        warn = " ⚠️" if (a or b or c or d or treffer) else " ✓"
        print(f"ZUSAGEN{warn}: Produkte aktiv — Keine Fragen {a} · Geld-zurück {b} · Belp {c} · 7 Tage/Woche {d} · Seiten {len(treffer)}/{len(pages)}"
              + (f" [{', '.join(treffer[:6])}]" if treffer else ""))
    except Exception as e:
        print(f"ZUSAGEN: unklar ({type(e).__name__}: {str(e)[:80]})")


if __name__ == "__main__":
    if NUR == "messen": messen()
    elif NUR == "seiten": seiten()
    elif NUR == "policies": policies()
    elif NUR == "produkte": produkte()
    elif NUR == "alle":
        seiten(); policies(); produkte(); messen()
    else:
        sys.exit("NUR=messen|seiten|policies|produkte|alle")
