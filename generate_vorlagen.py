#!/usr/bin/env python3
"""
generate_vorlagen.py — Vorlagen-Set „Klartext-Vorlagen" (DE + EN).

Verkaufsfertiges Vorlagen-Set (Mix): Kundenkommunikation, Akquise, Social Media,
Checklisten. Von Hand geschrieben, anti-hype, du-Form/„Sie" wo passend. Nutzt die
Layout-Helfer aus generate_ebook.py.

Bauen:  python3 generate_vorlagen.py            # DE + EN, Voll + Gratis-Auszug
Voll-PDF (downloads/vorlagen-set[-en].pdf) ist git-ignored -> Lemon Squeezy/Gumroad.
Gratis-Auszug (*-sample.pdf) wird committet.
"""
import os
import sys

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

from generate_ebook import (make_styles, footer_canvas, render_blocks, OUT_DIR, AMBER, DARK)


def tpl(title, body, hint=None):
    """Eine Vorlage = Titel (h3) + Vorlagentext (callout) + optional Hinweis (p)."""
    blocks = [("h3", title), ("callout", body)]
    if hint:
        blocks.append(("p", hint))
    return blocks


# ============================================================
# Deutsch
# ============================================================
def sections_de():
    S = []
    S.append(("Kundenkommunikation", [
        *tpl("Angebot (Begleittext)",
             "Guten Tag [Name], danke für Ihre Anfrage. Anbei mein Angebot für [Leistung]. "
             "Enthalten sind [Punkt 1], [Punkt 2] und [Punkt 3]. Preis: [Betrag], gültig bis "
             "[Datum]. Bei Fragen rufen Sie mich gern an: [Telefon]. Ich freue mich auf Ihre "
             "Rückmeldung. Beste Grüße, [Name]",
             "Tipp: Ein konkretes Gültig-bis-Datum erhöht die Antwortquote spürbar."),
        *tpl("Auftragsbestätigung",
             "Guten Tag [Name], vielen Dank für Ihren Auftrag. Wie besprochen erledige ich "
             "[Leistung] bis [Datum]. Nächster Schritt: [was passiert als Nächstes]. Sollte sich "
             "etwas ändern, melde ich mich sofort. Beste Grüße, [Name]"),
        *tpl("Nachfass nach Angebot (freundlich)",
             "Guten Tag [Name], ich wollte kurz nachhören, ob mein Angebot vom [Datum] bei Ihnen "
             "angekommen ist und ob noch Fragen offen sind. Kein Druck — sagen Sie mir einfach "
             "kurz Bescheid, dann plane ich entsprechend. Beste Grüße, [Name]",
             "Einmal nachfassen nach 3–5 Tagen ist normal und professionell, nicht aufdringlich."),
        *tpl("Reklamation beantworten",
             "Guten Tag [Name], danke, dass Sie mir das direkt mitteilen. Das tut mir leid — so "
             "war es nicht gemeint. Ich schlage vor: [konkrete Lösung]. Passt das für Sie? Ich "
             "kümmere mich sofort darum. Beste Grüße, [Name]",
             "Erst Verständnis, dann Lösung. Keine Rechtfertigung — die kostet nur Vertrauen."),
        *tpl("Bewertungs-Bitte (nach erledigter Arbeit)",
             "Hallo [Name], danke für Ihr Vertrauen. Wenn Sie zufrieden waren, hilft mir eine "
             "kurze Bewertung auf [Plattform] sehr — sie ist in zwei Minuten erledigt: [Link]. "
             "Vielen Dank und beste Grüße, [Name]"),
        *tpl("Freundliche Absage (kein Kapazität/Fit)",
             "Guten Tag [Name], danke für Ihre Anfrage. Ich kann [Leistung] gerade leider nicht "
             "übernehmen, weil [kurzer Grund]. Damit Sie nicht von vorn anfangen: Schauen Sie mal "
             "bei [Empfehlung]. Alles Gute für Ihr Projekt. Beste Grüße, [Name]"),
    ]))
    S.append(("Akquise (ehrlich, kein Spam)", [
        *tpl("Kalt-Mail Erstkontakt",
             "Guten Tag [Name], ich bin [Name] von [Firma] und helfe [Zielgruppe] bei [konkretes "
             "Problem]. Bei [Firma des Empfängers] ist mir [konkrete Beobachtung] aufgefallen — "
             "da ließe sich vermutlich [konkreter Nutzen] erreichen. Lohnt sich ein kurzes "
             "Gespräch? 15 Minuten reichen. Beste Grüße, [Name]",
             "Eine echte Beobachtung statt Textbaustein entscheidet, ob die Mail gelesen wird."),
        *tpl("Akquise-Follow-up (1. Nachfass)",
             "Guten Tag [Name], meine Mail von letzter Woche ist vermutlich untergegangen — kein "
             "Problem. Falls [konkreter Nutzen] für Sie gerade kein Thema ist, sagen Sie einfach "
             "kurz Bescheid, dann lasse ich Sie in Ruhe. Falls doch: Wann passt ein kurzer Call? "
             "Beste Grüße, [Name]"),
        *tpl("LinkedIn-Vernetzung (mit Grund)",
             "Hallo [Name], ich verfolge [Thema/Firma] mit Interesse — besonders [konkreter Punkt]. "
             "Würde mich freuen, mich zu vernetzen. Beste Grüße, [Name]",
             "Vernetzungsanfragen ohne Grund werden ignoriert. Ein Satz Bezug genügt."),
        *tpl("Empfehlungs-Anfrage (an zufriedene Kunden)",
             "Hallo [Name], schön, dass die Zusammenarbeit so gut läuft. Falls Sie jemanden "
             "kennen, der [Leistung] gebrauchen könnte: Ich freue mich über jede Empfehlung — und "
             "behandle sie genauso sorgfältig wie Ihren Auftrag. Danke und beste Grüße, [Name]"),
    ]))
    S.append(("Social Media (anti-hype)", [
        *tpl("Post: ein konkreter Tipp",
             "Kurzer Tipp aus der Praxis: [konkreter, sofort umsetzbarer Tipp in 1–2 Sätzen]. "
             "Klingt simpel, macht aber bei [Zielgruppe] oft den Unterschied. Was ist dein "
             "Vorgehen dabei?",
             "Ein echter Tipp + eine offene Frage = mehr Reichweite als jede Werbebotschaft."),
        *tpl("Post: Vorher/Nachher (ohne Angeberei)",
             "[Ausgangslage in einem Satz]. Nach [Maßnahme]: [Ergebnis in einem Satz]. Kein "
             "Zauber, nur [der eigentliche Hebel]. Wenn du an einer ähnlichen Stelle steckst, "
             "schreib mir gern.",
             "Zahlen nur nennen, wenn sie echt sind. Lieber ehrlich klein als erfunden groß."),
        *tpl("Post: Kunde im Mittelpunkt",
             "[Kund:in] kam mit [Problem] zu mir. Was wir gemacht haben: [kurz]. Was sie jetzt "
             "hat: [Nutzen]. Genau dafür mache ich das. (Mit Erlaubnis geteilt.)"),
        *tpl("Caption-Hooks (erste Zeile)",
             "(1) „Kurz und ehrlich: …“  (2) „Das werde ich oft gefragt: …“  (3) „Fehler, den ich "
             "früher selbst gemacht habe: …“  (4) „Drei Sätze zu [Thema]: …“",
             "Die erste Zeile entscheidet, ob jemand weiterliest. Konkret statt Clickbait."),
        *tpl("Wochen-Content-Plan (Gerüst)",
             "Mo: ein konkreter Tipp. Mi: Kunde/Projekt (mit Erlaubnis). Fr: eine ehrliche "
             "Meinung/Einordnung zu [Branchen-Thema]. Fertig — drei Posts, kein Stress."),
    ]))
    S.append(("Checklisten", [
        *tpl("Neukunde aufnehmen",
             "□ Erwartungen & Ziel geklärt  □ Umfang + Preis schriftlich  □ Termine/Fristen fix  "
             "□ Ansprechpartner + Erreichbarkeit  □ Zugänge/Unterlagen erhalten  □ nächster "
             "Schritt kommuniziert"),
        *tpl("Website-Schnellcheck (KI-/Such-Sichtbarkeit)",
             "□ Ort + Leistung im Klartext  □ FAQ mit echten Fragen  □ strukturierte Daten "
             "(Schema)  □ NAP überall gleich  □ Google-Profil vollständig  □ aktuelle Fotos",
             "Passt zum Buch „Von KI gefunden werden“ — dort steht jeder Punkt ausführlich."),
        *tpl("Monats-Marketing (10 Minuten)",
             "□ Such-Prompts testen (genannt?)  □ eine Sache verbessern  □ um 1–2 Bewertungen "
             "bitten  □ drei Social-Posts planen  □ ein offener Faden nachgefasst"),
    ]))
    S.append(("Termine & Organisation", [
        *tpl("Terminbestätigung",
             "Guten Tag [Name], hiermit bestätige ich unseren Termin am [Datum] um [Uhrzeit] in "
             "[Ort/per Video]. Bitte halten Sie [was nötig ist] bereit. Sollte etwas dazwischen "
             "kommen, geben Sie mir kurz Bescheid. Bis dann, [Name]"),
        *tpl("Terminerinnerung (1 Tag vorher)",
             "Kurze Erinnerung, [Name]: Wir sehen uns morgen, [Datum], um [Uhrzeit] in [Ort]. Ich "
             "freue mich darauf. Falls sich etwas geändert hat, sagen Sie mir einfach Bescheid. "
             "Beste Grüße, [Name]",
             "Eine kurze Erinnerung senkt No-Shows deutlich — freundlich, nicht kontrollierend."),
        *tpl("Termin verschieben (von deiner Seite)",
             "Guten Tag [Name], leider muss ich unseren Termin am [Datum] verschieben, weil "
             "[kurzer Grund]. Würde Ihnen [Alternative 1] oder [Alternative 2] passen? "
             "Entschuldigen Sie die Umstände. Beste Grüße, [Name]"),
        *tpl("Nach No-Show (freundlich)",
             "Guten Tag [Name], wir hatten heute um [Uhrzeit] einen Termin — vielleicht ist etwas "
             "dazwischengekommen. Kein Problem. Sollen wir einen neuen finden? [Vorschlag]. Beste "
             "Grüße, [Name]"),
    ]))
    S.append(("Geld & Rechnung", [
        *tpl("Zahlungserinnerung (freundlich, 1.)",
             "Guten Tag [Name], meine Rechnung [Nummer] vom [Datum] über [Betrag] ist vermutlich "
             "untergegangen — das passiert. Falls schon erledigt, ignorieren Sie diese Nachricht. "
             "Sonst freue ich mich über den Ausgleich bis [Datum]. Beste Grüße, [Name]",
             "Erste Erinnerung immer freundlich und ohne Unterstellung — meist reicht das."),
        *tpl("Zahlungserinnerung (sachlich, 2.)",
             "Guten Tag [Name], meine Rechnung [Nummer] über [Betrag] ist weiterhin offen. Ich "
             "bitte Sie um Zahlung bis [Datum]. Falls es ein Problem gibt, sprechen Sie mich "
             "gern an — wir finden eine Lösung. Beste Grüße, [Name]"),
        *tpl("Anzahlung erklären",
             "Guten Tag [Name], für [Leistung] arbeite ich mit einer Anzahlung von [Betrag/Anteil]. "
             "Damit reserviere ich den Termin und decke [Material/Vorlauf]. Der Rest wird bei "
             "[Zeitpunkt] fällig. Passt das für Sie? Beste Grüße, [Name]"),
        *tpl("Preiserhöhung ankündigen (Bestandskunde)",
             "Guten Tag [Name], ich möchte fair und früh informieren: Ab [Datum] passe ich meine "
             "Preise für [Leistung] auf [neuer Preis] an. Der Grund ist [kurz, ehrlich]. Bis dahin "
             "gilt der bisherige Preis. Danke für Ihr Verständnis und die Zusammenarbeit. Beste "
             "Grüße, [Name]"),
    ]))
    return S


# ============================================================
# Englisch
# ============================================================
def sections_en():
    S = []
    S.append(("Customer communication", [
        *tpl("Quote (cover note)",
             "Hello [Name], thanks for your enquiry. Please find my quote for [service] attached. "
             "It includes [item 1], [item 2] and [item 3]. Price: [amount], valid until [date]. "
             "Any questions, just call me: [phone]. Looking forward to hearing from you. Best, [Name]",
             "Tip: a concrete valid-until date noticeably improves reply rates."),
        *tpl("Order confirmation",
             "Hello [Name], thank you for your order. As agreed, I'll complete [service] by [date]. "
             "Next step: [what happens next]. If anything changes, I'll let you know right away. "
             "Best, [Name]"),
        *tpl("Follow-up after a quote (friendly)",
             "Hello [Name], just checking my quote from [date] reached you and whether any "
             "questions are open. No pressure — just let me know so I can plan accordingly. "
             "Best, [Name]",
             "One follow-up after 3–5 days is normal and professional, not pushy."),
        *tpl("Handling a complaint",
             "Hello [Name], thank you for telling me directly. I'm sorry — that's not how it was "
             "meant. Here's what I suggest: [concrete fix]. Does that work for you? I'll sort it "
             "out right away. Best, [Name]",
             "Understanding first, then a fix. No justifying — it only costs trust."),
        *tpl("Review request (after the job)",
             "Hi [Name], thank you for your trust. If you were happy, a short review on [platform] "
             "would help me a lot — it takes two minutes: [link]. Thanks and best, [Name]"),
        *tpl("Polite decline (no capacity/fit)",
             "Hello [Name], thanks for your enquiry. I'm afraid I can't take on [service] right "
             "now because [short reason]. So you don't start from scratch: take a look at "
             "[referral]. All the best with your project. Best, [Name]"),
    ]))
    S.append(("Outreach (honest, no spam)", [
        *tpl("Cold email, first contact",
             "Hello [Name], I'm [Name] from [company] and I help [target group] with [concrete "
             "problem]. At [recipient's company] I noticed [concrete observation] — that's likely "
             "where [concrete benefit] could be achieved. Worth a quick chat? 15 minutes is "
             "enough. Best, [Name]",
             "A real observation instead of a template decides whether the email gets read."),
        *tpl("Outreach follow-up (1st)",
             "Hello [Name], my email last week probably got buried — no problem. If [concrete "
             "benefit] isn't on your radar right now, just say so and I'll leave you in peace. If "
             "it is: when suits a short call? Best, [Name]"),
        *tpl("LinkedIn connect (with a reason)",
             "Hi [Name], I follow [topic/company] with interest — especially [concrete point]. "
             "I'd be glad to connect. Best, [Name]",
             "Connection requests without a reason get ignored. One line of context is enough."),
        *tpl("Referral request (to happy clients)",
             "Hi [Name], glad the work is going so well. If you know someone who could use "
             "[service]: I welcome any referral — and treat it with the same care as your own "
             "project. Thanks and best, [Name]"),
    ]))
    S.append(("Social media (anti-hype)", [
        *tpl("Post: one concrete tip",
             "Quick tip from practice: [concrete, immediately usable tip in 1–2 sentences]. "
             "Sounds simple, but it often makes the difference for [target group]. What's your "
             "approach?",
             "A real tip + an open question = more reach than any ad message."),
        *tpl("Post: before/after (no bragging)",
             "[Starting point in one sentence]. After [action]: [result in one sentence]. No "
             "magic, just [the actual lever]. If you're stuck somewhere similar, message me.",
             "Only use numbers if they're real. Honestly small beats fakely big."),
        *tpl("Post: client in focus",
             "[Client] came to me with [problem]. What we did: [briefly]. What they have now: "
             "[benefit]. That's exactly why I do this. (Shared with permission.)"),
        *tpl("Caption hooks (first line)",
             "(1) „Short and honest: …“  (2) „I get asked this a lot: …“  (3) „A mistake I used "
             "to make myself: …“  (4) „Three lines on [topic]: …“",
             "The first line decides whether someone keeps reading. Concrete, not clickbait."),
        *tpl("Weekly content plan (skeleton)",
             "Mon: one concrete tip. Wed: client/project (with permission). Fri: an honest "
             "take on [industry topic]. Done — three posts, no stress."),
    ]))
    S.append(("Checklists", [
        *tpl("Onboard a new client",
             "□ Expectations & goal clarified  □ Scope + price in writing  □ Dates/deadlines set  "
             "□ Contact + availability  □ Access/documents received  □ Next step communicated"),
        *tpl("Website quick-check (AI/search visibility)",
             "□ Town + service in plain words  □ FAQ with real questions  □ structured data "
             "(schema)  □ NAP the same everywhere  □ Google profile complete  □ current photos",
             "Pairs with the book „Found by AI“ — every point is explained there in full."),
        *tpl("Monthly marketing (10 minutes)",
             "□ Test search prompts (named?)  □ improve one thing  □ ask for 1–2 reviews  "
             "□ plan three social posts  □ follow up one open thread"),
    ]))
    S.append(("Scheduling & organisation", [
        *tpl("Appointment confirmation",
             "Hello [Name], confirming our appointment on [date] at [time] in [place/via video]. "
             "Please have [what's needed] ready. If anything comes up, just let me know. See you "
             "then, [Name]"),
        *tpl("Appointment reminder (day before)",
             "Quick reminder, [Name]: we meet tomorrow, [date], at [time] in [place]. Looking "
             "forward to it. If anything's changed, just let me know. Best, [Name]",
             "A short reminder cuts no-shows noticeably — friendly, not controlling."),
        *tpl("Reschedule (from your side)",
             "Hello [Name], unfortunately I need to move our appointment on [date] because "
             "[short reason]. Would [alternative 1] or [alternative 2] work for you? Sorry for "
             "the inconvenience. Best, [Name]"),
        *tpl("After a no-show (friendly)",
             "Hello [Name], we had an appointment today at [time] — maybe something came up. No "
             "problem. Shall we find a new slot? [suggestion]. Best, [Name]"),
    ]))
    S.append(("Money & invoicing", [
        *tpl("Payment reminder (friendly, 1st)",
             "Hello [Name], my invoice [number] from [date] for [amount] probably got buried — it "
             "happens. If you've already paid, please ignore this. Otherwise I'd appreciate "
             "settlement by [date]. Best, [Name]",
             "Always keep the first reminder friendly and free of accusation — usually enough."),
        *tpl("Payment reminder (factual, 2nd)",
             "Hello [Name], my invoice [number] for [amount] is still outstanding. I'd ask you to "
             "pay by [date]. If there's a problem, do talk to me — we'll find a solution. Best, [Name]"),
        *tpl("Explaining a deposit",
             "Hello [Name], for [service] I work with a deposit of [amount/share]. It reserves "
             "your slot and covers [materials/prep]. The rest is due at [point]. Does that work "
             "for you? Best, [Name]"),
        *tpl("Announcing a price increase (existing client)",
             "Hello [Name], I want to be fair and give early notice: from [date] I'm adjusting my "
             "prices for [service] to [new price]. The reason is [short, honest]. Until then the "
             "current price applies. Thank you for your understanding and the partnership. Best, [Name]"),
    ]))
    return S


META = {
    "de": {"title": "Klartext-Vorlagen", "subtitle": "Fertige Vorlagen für Kunden, Akquise, Social & Checklisten",
           "edition": "1. Auflage · 2026", "toc": "Inhalt",
           "intro": "Kopieren, eckige Klammern anpassen, abschicken. Ehrlich im Ton, ohne Spam und ohne Floskeln. "
                    "Pass die Anrede (du/Sie) an deine Kund:innen an."},
    "en": {"title": "Plain-text Templates", "subtitle": "Ready templates for clients, outreach, social & checklists",
           "edition": "1st edition · 2026", "toc": "Contents",
           "intro": "Copy, adjust the brackets, send. Honest in tone, no spam, no fluff. Adapt the level of "
                    "formality to your clients."},
}


def build_lang(lang, sections, sample=False):
    styles = make_styles()
    meta = META[lang]
    suffix = "" if lang == "de" else "-" + lang
    secs = sections
    if sample:
        # Gratis-Auszug: nur die erste Sektion (von sechs) — klar kleiner als das Vollset
        secs = [sections[0]]
    filename = "vorlagen-set%s%s.pdf" % (suffix, "-sample" if sample else "")
    doc = SimpleDocTemplate(
        os.path.join(OUT_DIR, filename), pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2.2 * cm,
        title="%s — %s" % (meta["title"], meta["subtitle"]), author="Aban / aban news",
        subject="Vorlagen-Set", keywords="Vorlagen, Templates, Akquise, Kundenkommunikation, Social",
        creator="aban news — abannews.com")
    story = []
    story.append(Spacer(1, 4.5 * cm))
    story.append(Paragraph("&#128221;", ParagraphStyle(
        name="Emoji", fontName="Helvetica", fontSize=58, alignment=TA_CENTER, textColor=AMBER)))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph("aban news", ParagraphStyle(
        name="BrandName", fontName="Helvetica-Bold", fontSize=16, alignment=TA_CENTER,
        textColor=DARK, spaceAfter=24)))
    story.append(Spacer(1, 1.2 * cm))
    story.append(Paragraph(meta["title"] + (" — Leseprobe" if sample else ""), styles["CoverTitle"]))
    story.append(Paragraph(meta["subtitle"], styles["CoverSub"]))
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph(meta["edition"], styles["CoverMeta"]))
    story.append(Paragraph("Aban (Allen Chour) · abannews.com", styles["CoverMeta"]))
    story.append(PageBreak())
    story.append(Paragraph(meta["toc"], styles["Chapter"]))
    story.append(Paragraph(meta["intro"], styles["Lead"]))
    story.append(PageBreak())
    for name, blocks in secs:
        story.append(Paragraph(name, styles["Chapter"]))
        render_blocks(story, styles, blocks)
        story.append(PageBreak())
    if sample:
        render_blocks(story, styles, [
            ("h3", "Mehr Vorlagen?" if lang == "de" else "More templates?"),
            ("callout", ("Das volle Set hat alle Sektionen (Kunden, Akquise, Social, Checklisten). "
                         "Hol's dir: abannews.com/vorlagen-set — 19 €, DE + EN.") if lang == "de" else
                        ("The full set has all sections (clients, outreach, social, checklists). "
                         "Get it: abannews.com/vorlagen-set — €19, DE + EN.")),
        ])
    doc.build(story, onFirstPage=footer_canvas, onLaterPages=footer_canvas)
    print("✓ downloads/%s erstellt" % filename)


def build(langs=None):
    secs = {"de": sections_de, "en": sections_en}
    for lang in (langs or ["de", "en"]):
        s = secs[lang]()
        build_lang(lang, s, sample=False)
        build_lang(lang, s, sample=True)


if __name__ == "__main__":
    build(sys.argv[1:] or None)
