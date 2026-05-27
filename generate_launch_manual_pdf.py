#!/usr/bin/env python3
"""Generate launch-manual.pdf — print-ready offline version of the launch-day manual."""
import os
from datetime import date
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, ListFlowable, ListItem
)
from reportlab.pdfgen import canvas

OUT = os.path.expanduser("~/aban-deploy/downloads/launch-manual.pdf")
os.makedirs(os.path.dirname(OUT), exist_ok=True)

ACCENT = HexColor("#7c3aed")
ACCENT2 = HexColor("#06b6d4")
DONE = HexColor("#10b981")
WARN = HexColor("#f59e0b")
ERR = HexColor("#ef4444")
MUTED = HexColor("#6b6b80")
BG_CARD = HexColor("#f5f5fa")
BG_TIP = HexColor("#e9f7fb")
BG_ERR = HexColor("#fdecec")
BG_OK = HexColor("#e6f9f0")
BG_CODE = HexColor("#1a1a2a")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=22,
                   spaceAfter=6, textColor=black, fontName="Helvetica-Bold")
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=16,
                   spaceBefore=12, spaceAfter=6, textColor=ACCENT,
                   fontName="Helvetica-Bold")
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=12,
                   spaceBefore=8, spaceAfter=4, textColor=black,
                   fontName="Helvetica-Bold")
H4 = ParagraphStyle("H4", parent=styles["Heading4"], fontSize=10.5,
                   spaceBefore=6, spaceAfter=3, textColor=ACCENT2,
                   fontName="Helvetica-Bold")
BODY = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=9.5,
                     leading=13, alignment=TA_LEFT, textColor=black)
SMALL = ParagraphStyle("Small", parent=BODY, fontSize=8.5, leading=11,
                      textColor=MUTED)
CODE = ParagraphStyle("Code", parent=BODY, fontSize=8.5, leading=11,
                     fontName="Courier", textColor=HexColor("#222"),
                     leftIndent=8, backColor=HexColor("#f0f0f5"),
                     borderPadding=6)
TIP = ParagraphStyle("Tip", parent=BODY, fontSize=8.8, leading=12,
                    backColor=BG_TIP, borderColor=ACCENT2, borderWidth=0,
                    leftIndent=6, rightIndent=6, spaceBefore=4, spaceAfter=4,
                    borderPadding=5)
ERRSTYLE = ParagraphStyle("Err", parent=BODY, fontSize=8.8, leading=12,
                         backColor=BG_ERR, leftIndent=6, rightIndent=6,
                         spaceBefore=4, spaceAfter=4, borderPadding=5)
OK = ParagraphStyle("Ok", parent=BODY, fontSize=8.8, leading=12,
                   backColor=BG_OK, leftIndent=6, rightIndent=6,
                   spaceBefore=4, spaceAfter=4, borderPadding=5)
META = ParagraphStyle("Meta", parent=BODY, fontSize=8, leading=10,
                     textColor=MUTED, spaceAfter=2)

# --- COVER PAGE ---
def cover_page(canvas_obj, doc):
    c = canvas_obj
    w, h = A4
    c.setFillColor(HexColor("#0a0a0f"))
    c.rect(0, 0, w, h, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 56)
    c.drawCentredString(w/2, h - 7*cm, "Launch-Day-Manual")
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(w/2, h - 9*cm, "aban news")
    c.setFillColor(white)
    c.setFont("Helvetica", 12)
    c.drawCentredString(w/2, h - 11*cm, "abannews.com")
    c.setFillColor(HexColor("#aaaabb"))
    c.setFont("Helvetica", 10)
    c.drawCentredString(w/2, h - 13*cm, "7 Pflicht-Actions  -  ca. 185 Min total")
    c.drawCentredString(w/2, h - 13.6*cm, "55 Sub-Steps  -  print-ready offline manual")
    # Logo "coffee" placeholder
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 80)
    c.drawCentredString(w/2, h/2 - 1*cm, "*")
    # Footer of cover
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawCentredString(w/2, 3*cm, "v1.0  -  " + str(date.today()))
    c.drawCentredString(w/2, 2.4*cm, "INTERN  -  nicht teilen")

# --- PAGE FOOTER ---
def add_footer(canvas_obj, doc):
    c = canvas_obj
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    c.drawString(2*cm, 1.3*cm,
                 "aban news Launch-Day-Manual v1.0  -  " + str(date.today()))
    c.drawRightString(A4[0] - 2*cm, 1.3*cm, f"Page {doc.page}")

# --- BUILDING THE STORY ---
def P(text, style=BODY):
    return Paragraph(text, style)

def code_block(text):
    """Render multi-line code as a styled box."""
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    safe = safe.replace("\n", "<br/>")
    return Paragraph(f'<font face="Courier" size="8">{safe}</font>', CODE)

def step_block(num, title, desc, time, details_pre, details_lists, tip, err, ok,
               code_blocks=None):
    """Generate a step block - always returns a list of flowables."""
    items = []
    items.append(P(f'<b>{num}  -  {title}</b>', H4))
    if desc:
        items.append(P(desc, BODY))
    if time:
        items.append(P(f'<i>Time: {time}</i>', META))
    items.append(Spacer(1, 2))
    for line in details_pre:
        items.append(P(line, BODY))
    for header, lst in details_lists:
        if header:
            items.append(P(f'<b>{header}</b>', BODY))
        bullets = ListFlowable(
            [ListItem(P(it, BODY), leftIndent=10) for it in lst],
            bulletType='bullet', start='circle', leftIndent=14
        )
        items.append(bullets)
    if code_blocks:
        for cb in code_blocks:
            items.append(code_block(cb))
            items.append(Spacer(1, 2))
    if tip:
        items.append(P(f'<b>Tipp:</b> {tip}', TIP))
    if err:
        items.append(P(f'<b>Common Error:</b> {err}', ERRSTYLE))
    if ok:
        items.append(P(f'<b>Expected:</b> {ok}', OK))
    items.append(Spacer(1, 8))
    return items

# --- SECTION CONTENT ---
def build_story():
    story = []
    # Skip cover - it's the first page via onFirstPage
    story.append(PageBreak())

    # Index
    story.append(P("Inhaltsverzeichnis", H1))
    story.append(Spacer(1, 6))
    toc = [
        ["Bevor du anfaengst", "3"],
        ["1. beehiiv-Account-Setup (10 Min, 10 Steps)", "4"],
        ["2. OpenAI-Account-Setup (5 Min, 7 Steps)", "9"],
        ["3. Make-Connections-Wiring (15 Min, 9 Steps)", "12"],
        ["4. Apps-Script Sheets-Setup (5 Min, 7 Steps)", "16"],
        ["5. Stripe-CH-KYC (20 Min + 2-3d, 10 Steps)", "19"],
        ["6. Cloudflare-Worker + DNS (10 Min, 6 Steps)", "24"],
        ["7. First-30-Subscriber-Outreach (60 Min, 6 Steps)", "27"],
        ["Appendix: Time-Plan + Conversion-Math", "30"],
    ]
    t = Table(toc, colWidths=[14*cm, 2*cm])
    t.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,-1), "Helvetica"),
        ("FONTSIZE", (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LINEBELOW", (0,0), (-1,-1), 0.3, MUTED),
    ]))
    story.append(t)
    story.append(PageBreak())

    # Intro
    story.append(P("Bevor du anfaengst", H2))
    story.append(P(
        "Dieses Manual fuehrt dich durch <b>alle 7 Pflicht-Aktionen</b>, "
        "die du als Mensch ausfuehren musst - der Code/Automation kann sie "
        "nicht fuer dich erledigen (API-Keys, OAuth, KYC, Outreach). "
        "Plan deinen Launch-Day so:", BODY))
    story.append(ListFlowable([
        ListItem(P("<b>Vormittag (90 min):</b> Section 1 (beehiiv) + 2 (OpenAI) + 3 (Make) - die Tech-Pipeline", BODY)),
        ListItem(P("<b>Mittagspause:</b> Wait fuer DNS-Propagation (1.8) + Stripe-KYC-Review (5)", BODY)),
        ListItem(P("<b>Nachmittag (50 min):</b> Section 4 (Sheets) + 6 (Cloudflare) - Plumbing", BODY)),
        ListItem(P("<b>Abend (60 min):</b> Section 7 (Outreach) - der echte Wertschoepfungs-Marathon", BODY)),
    ], bulletType='bullet'))
    story.append(Spacer(1, 8))
    story.append(P("Markiere jeden Step in der HTML-Version als Done/Skip/Stuck. "
                  "Bei Stuck kannst du eine Notiz hinzufuegen - alles bleibt "
                  "lokal (localStorage, kein Tracking).", SMALL))
    story.append(PageBreak())

    # ============ SECTION 1: BEEHIIV ============
    story.append(P("1. beehiiv-Account-Setup", H1))
    story.append(P("<i>~10 Min aktiv + ~24h DNS-Wait  -  Free-Tier (bis 2.5k Subs)  -  10 Sub-Steps</i>", META))
    story.append(P("Newsletter-Plattform aufsetzen - der zentrale Sender. Alles fliesst hier durch.", BODY))
    story.append(Spacer(1, 8))

    for item in step_block("1.1", "Signup auf beehiiv.com",
        "Account anlegen mit allengchour@gmail.com",
        "2 min",
        ["<b>URL:</b> https://app.beehiiv.com/signup",
         "<b>Felder ausfuellen:</b>"],
        [("", [
            "Email: allengchour@gmail.com",
            "Password: stark (1Password), in Passwort-Manager speichern",
            "First name: Allen  -  Last name: Ghour (wie auf Pass)",
            "Country: Switzerland"
        ])],
        "Skip alle Cross-Sell-Screens (Boost-Marketplace etc.) - kommt spaeter.",
        "'Email already in use' - du hast vorher schon getestet. Reset-Password oder allen+beehiiv@gmail.com",
        "Du landest im leeren beehiiv-Dashboard."):
        story.append(item)

    for item in step_block("1.2", "Publication 'aban news' anlegen",
        "Die Newsletter-Publikation mit Aban-spezifischen Werten.",
        "2 min",
        ["<b>Click-Path:</b> Dashboard - + Create Publication",
         "<b>Werte exakt eingeben:</b>"],
        [("", [
            "Publication name: aban news (klein, mit space)",
            "Slug: abannews (auch wenn du eigene Domain nimmst)",
            "Description: Taegliche AI-News auf Deutsch. Kein Hype, kein Bullshit.",
            "Language: German (Deutsch)",
            "Timezone: Europe/Zurich",
            "Industry: Technology"
        ])],
        "Slug nicht spaeter aendern - kaputte Links.",
        "'Slug already taken' - versuche aban-news-de oder abannews-2026.",
        "Publication-Dashboard offen, '0 subscribers'."):
        story.append(item)

    for item in step_block("1.3", "Branding: Logo + Color-Palette",
        "Logo (Kaffee-Icon) und Farben hochladen.",
        "3 min",
        ["<b>Click-Path:</b> Settings - Publication - Branding",
         "<b>Logos:</b>"],
        [("", [
            "Logo (full): ~/aban-deploy/logo-full.svg",
            "Icon (square): ~/aban-deploy/logo-icon.svg",
            "Bei SVG-Problem: PNG aus brand-assets.zip"
        ]),
         ("<b>Color-Palette:</b>", [
            "Primary: #7c3aed (Aban-Lila)",
            "Secondary: #06b6d4 (Cyan)",
            "Background: #ffffff (Light, empfohlen fuer Email)",
            "Text: #1a1a2e"
         ])],
        "Light-Background fuer Emails. Dark sieht in Gmail-Mobile oft kaputt aus.",
        "SVG-Upload fehlschlaegt - PNG via cloudconvert.com nehmen.",
        "Preview rechts zeigt Header mit deinem Logo + Farben."):
        story.append(item)

    for item in step_block("1.4", "Sender-Identity: hallo@abannews.com",
        "Absender-Adresse + From-Name konfigurieren.",
        "1 min",
        ["<b>Click-Path:</b> Settings - Publication - Sending - From email"],
        [("", [
            "From name: aban news",
            "Reply-to email: hallo@abannews.com",
            "From email (Domain): wird in 1.7 gesetzt"
        ])],
        "Reply-to ist wichtiger als From. Setz Forwarding in Section 6.4 auf allengchour@gmail.com.",
        "From-Name zu lang? beehiiv-Limit 25 Zeichen. 'aban news' passt.",
        "Settings gespeichert."):
        story.append(item)

    for item in step_block("1.5", "API-Key generieren",
        "Fuer die Make-Pipeline.",
        "1 min",
        ["<b>URL:</b> app.beehiiv.com/settings/integrations/api"],
        [("", [
            "Name: aban-news-make-prod",
            "Permissions: Read + Write (alle Scopes)",
            "Create - Key wird NUR 1x angezeigt - sofort kopieren!"
        ])],
        "Mach gleich einen zweiten Key 'aban-news-emergency-backup' fuer 1Password.",
        "Key vergessen zu kopieren - kein Drama, loeschen + neuen erstellen.",
        "Key beginnt mit bh_ (~40 Zeichen)."):
        story.append(item)

    for item in step_block("1.6", "Key sicher in .beehiiv.env speichern",
        "PowerShell-Command fuer lokale env-Datei.",
        "1 min",
        ["<b>PowerShell:</b>"],
        [],
        "Niemals den Key in eine Datei commiten, die nach GitHub geht. git status checken vor jedem push.",
        "Falls bereits committed: Key in beehiiv revoken, neuen generieren - der alte ist tot.",
        "Datei ~/aban-deploy/.beehiiv.env existiert.",
        code_blocks=[
            "'BEEHIIV_API_KEY=bh_DEIN_KEY_HIER\nBEEHIIV_PUB_ID=pub_HOLEN_AUS_URL\nBEEHIIV_FROM_EMAIL=hallo@abannews.com' | Out-File -FilePath \"$HOME\\aban-deploy\\.beehiiv.env\" -Encoding utf8"
        ]):
        story.append(item)

    for item in step_block("1.7", "Custom Sending Domain: mail.abannews.com",
        "Damit Emails von mail.abannews.com kommen, nicht von updates.beehiiv.com.",
        "2 min Setup + 24h DNS-Wait",
        ["<b>Click-Path:</b> Settings - Publication - Sending - Custom domain - Add",
         "<b>beehiiv generiert 4-5 DNS-Records:</b>"],
        [],
        "Mach 1.8 + Section 6 (Cloudflare DNS) als ein Block - DNS-Wait laeuft parallel.",
        "'Domain already verified by another account' - Support-Ticket an hi@beehiiv.com.",
        "Modal zeigt 'Awaiting DNS verification' mit gelbem Status.",
        code_blocks=[
            "TYPE   HOST                            VALUE\nTXT    mail.abannews.com               v=spf1 include:beehiiv.com ~all\nTXT    bh._domainkey.abannews.com      [langer DKIM-key]\nCNAME  em.mail.abannews.com            track.beehiiv.com\nCNAME  url.mail.abannews.com           redirect.beehiiv.com\nTXT    _dmarc.abannews.com             v=DMARC1; p=none; rua=mailto:hallo@abannews.com"
        ]):
        story.append(item)

    for item in step_block("1.8", "DNS-Records bei Porkbun (oder Cloudflare)",
        "Die 5 Records aus 1.7 zur DNS-Konfig hinzufuegen.",
        "5 min Eintrag + 30 Min bis 24h Propagation",
        ["<b>Wo:</b> porkbun.com/account/domains - abannews.com - DNS Records",
         "<b>Format-Anweisungen:</b>"],
        [("", [
            "TXT-Records: Host = Subdomain-Teil ohne .abannews.com (z.B. 'mail')",
            "CNAME: Host wie oben, Answer ohne abschliessenden Punkt",
            "DMARC: nur 1 pro Domain - existing erst loeschen",
            "TTL: 600 (default)"
        ])],
        "Wenn Section 6 Cloudflare-DNS - die Records gehen dort hin, nicht zu Porkbun. Erst Section 6 entscheiden.",
        "'DMARC syntax error' - keine smart quotes (Word macht das). Notepad-Detour. Nach 24h immer noch nicht verified - bei beehiiv 'Re-check DNS'.",
        "Alle 5 Zeilen gruen in beehiiv, 'Domain verified'.",
        code_blocks=[
            "# Windows PowerShell verify:\nResolve-DnsName -Name mail.abannews.com -Type TXT\nResolve-DnsName -Name em.mail.abannews.com -Type CNAME"
        ]):
        story.append(item)

    for item in step_block("1.9", "Welcome-Automation einrichten",
        "Automatische Welcome-Mail bei neuen Subs.",
        "5 min",
        ["<b>Click-Path:</b> Sidebar - Automations - + New Automation - Welcome Series"],
        [("", [
            "Name: aban-welcome-v2",
            "Trigger: New subscriber added",
            "Delay: Immediately (nicht '1 hour')",
            "Subject: Willkommen bei aban news",
            "Body aus ~/aban-deploy/willkommen.html (ohne <html>/<body>)"
        ])],
        "Pack im Welcome eine konkrete Frage rein: 'Schreib mir kurz, was dich an AI nervt.' - sofortiges Gespraech mit Sub Nr.1.",
        "'Body too large' - externe Bilder raus, nur Inline-CSS. beehiiv limit ~100KB.",
        "'Automation active' mit gruenem Toggle."):
        story.append(item)

    for item in step_block("1.10", "Subscribe-Form Embed in Landing-Page",
        "Embed-Code aus beehiiv in landing-ultra/index.html einsetzen.",
        "3 min",
        ["<b>Click-Path:</b> Subscribers - Get more subscribers - Embed Form - Minimal"],
        [("<b>2 Embed-Optionen:</b>", [
            "Iframe (einfach, styling-limitiert)",
            "API-Form (mehr Kontrolle, aber Custom-CSS noetig)"
        ])],
        "Behalte alte Form als Backup. Falls beehiiv-Iframe nicht laedt (Adblocker), kannst du in 5 Min zurueck.",
        "Iframe laedt nicht in Safari - CSP-Issues. Erst Chrome testen, dann Safari.",
        "Test-Sub erscheint in beehiiv-Dashboard innerhalb 30s."):
        story.append(item)

    story.append(PageBreak())

    # ============ SECTION 2: OPENAI ============
    story.append(P("2. OpenAI-Account-Setup", H1))
    story.append(P("<i>~5 Min  -  $5 Initial-Credit  -  7 Sub-Steps</i>", META))
    story.append(P("Fallback-Modell fuer Multi-Model-Pipeline (wenn Claude rate-limited).", BODY))
    story.append(Spacer(1, 8))

    for item in step_block("2.1", "Account anlegen",
        "platform.openai.com/signup", "1 min",
        ["<b>URL:</b> platform.openai.com/signup"],
        [("", [
            "Email: allengchour@gmail.com (oder ChatGPT-Account)",
            "Phone verify: CH-Nummer (SMS)",
            "Organization-Name: aban news",
            "Use case: Build a product"
        ])],
        "Wenn ChatGPT-Plus: gleiche Email, sparst SMS-Verify.",
        "'Phone verification failed' - alte Nummer geblockt. TextNow-App fuer US-Nummer (gratis).",
        "Du landest auf platform.openai.com/playground."):
        story.append(item)

    for item in step_block("2.2", "Project erstellen: aban-news-prod",
        "Projects isolieren Keys + Spending.", "1 min",
        ["<b>Click-Path:</b> Top-Left Dropdown - + Create project"],
        [("", [
            "Name: aban-news-prod",
            "Description: Daily DE AI newsletter - multi-model fallback"
        ])],
        "Mach zusaetzlich ein aban-news-dev Project fuer Tests.",
        "'Project quota reached' - Free-Tier 3 Projects max.",
        "Project-Dropdown zeigt 'aban-news-prod'."):
        story.append(item)

    for item in step_block("2.3", "API-Key mit Restricted Permissions",
        "Scoped-Key, nur die noetigen Endpoints.", "1 min",
        ["<b>URL:</b> platform.openai.com/api-keys"],
        [("", [
            "Name: aban-news-make-prod-v1",
            "Project: aban-news-prod",
            "Permissions: Restricted",
            "Enable: /v1/chat/completions (Read+Write), /v1/models (Read)"
        ])],
        "Restricted ist dein Schutz. Falls Key leakt: kein Embedding-API-Abuse.",
        "All-permissions ist convenient aber unsicher - bei Make.com-Pipeline: restricted!",
        "Key beginnt mit sk-proj-."):
        story.append(item)

    for item in step_block("2.4", "Pay-as-you-go aktivieren ($5)",
        "Credit aufladen - sonst kein API-Call.", "1 min",
        ["<b>URL:</b> platform.openai.com/settings/organization/billing"],
        [("", [
            "Visa/Mastercard (CH-Karte funktioniert)",
            "Initial amount: $5",
            "Auto-recharge: OFF (manuelle Kontrolle!)"
        ])],
        "$5 reicht fuer ~2 Monate. GPT-4o-mini kostet $0.003 pro Newsletter.",
        "CH-Karte abgelehnt - 3DS scheitert oft. Revolut-Card als Workaround.",
        "Balance: $5.00."):
        story.append(item)

    for item in step_block("2.5", "Hard-Spending-Limit $5/mo",
        "Safety-Net falls Make-Loop durchdreht.", "30 sec",
        ["<b>URL:</b> platform.openai.com/settings/organization/limits"],
        [("", [
            "Monthly budget: $5",
            "Email threshold: $3 (warnt bei 60%)",
            "Project-Limit zusaetzlich: $5"
        ])],
        "Doppelte Sicherung: Org-Limit + Project-Limit.",
        "Bei Limit-Erreichen: HTTP 429. Anthropic-Fallback faengt das automatisch ab.",
        "'Usage limits set' Toast."):
        story.append(item)

    for item in step_block("2.6", "Key in .openai.env speichern",
        "Gleiche Convention wie beehiiv.", "30 sec",
        ["<b>PowerShell:</b>"],
        [],
        "Default-Modell gpt-4o-mini - 30x guenstiger als gpt-4o.",
        ".gitignore-Check vergessen - siehe 1.6.",
        "Datei existiert.",
        code_blocks=[
            "'OPENAI_API_KEY=sk-proj-DEIN_KEY\nOPENAI_PROJECT_ID=proj_X\nOPENAI_MODEL=gpt-4o-mini' | Out-File -FilePath \"$HOME\\aban-deploy\\.openai.env\" -Encoding utf8"
        ]):
        story.append(item)

    for item in step_block("2.7", "Test-Call via curl",
        "Verify Key vor Make-Wiring.", "30 sec",
        ["<b>PowerShell:</b>"],
        [],
        "Test passt - Key + Billing gut.",
        "'invalid_api_key' - Whitespace beim Copy. 'insufficient_quota' - Billing nicht aktiv.",
        "JSON-Response mit choices[0].message.content.",
        code_blocks=[
            "$key = (Get-Content \"$HOME\\aban-deploy\\.openai.env\" | Select-String \"OPENAI_API_KEY=\").ToString().Split(\"=\")[1]\n$body = '{\"model\":\"gpt-4o-mini\",\"messages\":[{\"role\":\"user\",\"content\":\"Sag hi.\"}]}'\ncurl.exe -s https://api.openai.com/v1/chat/completions -H \"Authorization: Bearer $key\" -H \"Content-Type: application/json\" -d $body"
        ]):
        story.append(item)

    story.append(PageBreak())

    # ============ SECTION 3: MAKE ============
    story.append(P("3. Make-Connections-Wiring", H1))
    story.append(P("<i>~15 Min  -  Free-Tier (1000 ops/mo)  -  9 Sub-Steps</i>", META))
    story.append(P("Alle Services verbinden + Blueprint importieren + Placeholder ersetzen.", BODY))
    story.append(Spacer(1, 8))

    section3_steps = [
        ("3.1", "Anthropic-Connection (existiert)",
         "Schon vorhanden - nur verifizieren.", "30 sec",
         "Suche 'aban-news-prod-v2' in Connections - sollte gruen sein. Falls expired: Reauthorize mit API-Key aus console.anthropic.com.",
         "Halte 2 Anthropic-Keys parallel: einer fuer Make, einer fuer CLI.",
         "Status 'Invalid token' - in Anthropic-Console neuen Key generieren.",
         "Gruener Punkt, 'Last used: today'."),
        ("3.2", "OpenAI-Connection (neu)",
         "Mit Key aus 2.6.", "1 min",
         "Connections - + Add - OpenAI. Name: aban-news-openai-prod. API-Key aus .openai.env. Organization ID leer.",
         "Naming: aban-news-{service}-{env}.",
         "401 - Key falsch oder geloescht.",
         "Gruener Status, 'Connection verified'."),
        ("3.3", "Gmail-Connection (Scope verify)",
         "Existiert - Scope 'Gmail Modify' noetig.", "1 min",
         "Suche aban-gmail-allengchour. Scope-Tab: gmail.modify, gmail.send, gmail.readonly. Falls fehlt - Reauthorize.",
         "Google warnt 'This app isn't verified' - Make ist verified seit 2021. Safe.",
         "OAuth Error: access_denied - Permission abgelehnt, reauthorize.",
         "Connection gruen, 3 Scopes gelistet."),
        ("3.4", "Google Sheets-Connection",
         "Gleicher OAuth, eigene Connection.", "1 min",
         "+ Add - Google Sheets. Name: aban-sheets-allengchour. Sign-in allengchour@gmail.com.",
         "Separate Connection statt Gmail wiederverwenden - falls eine expired, laeuft die andere.",
         "'Account already used' - alte Auths bei Google-Account loeschen.",
         "Connection gruen."),
        ("3.5", "Slack-Webhook (optional)",
         "Fuer Alerts wenn Pipeline failt.", "2 min",
         "Slack - Workspace - Apps - Incoming Webhooks - Add. Channel: #aban-alerts (neu). URL kopieren.",
         "Wenn kein Slack: Email-Notify via Gmail-Module.",
         "",
         "Optional, kann skipped werden."),
        ("3.6", "Cloudflare-Worker-Webhook",
         "URL aus 6.5.", "1 min",
         "Worker-URL: https://aban-voice-validator.X.workers.dev. Make-Modul 'Voice-Validator-Call': URL, Method POST, Header X-Aban-Key.",
         "X-Aban-Key Header-Check ist Defense-in-Depth.",
         "502 - Worker noch nicht deployed (6.5).",
         "Make-Test-Call gibt JSON zurueck (score, forbidden)."),
        ("3.7", "Blueprint-Import: aban-news-v2-multimodel",
         "Multi-Model-Workflow als JSON.", "3 min",
         "Make - Scenarios - Create. 3-Dots-Menu oben rechts - Import Blueprint. JSON hochladen. ~12 Module sichtbar. Module mit rotem ! - Connection neu zuweisen.",
         "Speicher Scenario sofort als Draft.",
         "'Module type unknown' - Premium-only Modul. Switch zu Standard.",
         "12 Module sichtbar, alle gruen."),
        ("3.8", "Placeholder ersetzen",
         "Werte einsetzen.", "4 min",
         "Pro Modul: {{beehiiv_pub_id}}, {{master_sheet_id}}, {{kpi_sheet_id}}, {{voice_validator_url}}, {{from_email}}, {{slack_channel}}.",
         "Modul fuer Modul - Make speichert kein Auto-Save im Edit-Mode!",
         "Falls {{...}}-Syntax stehen bleibt: 'Bundle does not contain key'.",
         "Kein Modul mit rotem !, alle Validated."),
        ("3.9", "Test-Run mit 1 Newsletter",
         "Manueller Trigger, dry-run.", "2 min",
         "Modul 'beehiiv Send' - Recipient-Filter auf allen+test@gmail.com. Schedule Trigger - manuelle Mode. Run once. 12 Module gruen, ~30s. Gmail-Inbox: Test-Newsletter.",
         "Wenn alles gruen: NICHT sofort Cron. 24h manual run waehrend Stripe + CF.",
         "Claude Summarize timeout - Anthropic langsam. Timeout 120s setzen.",
         "Test-Email in Inbox, alles gruen.")
    ]
    for num, title, desc, time, body, tip, err, ok in section3_steps:
        items = [
            P(f'<b>{num}  -  {title}</b>', H4),
            P(desc, BODY),
            P(f'<i>Time: {time}</i>', META),
            P(body, BODY),
            P(f'<b>Tipp:</b> {tip}', TIP) if tip else Spacer(1, 0.1),
            P(f'<b>Common Error:</b> {err}', ERRSTYLE) if err else Spacer(1, 0.1),
            P(f'<b>Expected:</b> {ok}', OK) if ok else Spacer(1, 0.1),
            Spacer(1, 6)
        ]
        story.extend(items)

    story.append(PageBreak())

    # ============ SECTION 4: APPS-SCRIPT ============
    story.append(P("4. Apps-Script Sheets-Setup", H1))
    story.append(P("<i>~5 Min  -  Free  -  7 Sub-Steps</i>", META))
    story.append(P("Master-Sheet mit 5 Tabs via Apps-Script (paste & run).", BODY))
    story.append(Spacer(1, 8))

    section4_steps = [
        ("4.1", "Apps-Script-Project oeffnen", "Sheet anlegen + Apps-Script.", "1 min",
         "sheets.new in allengchour@gmail.com. Titel: aban-news-master. Extensions - Apps Script.",
         "Sheet in Drive-Ordner 'aban-news' ablegen.",
         "'Extensions' greyed out - falscher Account.",
         "Apps-Script-Editor offen."),
        ("4.2", "Code reinpasten (Notepad-Variante)", "Bei Monaco-Editor-Problemen clipboard cleanen.", "1 min",
         "Code aus automation/setup-sheet.gs (oder Skeleton). Bei Monaco-Problemen: Notepad-Detour: Code in Notepad, Strg+A+C, dann Apps-Script.",
         "Monaco ist syntax-empfindlich. Notepad-Detour ist 30s, Hours-savings.",
         "'Syntax error: Unexpected token' - Strg+Z, sauber re-paste.",
         "Editor zeigt Code, Strg+S - 'Project saved'."),
        ("4.3", "Run setupAll()", "Funktions-Selektor + Run-Button.", "10 sec",
         "Dropdown 'Select function' - setupAll - Run. Erstmaliges Run: Authorization-Flow (siehe 4.4).",
         "Wenn Run hangt - andere Google-Tabs schliessen.",
         "",
         "Execution-Log: 'Execution completed'."),
        ("4.4", "Authorization-Flow (Google-Warning)", "'This app isn't verified' handhaben.", "30 sec",
         "Modal: Authorization required - Review permissions - allengchour - Warning: Advanced - Go to Untitled Project (unsafe) - Permissions: See/edit spreadsheets + Send email - Allow.",
         "Der 'unsafe'-Warning bleibt forever (Apps-Script ist nicht verified). Sicher solange DEIN Code.",
         "Benenne Project um auf 'aban-news-setup'.",
         "Modal schliesst, Script laeuft."),
        ("4.5", "Email mit Sheet-IDs check", "setupAll() schickt Mail.", "30 sec",
         "Sender: apps-scripts-notifications@google.com. Subject: 'aban-news Sheets setup done'. Body: Master Sheet ID (44 chars).",
         "Sheet-ID + Tab-Names hardcoded im Blueprint.",
         "Keine Mail - MailApp.sendEmail Quota 100/day.",
         "Sheet-ID in Hand + .sheets.env."),
        ("4.6", "Bonus: populateLinkedIn + populateReddit", "Seed-Daten.", "1 min",
         "Funktions-Dropdown - populateRedditQueue - Run. Dann populateLinkedInPosts.",
         "LinkedIn-Posts sind seed-data zum Nachjustieren, nicht Auto-Post.",
         "",
         "Tabs gefuellt."),
        ("4.7", "Sheet-IDs in Make einsetzen", "Zurueck zu 3.8.", "1 min",
         "In Make - Scenario - Google Sheets-Module - Spreadsheet-Feld - via Picker waehlen. Module: Sheets Log (AuditLog), KPI Update (KPIs), Subscriber Sync (Subscribers).",
         "Picker statt manuelle ID - weniger Fehler.",
         "",
         "3 Module mit validem Spreadsheet."),
    ]
    for num, title, desc, time, body, tip, err, ok in section4_steps:
        items = [
            P(f'<b>{num}  -  {title}</b>', H4),
            P(desc, BODY),
            P(f'<i>Time: {time}</i>', META),
            P(body, BODY),
            P(f'<b>Tipp:</b> {tip}', TIP) if tip else Spacer(1, 0.1),
            P(f'<b>Common Error:</b> {err}', ERRSTYLE) if err else Spacer(1, 0.1),
            P(f'<b>Expected:</b> {ok}', OK) if ok else Spacer(1, 0.1),
            Spacer(1, 6)
        ]
        story.extend(items)
    story.append(PageBreak())

    # ============ SECTION 5: STRIPE ============
    story.append(P("5. Stripe-CH-KYC", H1))
    story.append(P("<i>~20 Min aktiv + 2-3d KYC-Wait  -  Free, 1.5%+0.30 CHF  -  10 Sub-Steps  -  CH-spezifisch</i>", META))
    story.append(P("Payment-Processor fuer Founding-Memberships + Sponsorings.", BODY))
    story.append(Spacer(1, 8))

    section5_steps = [
        ("5.1", "Account anlegen", "dashboard.stripe.com/register, Land Schweiz.", "2 min",
         "Email: allengchour@gmail.com. Full name: Allen Ghour (wie Pass). Country: Switzerland.",
         "Auch ohne HR-Eintrag akzeptiert Stripe 'Individual/Sole Trader'. Brauchst AHV + Bankkonto.",
         "'This email already has an account' - Login statt Register.",
         "Dashboard offen, Test-Mode aktiv."),
        ("5.2", "CH-Einzelunternehmen-Settings", "Business-Type + AHV + UID.", "3 min",
         "Activate Payments - Business Details. Type: Individual/Sole Proprietorship. Name: aban news (Trade-Name). Legal: Allen Ghour. Address: CH-Wohnadresse. Industry: Online Media. Statement descriptor: ABAN NEWS (max 22 ASCII). VAT: Not registered.",
         "Verifiziere MwSt-Frage offiziell bei estv.admin.ch.",
         "Statement-Descriptor mit Umlaut - ASCII-only. ABAN NEWS safe.",
         "'Business details verified' - gelb."),
        ("5.3", "Bank-IBAN fuer Auszahlungen", "CH-IBAN, monthly default.", "1 min",
         "Add bank account. Country: Switzerland. Currency: CHF. IBAN. Account holder: muss zu Legal-Name matchen. Payout schedule: Monthly empfohlen fuer Newsletter.",
         "EUR-Zahlungen werden zu CHF konvertiert (~1% Spread). Wise als Alternative post-launch.",
         "'Account holder mismatch' - eigenes Konto noetig.",
         "'Bank account added, pending verification'."),
        ("5.4", "KYC-Dokumente: Pass + Adresse", "Personalausweis + Wohnsitzbeleg.", "3 min + 24-72h Review",
         "Documents-Tab. ID: CH-Pass-Foto beide Seiten, oder ID-Karte. Address: Stromrechnung/Krankenkasse (max 3 Monate alt). Smartphone-Scan-App nutzen, kein cropped Foto.",
         "Smartphone-Scan (iOS Notes, Android Drive) statt Foto - bessere Hit-Rate.",
         "'Document unclear' - bessere Lichtquelle, dunkler Hintergrund.",
         "'Documents under review' - gelb, 24-72h."),
        ("5.5", "Tax-Info: CHF, no VAT", "Schweiz-spezifische Felder.", "2 min",
         "Tax-Country: Switzerland. UID: leer wenn keine Einzelfirma im HR. VAT: Not registered. 1099-K: NEIN. Tax-Behavior: Inclusive (Brutto).",
         "CH-Einzelfirma: einkommensteuerpflichtig auf Gewinn, MwSt-frei bis CHF 100k. Bexio ~30 CHF/mo.",
         "",
         "'Tax info complete'."),
        ("5.6", "3 Produkte anlegen", "Founding 149 EUR + Monthly 9 EUR + Yearly 99 EUR.", "4 min",
         "P1 Founding: One-time 149 EUR, Description: Lifetime access, 100 Plaetze. P2 Premium-Monthly: Recurring 9 EUR/mo, Trial 7 days. P3 Premium-Yearly: Recurring 99 EUR/yr, Trial 7 days.",
         "EUR statt CHF default - DE/AT-Markt 5x groesser. CH-Kaeufer zahlen EUR via Twint/Karte.",
         "'Trial cannot be set on one-time' - richtig, nur Recurring.",
         "3 Produkte active."),
        ("5.7", "Payment-Links generieren", "Hosted checkout-URLs fuer Landing-Pages.", "1 min",
         "Pro Produkt: Create payment link. Founding-Link in founding.html, Monthly+Yearly in preview.html. Success-URL: abannews.com/willkommen.html?stripe_id={CHECKOUT_SESSION_ID}. Cancel-URL: abannews.com/founding.html?stripe_canceled=1.",
         "Mit {CHECKOUT_SESSION_ID} kannst du spaeter Bestell-Daten via Stripe-API pullen.",
         "Cancel-URL = Success-URL - Stripe macht beides leise.",
         "3 Payment-Links eingesetzt + committed."),
        ("5.8", "Webhook-Setup fuer Make", "Stripe - Make on payment-success.", "2 min",
         "Make neues Scenario - Webhook Trigger - URL kopieren. Stripe - Developers - Webhooks - Add. Events: checkout.session.completed + customer.subscription.updated/deleted. Signing secret in .stripe.env.",
         "Signing-Secret-Verification implementieren - sonst Fake-Stripe-Payloads moeglich.",
         "'Webhook delivery failed' - Make-Scenario muss 'On' sein, nicht Draft.",
         "Test-Send aus Stripe-UI - Make-Log '1 ok'."),
        ("5.9", "Test-Mode mit 4242 Karte", "5 Test-Orders.", "5 min",
         "Test-Mode aktiv. Karten: Success 4242 4242 4242 4242. Decline 4000 0000 0000 0002. 3DS-Challenge 4000 0027 6000 3184. Insufficient 4000 0000 0000 9995. 5 Szenarien: Success Founding, Monthly Trial, 3DS, Decline, Refund.",
         "5 Tests minimum vor Live-Mode.",
         "3DS-Challenge - bei Live haengt der Kaeufer (Bank-Push-Notification vergessen). Disclaimer in Welcome-Mail.",
         "5/5 Szenarien gruen, kein Make-Error."),
        ("5.10", "Switch zu Live-Mode", "NACH 5 gruenen Tests + KYC-Approval.", "30 sec",
         "Voraussetzungen: 5.9 alle gruen, 5.4 KYC approved (gruener Banner), 5.3 Bank verified. Test-Mode-Toggle aus. Produkte+Links nochmal generieren (separate im Live). Webhook nochmal mit Live-Signing-Key.",
         "NICHT am Launch-Tag selbst switchen - 1-2 Tage davor. Live-Karten verhalten sich anders als Test-Karten.",
         "'Live mode disabled until KYC approved' - warten.",
         "Kein 'Test mode'-Banner mehr."),
    ]
    for num, title, desc, time, body, tip, err, ok in section5_steps:
        items = [
            P(f'<b>{num}  -  {title}</b>', H4),
            P(desc, BODY),
            P(f'<i>Time: {time}</i>', META),
            P(body, BODY),
            P(f'<b>Tipp:</b> {tip}', TIP) if tip else Spacer(1, 0.1),
            P(f'<b>Common Error:</b> {err}', ERRSTYLE) if err else Spacer(1, 0.1),
            P(f'<b>Expected:</b> {ok}', OK) if ok else Spacer(1, 0.1),
            Spacer(1, 6)
        ]
        story.extend(items)
    story.append(PageBreak())

    # ============ SECTION 6: CLOUDFLARE ============
    story.append(P("6. Cloudflare-Worker + DNS", H1))
    story.append(P("<i>~10 Min  -  Free-Tier  -  6 Sub-Steps</i>", META))
    story.append(P("DNS bei Cloudflare, Email-Routing, Worker fuer Voice-Validator.", BODY))
    story.append(Spacer(1, 8))

    section6_steps = [
        ("6.1", "Cloudflare-Account (gratis)", "Wenn nicht vorhanden.", "2 min",
         "URL: dash.cloudflare.com/sign-up. Email: allengchour. 2FA: TOTP (Authy/1Password) - DNS = sensitive.",
         "2FA nicht verhandelbar - jemand mit CF-Access kann deine Domain entfuehren (MX umlenken, Reset-Mails abfangen).",
         "",
         "Dashboard offen, 'Add a site'."),
        ("6.2", "Domain abannews.com hinzufuegen", "CF scannt Porkbun-DNS, importiert.", "1 min",
         "+ Add site - abannews.com - Plan: Free. CF scannt existing DNS. Review: GitHub-Pages-IPs, MX, TXT - alle aktiv lassen. Bonus-Records aus 1.7 hier hinzufuegen.",
         "CF-Scan 90% korrekt. Review vor Continue.",
         "'Couldn't find DNS records' - Porkbun noch nicht propagiert. 30 Min warten.",
         "10-15 Records mit korrekten Proxy-Stati."),
        ("6.3", "Nameserver bei Porkbun aktualisieren", "CF gibt 2 NS-Strings.", "2 min + ~30 Min Propagation",
         "CF zeigt 2 NS (random Names z.B. kate/tom.ns.cloudflare.com). Porkbun - Domain-List - abannews.com - Details - Authoritative nameservers - Edit. CF-NS einsetzen.",
         "DNS-Propagation meist <1h. Section 6.4 parallel vorbereiten.",
         "'Nameservers don't match' - exakt copy-paste, kein Whitespace. CNAME-Setup alternativ wenn du Porkbun-DNS behalten willst.",
         "CF: 'Active' gruener Status."),
        ("6.4", "Email-Routing aktivieren", "hallo@ + datenschutz@ - Gmail forward.", "2 min",
         "CF - abannews.com - Email - Email Routing - Get started. CF fuegt 3 MX + 1 TXT hinzu. Rules: hallo@, datenschutz@, impressum@, support@ - alle - allengchour@gmail.com. Catch-all optional. Verify forwarding-target (Gmail).",
         "Gmail-Filter: alle Mails von 'via-cloudflare'-Header - Label 'aban-news-mail'.",
         "'Domain not active yet' - DNS noch nicht propagiert. 1h warten. beehiiv MX-Conflict bei Subdomain mail. - lebt parallel mit root-MX bei CF.",
         "Send Mail an hallo@abannews.com - kommt in Gmail <30s."),
        ("6.5", "Wrangler + Worker deployen", "Voice-Validator-Worker via wrangler-CLI.", "4 min",
         "npm install -g wrangler. wrangler login (Browser-OAuth). cd ~/aban-deploy/automation/cf-worker-validator. wrangler deploy. URL kopieren: https://aban-voice-validator.X.workers.dev.",
         "Free-Tier 100k requests/day - niemals nahe dran (1 Newsletter/day = 1 req).",
         "'You need to verify email' - neue CF-Accounts. 'wrangler command not found' - Node-PATH. node --version, dann nodejs.org.",
         "URL aktiv, curl test passes."),
        ("6.6", "Worker-URL in Make einsetzen", "Zurueck zu 3.6.", "30 sec",
         "Make-Scenario - Modul 'Voice-Validator-Call' - URL-Feld - Worker-URL einsetzen. Test-Call.",
         "Worker-URL auch in .cloudflare.env: WORKER_VOICE_VALIDATOR=...",
         "",
         "Make-Test-Call gruen, Score+Forbidden im Output."),
    ]
    for num, title, desc, time, body, tip, err, ok in section6_steps:
        items = [
            P(f'<b>{num}  -  {title}</b>', H4),
            P(desc, BODY),
            P(f'<i>Time: {time}</i>', META),
            P(body, BODY),
            P(f'<b>Tipp:</b> {tip}', TIP) if tip else Spacer(1, 0.1),
            P(f'<b>Common Error:</b> {err}', ERRSTYLE) if err else Spacer(1, 0.1),
            P(f'<b>Expected:</b> {ok}', OK) if ok else Spacer(1, 0.1),
            Spacer(1, 6)
        ]
        story.extend(items)
    story.append(PageBreak())

    # ============ SECTION 7: OUTREACH ============
    story.append(P("7. First-30-Subscriber-Outreach", H1))
    story.append(P("<i>~60 Min Send + Tracking  -  Free (deine Zeit)  -  6 Sub-Steps</i>", META))
    story.append(P("Der echte Marathon. Die ersten 30 Subs sind nicht skalierbar - sie sind hand-crafted.", BODY))
    story.append(Spacer(1, 8))

    section7_steps = [
        ("7.1", "WhatsApp-Liste vorbereiten", "10 Family + 10 Friends + 10 Business.", "10 min",
         "Master-Sheet - neuer Tab 'OutreachQueue'. Spalten: Name|Phone|Channel|Tier|Sent?|Replied?|Sub'd?|Notes. 3 Gruppen je 10: Family (Tier F), Friends (Fr), Business (B). NICHT nur Tech-Bubble.",
         "Family-Tier zuerst - sie antworten am ehrlichsten ('Allen ich versteh kein Wort').",
         "Wenn keine 30 - nimm 20. Qualitaet schlaegt Quantitaet.",
         "30 Rows mit Phone-Numbers."),
        ("7.2", "Template-Anpassung pro Channel", "3 verschiedene Messages.", "10 min",
         "Family-Template: kurz, persoenlich, 'kleines Projekt'. Friends-Template: charme + konkretes ('1 Mail/Tag, kein Hype'). Business-Template: Wertversprechen + Reziprozitaet (offer Recherche-Tools / Call).",
         "Familie: echte Beziehungssprache (Mami, Andrea - nicht [Name]). Friends: Inside-Joke. Business: 'in it for them'.",
         "Generisches 'schau mal rein' - 5% Conversion. Personalisiert: 30-40%.",
         "3 Templates ready."),
        ("7.3", "Send-Pacing (max 5/Std)", "Spam-Detection Vermeidung.", "6h total ueber 2 Tage",
         "Tag 1: 9-10h Family (5), 12-13h Family (5), 19-20h Friends (5). Tag 2: 9-10h Friends (5), 12-13h Business (5), 17-18h Business (5). Pro Send: min 1 Zeile Personalization.",
         "10-Min-Timer nach jedem Batch - wenn jemand sofort antwortet, sofort zurueck. Conversion verdoppelt.",
         "WhatsApp temp-ban bei >10 DMs/30min an neue Kontakte. Pacing einhalten.",
         "30 Messages verschickt, alle persoenlich."),
        ("7.4", "Tracking-Sheet", "Wer, wann, was, ob subscribed.", "5 min + laufend",
         "Spalten erweitern: Sent-Datum, Replied(J/N), Sub'd(J/N), Bounce-Reason, Quote. Conversion-Rates: Family 70-80%, Friends 40-60%, Business 25-35%. Total ~14-22 Subs aus 30.",
         "Nach 1 Woche bei Non-Subscribers nachfragen: 'hab dich vergessen, letzte Ausgabe als Bsp: [link]'. +30% kommen dann doch.",
         "",
         "Sheet gefuellt, 14-22 Conversions getrackt."),
        ("7.5", "Response-Handling-Patterns", "Skripts fuer 5 haeufigste Reaktionen.", "5 min vorab + laufend",
         "(1) 'Cool, subscribed!' - 'Mega, sag mir morgen ehrlich was du denkst.' (2) 'Was kostet?' - 'Gratis, optional Premium spaeter.' (3) 'Wer dahinter?' - '/about'. (4) 'Spam?' - '1 Mail/Tag, 1-Klick-Aus, /datenschutz'. (5) 'Nicht interessiert' - 'Alles gut! Forward dankbar.'",
         "Wertvollste Antworten als WhatsApp-Sticker oder Notes-Templates. Spart 15 Min total.",
         "Nicht in Verteidigung gehen - 'Newsletter ist tot' - 'Klar verstehe ich, viele News sind Mist. Mein Ansatz ist 5-Min-Daily. Falls's nicht passt, OK.'",
         "Klarer Mental-Plan fuer 5 Szenarien."),
        ("7.6", "Conversion-Optimization", "Wenn 2-3x Nachfragen.", "ad-hoc, ~15 min total",
         "Bei 2-3x Nachfragen - Confidence noetig. Preview-Link senden: abannews.com/preview.html. 'Schau 3 Min, wenn nicht ueberzeugt: zero hard feelings.' Magic-Question: 'Was war das letzte Mal wo du AI besser verstehen wolltest?' - Gold-Material fuer erste Newsletter. Reziprozitaet: hilf zuerst (Reise-Tipp, Restaurant), dann nachhaken - 80% Conversion.",
         "Niemand mag Sales-Pressure. Bei 3x 'spaeter' - lass los. In 3 Monaten Slow-Burn-Touch.",
         "",
         "5-7 Hardcore-Skeptiker geoeffnet, 2-3 converted."),
    ]
    for num, title, desc, time, body, tip, err, ok in section7_steps:
        items = [
            P(f'<b>{num}  -  {title}</b>', H4),
            P(desc, BODY),
            P(f'<i>Time: {time}</i>', META),
            P(body, BODY),
            P(f'<b>Tipp:</b> {tip}', TIP) if tip else Spacer(1, 0.1),
            P(f'<b>Common Error:</b> {err}', ERRSTYLE) if err else Spacer(1, 0.1),
            P(f'<b>Expected:</b> {ok}', OK) if ok else Spacer(1, 0.1),
            Spacer(1, 6)
        ]
        story.extend(items)
    story.append(PageBreak())

    # ============ APPENDIX ============
    story.append(P("Appendix: Time-Plan + Conversion-Math", H1))
    story.append(Spacer(1, 6))
    story.append(P("Time-Estimate fuer kompletten Launch-Day", H3))
    timetable = [
        ["Section", "Aktiv (Min)", "Wait (Tage)", "Tipp"],
        ["1. beehiiv", "10", "1 (DNS)", "morgens starten"],
        ["2. OpenAI", "5", "0", "parallel zu 1"],
        ["3. Make-Wiring", "15", "0", "nach 1 + 2"],
        ["4. Apps-Script", "5", "0", "Mittagspause"],
        ["5. Stripe-KYC", "20", "2-3 (KYC)", "Tag -3 vor Launch"],
        ["6. Cloudflare", "10", "0", "parallel zu 1.8"],
        ["7. Outreach", "60", "0", "Abend Tag-0 + Tag+1"],
        ["TOTAL aktiv", "125 Min (~2h)", "", ""],
    ]
    t = Table(timetable, colWidths=[4*cm, 3*cm, 3*cm, 6*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), ACCENT),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ALIGN", (1,0), (2,-1), "CENTER"),
        ("GRID", (0,0), (-1,-1), 0.3, MUTED),
        ("BACKGROUND", (0,-1), (-1,-1), HexColor("#e9e9f5")),
        ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 16))

    story.append(P("Conversion-Math: was du erwarten kannst", H3))
    convtable = [
        ["Outreach-Channel", "Sent", "Reply-Rate", "Sub-Rate", "Erwartete Subs"],
        ["WhatsApp Family", "10", "90%", "70-80%", "7-8"],
        ["WhatsApp Friends", "10", "70%", "40-60%", "4-6"],
        ["WhatsApp Business", "10", "50%", "25-35%", "3-4"],
        ["Total", "30", "~70%", "~50%", "14-18"],
    ]
    t = Table(convtable, colWidths=[5*cm, 2*cm, 2.5*cm, 2.5*cm, 3.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), ACCENT2),
        ("TEXTCOLOR", (0,0), (-1,0), white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ALIGN", (1,0), (-1,-1), "CENTER"),
        ("GRID", (0,0), (-1,-1), 0.3, MUTED),
        ("BACKGROUND", (0,-1), (-1,-1), HexColor("#e9e9f5")),
        ("FONTNAME", (0,-1), (-1,-1), "Helvetica-Bold"),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(P("Wenn-X-dann-Y Plays", H3))
    story.append(P("<b>Wenn KYC bei Stripe haengt &gt;72h:</b> Support-Ticket bei stripe.com/contact mit Subject 'CH Sole Trader KYC delayed'. Vorlauf 2 Werktage.", BODY))
    story.append(P("<b>Wenn beehiiv-DKIM &gt;48h pending:</b> in Porkbun-DNS pruefen ob '_DKIM' versus 'DKIM' Host-Format. Quotes im Value-Feld entfernen.", BODY))
    story.append(P("<b>Wenn Make-Pipeline-Error 'insufficient_credits':</b> Make Free-Tier 1000 ops/mo. Bei 12 Module/Run x 30 Runs/Monat = 360 ops. Plenty. Wenn trotzdem leer: bestehende Test-Scenarios auf 'inactive' setzen.", BODY))
    story.append(P("<b>Wenn nach 7 Tagen &lt;10 Subs:</b> nicht die Welt. Re-do Section 7 mit naeheren 2nd-degree-Connections - Friends-of-Friends per WhatsApp-Forward.", BODY))
    story.append(Spacer(1, 12))

    story.append(P("Quality-Gates vor Launch-Tag", H3))
    gates = [
        "[ ] Section 1 (beehiiv) abgeschlossen + Test-Sub funktioniert",
        "[ ] Section 2 (OpenAI) abgeschlossen + curl-Test gruen",
        "[ ] Section 3 (Make) abgeschlossen + Test-Newsletter angekommen",
        "[ ] Section 4 (Sheets) abgeschlossen + 5 Tabs sichtbar",
        "[ ] Section 5 (Stripe) KYC approved + 5 Test-Orders gruen + Live-Mode",
        "[ ] Section 6 (Cloudflare) DNS active + Email-Routing testet",
        "[ ] Section 7 (Outreach) - 30 Messages vorbereitet, 1. Batch verschickt",
        "[ ] Backup: alle .env-Files in 1Password-Vault 'aban-news-prod'",
        "[ ] /sitemap.xml + /robots.txt mit /launch-manual.html (noindex)",
        "[ ] launch-manual.html LIVE auf abannews.com - Test-Reload aus 1 anderen Browser",
    ]
    for g in gates:
        story.append(P(g, SMALL))
    story.append(Spacer(1, 14))

    story.append(P("Ende des Manuals - viel Erfolg beim Launch-Day!", BODY))
    story.append(P("Letzte Update: " + str(date.today()) + "  -  Version v1.0", META))

    return story

def build():
    doc = SimpleDocTemplate(
        OUT, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="aban news Launch-Day-Manual",
        author="aban news",
    )
    story = build_story()
    doc.build(story, onFirstPage=cover_page, onLaterPages=add_footer)
    print(f"PDF written: {OUT}")
    print(f"Size: {os.path.getsize(OUT)} bytes ({os.path.getsize(OUT)/1024:.1f} KB)")

if __name__ == "__main__":
    build()
