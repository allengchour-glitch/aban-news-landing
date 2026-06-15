/* aban Engine — gemeinsamer Kopf (Marke + Schnell-Nav + globale Suche) auf allen Seiten
   + Hub-Grid auf der Startseite (Element #aban-hub).
   Selbst-gestylt (Präfix .abn-), defensiv, idempotent, druck-ausgeblendet.
   Opt-out je Seite per <meta name="aban-nav" content="off"> oder Kommentar <!-- no-aban-nav -->. */
(function () {
  if (window.__abanNav) return;
  window.__abanNav = true;
  try {
    var off = document.querySelector('meta[name="aban-nav"]');
    if (off && off.content === "off") return;

    /* Schnell-Nav oben */
    var NAV = [
      ["🏠 Start", "/"],
      ["🔎 Suche", "/suche.html"],
      ["🛒 Marktplatz", "/marktplatz.html"],
      ["🔥 Angebote", "/angebote-suche.html"],
      ["💼 Jobs", "/stellenangebote.html"],
      ["💼 Leistungen", "/leistungen.html"],
      ["✉️ Kontakt", "/kontakt.html"],
      ["🧰 Tools", "/online-tools.html"],
      ["🤖 KI-Studio", "/ki-studio.html"],
      ["📚 KI-Anleitungen", "/ki-anleitungen.html"],
      ["📈 Märkte", "/maerkte.html"],
      ["🧭 Dossiers", "/dossiers.html"],
      ["💼 Cockpit", "/cockpit-app.html"]
    ];

    /* Katalog für Suche + Hub */
    var CAT = [
      ["Startseite", "/", "Start", "Übersicht, Newsletter & alle Bereiche"],
      ["Online-Tools", "/online-tools.html", "Start", "Katalog aller kostenlosen Tools"],
      ["Leistungen (Übersicht)", "/leistungen.html", "Leistungen", "Website, Shop & Texte — wir bauen's für dich"],
      ["Website erstellen lassen", "/website-erstellen-lassen.html", "Leistungen", "Profi-Website zum Festpreis, in Tagen"],
      ["Online-Shop erstellen lassen", "/online-shop-erstellen-lassen.html", "Leistungen", "Shop eingerichtet & verkaufsbereit"],
      ["SEO-Texte schreiben lassen", "/seo-texte-schreiben-lassen.html", "Leistungen", "Texte, die bei Google ranken"],
      ["Texte schreiben lassen", "/texte-schreiben-lassen.html", "Leistungen", "Web-, Produkt- & Über-uns-Texte"],
      ["Anfrage / Kontakt", "/kontakt.html", "Leistungen", "Unverbindlich anfragen — Festpreis & Plan"],
      ["Digitale Produkte", "/digitale-produkte.html", "Leistungen", "Prompt-Pack, Checklisten, Vorlagen"],
      ["Universal-Suche", "/suche.html", "Start", "Jobs, Angebote & Inserate mit einer Suche auf einmal"],
      ["Marktplatz", "/marktplatz.html", "Start", "Jobs, Auto, Immobilien, Angebote & Inserate an einem Ort (CH/DACH)"],
      ["Angebote-Suche", "/angebote-suche.html", "Start", "Schnäppchen aus vielen Kategorien finden (eBay)"],
      ["Auto & Fahrzeuge", "/auto-suche.html", "Start", "PKW, Teile, Reifen & Zubehör suchen"],
      ["Immobilien & Wohnungen", "/immobilien.html", "Start", "Wohnung, Haus, WG & Gewerbe (CH/DACH) suchen oder inserieren"],
      ["Auto kaufen Schweiz", "/auto-kaufen-schweiz.html", "Start", "Occasionen, Neuwagen, Teile — Ratgeber + Suche"],
      ["Wohnung mieten Schweiz", "/wohnung-mieten-schweiz.html", "Start", "Mietwohnungen, WG & Haus finden (CH)"],
      ["Möbel kaufen Schweiz", "/moebel-kaufen-schweiz.html", "Start", "Möbel neu & gebraucht — Ratgeber + Suche"],
      ["Handy kaufen Schweiz", "/handy-kaufen-schweiz.html", "Start", "Smartphones neu & gebraucht (CH)"],
      ["Velo kaufen Schweiz", "/velo-kaufen-schweiz.html", "Start", "Velos & E-Bikes finden (CH)"],
      ["Job finden Schweiz", "/job-finden-schweiz.html", "Start", "Offene Stellen & Remote in der Schweiz"],
      ["Garten kaufen Schweiz", "/garten-kaufen-schweiz.html", "Start", "Gartenmöbel, Geräte & Pflanzen (CH)"],
      ["Werkzeug kaufen Schweiz", "/werkzeug-kaufen-schweiz.html", "Start", "Maschinen & Heimwerker-Werkzeug (CH)"],
      ["Mode kaufen Schweiz", "/mode-kaufen-schweiz.html", "Start", "Kleidung, Schuhe & Secondhand (CH)"],
      ["Gaming kaufen Schweiz", "/gaming-kaufen-schweiz.html", "Start", "Konsolen, Spiele & Gaming-PC (CH)"],
      ["Haustier-Zubehör Schweiz", "/haustier-zubehoer-schweiz.html", "Start", "Zubehör für Hund, Katze & Co. (CH)"],
      ["Sportartikel kaufen Schweiz", "/sport-kaufen-schweiz.html", "Start", "Fitness, Ski & Outdoor (CH)"],
      ["Kamera kaufen Schweiz", "/kamera-kaufen-schweiz.html", "Start", "Foto, Objektive & Zubehör (CH)"],
      ["Computer kaufen Schweiz", "/computer-kaufen-schweiz.html", "Start", "Laptops, PCs & Zubehör (CH)"],
      ["Küche & Haushalt Schweiz", "/kueche-kaufen-schweiz.html", "Start", "Küchengeräte & Haushalt (CH)"],
      ["Baby & Kind Schweiz", "/baby-kind-kaufen-schweiz.html", "Start", "Kinderwagen, Kleidung & Spielzeug (CH)"],
      ["E-Bike kaufen Schweiz", "/ebike-kaufen-schweiz.html", "Start", "Elektrovelos neu & gebraucht (CH)"],
      ["Uhren & Schmuck Schweiz", "/uhren-schmuck-kaufen-schweiz.html", "Start", "Uhren & Schmuck neu & second-hand (CH)"],
      ["Occasion Auto Schweiz", "/occasion-auto-schweiz.html", "Start", "Gebrauchtwagen finden & vergleichen (CH)"],
      ["Motorrad kaufen Schweiz", "/motorrad-kaufen-schweiz.html", "Start", "Töff, Roller & Zubehör (CH)"],
      ["Wohnmobil kaufen Schweiz", "/wohnmobil-kaufen-schweiz.html", "Start", "Camper & Wohnmobile (CH)"],
      ["Umzug Schweiz", "/umzug-schweiz.html", "Start", "Zügelfirma finden & vergleichen (CH)"],
      ["Haus kaufen Schweiz", "/haus-kaufen-schweiz.html", "Start", "Einfamilienhäuser & Liegenschaften (CH)"],
      ["Wohnung kaufen Schweiz", "/wohnung-kaufen-schweiz.html", "Start", "Eigentumswohnungen finden (CH)"],
      ["Büro mieten Schweiz", "/buero-mieten-schweiz.html", "Start", "Büro- & Gewerbeflächen (CH)"],
      ["Fahrrad-Angebote", "/fahrrad-angebote.html", "Start", "Fahrräder günstig finden & vergleichen"],
      ["Handy-Angebote", "/handy-angebote.html", "Start", "Smartphones günstig finden & vergleichen"],
      ["Möbel-Angebote", "/moebel-angebote.html", "Start", "Möbel günstig finden & vergleichen"],
      ["Gaming-Angebote", "/gaming-angebote.html", "Start", "Konsolen & Games günstig finden"],
      ["Kamera-Angebote", "/kamera-angebote.html", "Start", "Kameras & Foto günstig finden"],
      ["Werkzeug-Angebote", "/werkzeug-angebote.html", "Start", "Werkzeug günstig finden & vergleichen"],
      ["Kleinanzeigen / Inserate", "/inserate.html", "Start", "Kostenlos suchen & selbst aufgeben"],
      ["Aufträge & Jobs", "/auftraege.html", "Start", "Projekte & Aufträge für Selbstständige (Feed)"],
      ["Stellenangebote (Jobs suchen)", "/stellenangebote.html", "Start", "Tausende Jobs aus DACH & Remote durchsuchen"],
      ["Inserat aufgeben", "/inserat-aufgeben.html", "Start", "Eigene Kleinanzeige kostenlos einstellen"],
      ["KI-Studio", "/ki-studio.html", "Start", "KI-Funktionen & Anleitungen"],
      ["Märkte", "/maerkte.html", "Start", "Aktien, Krypto, Charts, KI-Sentiment"],
      ["Branchen", "/branchen.html", "Start", "KI-Ratgeber je Branche"],
      ["Dossiers", "/dossiers.html", "Start", "Themen-Dossiers zu KI & Datenschutz"],
      ["Business-Cockpit", "/business-cockpit.html", "Business", "Die Büro-App für Selbstständige (Info)"],
      ["Cockpit öffnen", "/cockpit-app.html", "Business", "Rechnung, Angebot, Kunden, Zeit, Rechner, Lernen"],
      ["Rechnung schreiben", "/rechnung-generator.html", "Business", "Rechnung erstellen & als PDF drucken"],
      ["Finanz-Rechner", "/finanz-rechner.html", "Business", "Rechner-Sammlung für den Geschäftsalltag"],
      ["Broker-Vergleich", "/broker-vergleich.html", "Business", "Depots im Vergleich (CH/DACH) — ehrlich, kein Hype"],
      ["Gratis Finanz-Checkliste", "/gratis-checkliste.html", "Business", "Checkliste für Selbstständige — zum Ausdrucken"],
      ["Ratgeber Selbstständige", "/selbststaendig-ratgeber.html", "Business", "Rechnung, Steuern, Stundensatz, Mahnwesen — verständlich erklärt"],
      ["Rechnung als Kleinunternehmer", "/rechnung-kleinunternehmer.html", "Business", "Ohne MwSt korrekt fakturieren — mit Hinweis-Texten"],
      ["Stundensatz für Freelancer", "/stundensatz-freelancer.html", "Business", "Formel + Beispiel: was du wirklich verlangen musst"],
      ["Steuer absetzen (Selbstständige)", "/steuer-absetzen-selbststaendig.html", "Business", "Welche Ausgaben du absetzen kannst"],
      ["Scheinselbstständigkeit vermeiden", "/scheinselbststaendigkeit.html", "Business", "Merkmale erkennen & richtig aufstellen"],
      ["Selbstständig anmelden", "/selbststaendig-anmelden.html", "Business", "Die ersten Schritte (CH/DE/AT) — von der Idee zur ersten Rechnung"],
      ["Selbstständig machen: Ideen", "/selbststaendig-machen-ideen.html", "Business", "Geschäftsideen 2026, auch ohne Eigenkapital"],
      ["Businessplan erstellen", "/businessplan-erstellen.html", "Business", "Aufbau, Vorlage & mit KI"],
      ["Freelancer-Plattformen", "/freelancer-plattformen.html", "Business", "Wo du Aufträge findest + Tipps"],
      ["Nebenberuflich selbstständig", "/nebenberuflich-selbststaendig.html", "Business", "Steuern, Krankenkasse & Start neben dem Job"],
      ["Kassenbuch führen", "/kassenbuch-fuehren.html", "Business", "Einfach erklärt + Gratis-Vorlage"],
      ["Rechnung schreiben: Muster", "/rechnung-schreiben-muster.html", "Business", "Vorlage zum Abschauen + PDF-Tool"],
      ["Umsatzsteuervoranmeldung", "/umsatzsteuervoranmeldung.html", "Business", "UStVA einfach erklärt (DE/AT)"],
      ["Angebot schreiben", "/angebot-schreiben.html", "Business", "Vorlage + Generator (mit/ohne MwSt)"],
      ["Buchhaltungssoftware-Vergleich", "/buchhaltungssoftware-vergleich.html", "Business", "lexoffice, sevdesk, bexio & Co. — ehrlich eingeordnet"],
      ["lexoffice vs. sevdesk", "/lexoffice-vs-sevdesk.html", "Business", "Head-to-head: für wen sich welches Tool lohnt"],
      ["Kostenloses Rechnungsprogramm", "/rechnungsprogramm-kostenlos.html", "Business", "Gratis Rechnung schreiben — worauf achten"],
      ["Rechnung Schritt für Schritt", "/rechnung-schritt-fuer-schritt.html", "Business", "In 6 Schritten zur ersten Rechnung (Anleitung)"],
      ["Rechnung ins Ausland", "/rechnung-ins-ausland.html", "Business", "Reverse-Charge (EU) & Drittland einfach erklärt"],
      ["Rechnung auf Englisch", "/rechnung-auf-englisch.html", "Business", "Englische Invoice: Vorlage + DE→EN-Vokabeln"],
      ["Kleinunternehmer-Grenze 2026", "/kleinunternehmer-grenze-2026.html", "Business", "Aktuelle Umsatzgrenzen DE/AT/CH"],
      ["Krankenversicherung Selbstständige", "/selbststaendig-krankenversicherung.html", "Business", "GKV/PKV, SVS, KVG — DE/AT/CH erklärt"],
      ["Buchhaltung für Anfänger", "/buchhaltung-fuer-anfaenger.html", "Business", "EÜR, Belege & ein einfaches System zum Start"],
      ["Privatrechnung schreiben", "/privatrechnung-schreiben.html", "Business", "Als Privatperson korrekt fakturieren"],
      ["Geschäftskonto-Vergleich", "/geschaeftskonto-vergleich.html", "Business", "Qonto, Kontist, Holvi & Co. für Selbstständige"],
      ["Kostenloses Geschäftskonto", "/geschaeftskonto-kostenlos.html", "Business", "Was wirklich gratis ist & für wen"],
      ["Qonto vs. Kontist", "/qonto-vs-kontist.html", "Business", "Head-to-head: welches Geschäftskonto passt"],
      ["Gewerbe anmelden — Kosten", "/gewerbe-anmelden-kosten.html", "Business", "Was die Anmeldung in DE/AT/CH kostet"],
      ["Homeoffice absetzen", "/homeoffice-absetzen.html", "Business", "Arbeitszimmer & Pauschale steuerlich nutzen"],
      ["Rechnung stornieren", "/rechnung-stornieren.html", "Business", "Rechnung korrigieren statt löschen"],
      ["Erste Kunden gewinnen", "/kunden-gewinnen.html", "Business", "9 ehrliche Wege ohne Werbebudget"],
      ["Steuererklärung Selbstständige", "/steuererklaerung-selbststaendige.html", "Business", "Unterlagen, EÜR, Absetzbares & Fristen"],
      ["Steuern sparen (Selbstständige)", "/steuern-sparen-selbststaendige.html", "Business", "10 legale Hebel"],
      ["Firmenwagen", "/firmenwagen-selbststaendige.html", "Business", "1%-Regel vs. Fahrtenbuch"],
      ["Reisekosten abrechnen", "/reisekosten-abrechnen.html", "Business", "Pauschalen, Belege, was absetzbar"],
      ["Lieferschein erstellen", "/lieferschein-erstellen.html", "Business", "Pflichtangaben + Vorlage"],
      ["Angebot vs. Kostenvoranschlag", "/angebot-vs-kostenvoranschlag.html", "Business", "Unterschied & Verbindlichkeit"],
      ["Mahnung: Vorlage", "/mahnung-vorlage.html", "Business", "Mahnstufen + Vorlage"],
      ["Skonto einfach erklärt", "/skonto-einfach-erklaert.html", "Business", "Was Skonto ist, mit Beispiel"],
      ["Abschlagsrechnung", "/abschlagsrechnung.html", "Business", "Teil-/Schlussrechnung richtig"],
      ["Gutschrift schreiben", "/gutschrift-schreiben.html", "Business", "Korrekturrechnung & Abgrenzung"],
      ["Kleingewerbe anmelden", "/kleingewerbe-anmelden.html", "Business", "Ablauf, Kosten, vs. Kleinunternehmer"],
      ["GbR gründen", "/gbr-gruenden.html", "Business", "Haftung, Vertrag, Schritte"],
      ["Freiberufler oder Gewerbe?", "/freiberufler-oder-gewerbe.html", "Business", "Abgrenzung & Folgen"],
      ["USt-IdNr. beantragen", "/umsatzsteuer-id-beantragen.html", "Business", "Wer braucht sie, wie, EU-Geschäfte"],
      ["Proforma-Rechnung", "/proforma-rechnung.html", "Business", "Was es ist & wofür"],
      ["Dauerrechnung", "/dauerrechnung.html", "Business", "Wiederkehrende Rechnungen richtig"],
      ["Zahlungsausfall vermeiden", "/zahlungsausfall-vermeiden.html", "Business", "Bonität, Anzahlung, Mahnwesen"],
      ["EÜR erstellen", "/euer-erstellen.html", "Business", "Einnahmen-Überschuss-Rechnung Schritt für Schritt"],
      ["MwSt-Rechner", "/mwst-rechner.html", "Rechner", "Netto ↔ Brutto, jeder Steuersatz"],
      ["Stundensatz-Rechner", "/stundensatz-rechner.html", "Rechner", "Was muss ich pro Stunde verlangen?"],
      ["Skonto-Rechner", "/skonto-rechner.html", "Rechner", "Lohnt sich früh zahlen?"],
      ["Verzugszinsen-Rechner", "/verzugszinsen-rechner.html", "Rechner", "Zinsen & Mahngebühr berechnen"],
      ["Zahlungsfrist-Rechner", "/zahlungsfrist-rechner.html", "Rechner", "Fälligkeit & Verzug bestimmen"],
      ["Prozent-Rechner", "/prozent-rechner.html", "Rechner", "Prozente, Auf- und Abschläge"],
      ["QR-Code erstellen", "/qr-code.html", "Tools", "QR-Codes generieren"],
      ["Passwort-Generator", "/passwort-generator.html", "Tools", "Sichere Passwörter erzeugen"],
      ["Hash-Generator", "/hash-generator.html", "Tools", "MD5, SHA & Co."],
      ["UUID-Generator", "/uuid-generator.html", "Tools", "Eindeutige IDs erzeugen"],
      ["JSON-Formatter", "/json-formatter.html", "Tools", "JSON prüfen & formatieren"],
      ["Regex-Tester", "/regex-tester.html", "Tools", "Reguläre Ausdrücke testen"],
      ["Timestamp-Konverter", "/timestamp-konverter.html", "Tools", "Unix-Zeit umrechnen"],
      ["Farb-Umrechner", "/farb-umrechner.html", "Tools", "HEX, RGB, HSL"],
      ["Zeichenzähler", "/zeichenzaehler.html", "Tools", "Zeichen & Wörter zählen"],
      ["Cron-Generator", "/cron-generator.html", "Tools", "Cron-Ausdrücke bauen"],
      ["Namen-Generator", "/namen-generator.html", "Tools", "Ideen für Namen"],
      ["KI-Anleitungen (Hub)", "/ki-anleitungen.html", "KI", "Alle KI-How-tos: Texte, Excel, Bilder, Web …"],
      ["KI-Prompts: Beispiele", "/ki-prompts-beispiele.html", "KI", "Fertige Prompts + Formel zum Kopieren"],
      ["KI übersetzen", "/ki-uebersetzen.html", "KI", "Text mit KI übersetzen — Qualität & Grenzen"],
      ["KI-Logo erstellen", "/ki-logo-erstellen.html", "KI", "Logo mit KI + Rechte-Hinweis"],
      ["KI-Video erstellen", "/ki-video-erstellen.html", "KI", "Text-zu-Video: was realistisch geht"],
      ["KI-Musik erstellen", "/ki-musik-erstellen.html", "KI", "Musik mit KI + Nutzungsrechte"],
      ["KI für Marketing", "/ki-fuer-marketing.html", "KI", "Social-Posts, Anzeigen-Texte, Ideen"],
      ["KI für Podcast", "/ki-fuer-podcast.html", "KI", "Skript, Schnitt, Transkript mit KI"],
      ["KI-Untertitel erstellen", "/ki-untertitel-erstellen.html", "KI", "Captions/SRT automatisch"],
      ["KI für YouTube", "/ki-fuer-youtube.html", "KI", "Titel, Beschreibung, Skript"],
      ["KI-Chatbot erstellen", "/ki-chatbot-erstellen.html", "KI", "Eigenen Chatbot: Wege & Kosten"],
      ["KI für deine Branche", "/branchen.html", "KI", "Praxis-Ratgeber je Branche"],
      ["KI-Audit", "/ki-audit.html", "KI", "Wo KI dir wirklich hilft"],
      ["KI-Readiness-Check", "/ki-readiness-check.html", "KI", "Wie bereit bist du für KI?"],
      ["KI-Chatbots", "/ki-chatbots.html", "KI", "Chatbots verstehen & nutzen"],
      ["Welche KI für was?", "/welche-ki-fuer-was.html", "KI", "Das richtige Modell wählen"],
      ["KI für Präsentationen", "/ki-fuer-praesentationen.html", "KI", "PowerPoint & Folien schneller mit KI"],
      ["KI für Hausarbeiten", "/ki-fuer-hausarbeiten.html", "KI", "Recherche & Schreiben ehrlich nutzen"],
      ["KI für Lehrkräfte", "/ki-fuer-lehrer.html", "KI", "Arbeitsblätter, Differenzierung, Elternbriefe"],
      ["KI-Bilder kostenlos", "/ki-bilder-erstellen-kostenlos.html", "KI", "Gratis Bilder per Text + Nutzungsrechte"],
      ["KI für Excel", "/ki-fuer-excel.html", "KI", "Formeln & Tabellen per Text erstellen"],
      ["KI Excel-Tabelle erstellen", "/ki-excel-tabelle-erstellen.html", "KI", "Ganze Tabelle aus einem Ziel aufbauen"],
      ["KI für Bewerbung", "/ki-fuer-bewerbung.html", "KI", "Anschreiben & Lebenslauf mit KI"],
      ["KI-Website erstellen", "/ki-website-erstellen.html", "KI", "Eigene Seite mit KI-Builder"],
      ["Eigene Website erstellen", "/eigene-website-erstellen.html", "KI", "Baukasten/WordPress, Kosten & Schritte"],
      ["Online-Shop erstellen", "/online-shop-erstellen.html", "KI", "Shopify vs. WooCommerce & Recht"],
      ["Kostenlose KI-Tools", "/kostenlose-ki-tools.html", "KI", "Gratis-Helfer sortiert nach Aufgabe"],
      ["KI-Text umschreiben", "/ki-text-umschreiben.html", "KI", "Paraphrasieren, kürzen, Ton ändern"],
      ["Text zusammenfassen (KI)", "/text-zusammenfassen-ki.html", "KI", "Lange Texte in Kernpunkte"],
      ["KI-Text humanisieren", "/ki-text-humanisieren.html", "KI", "Ehrlich: Detektoren & Grenze zur Täuschung"],
      ["KI-Tools-Vergleich", "/ki-tools-vergleich.html", "KI", "ChatGPT vs Claude vs Gemini — ehrlich verglichen"],
      ["KI-Kosten-Rechner", "/ki-kosten-rechner.html", "KI", "API-Kosten abschätzen"],
      ["KI-Token-Rechner", "/ki-token-rechner.html", "KI", "Tokens & Preise berechnen"],
      ["Geld & KI", "/geld-und-ki.html", "KI", "Mit KI Geld sparen und verdienen"],
      ["Über aban", "/about.html", "Info", "Wer hinter aban steckt"],
      ["Impressum", "/impressum.html", "Info", "Rechtliche Angaben"],
      ["Datenschutz", "/datenschutz.html", "Info", "Datenschutzerklärung"]
    ];

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    var CATICON = { "Start": "🏠", "Business": "💼", "Rechner": "🧮", "Tools": "🧰", "KI": "🤖", "Info": "ℹ️" };

    var css = ""
      + ".abn-bar{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:linear-gradient(100deg,#171f2b 0%,#1f2937 45%,#2a2118 100%);color:#fff;font-size:13px;position:relative;z-index:9000;box-shadow:inset 0 -2px 0 0 #d97706,0 3px 14px rgba(0,0,0,.22)}"
      + ".abn-in{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:7px 14px;flex-wrap:wrap}"
      + ".abn-brand{font-weight:900;text-decoration:none;font-size:16px;letter-spacing:.5px;color:#f0a93a;background:linear-gradient(92deg,#fbbf24,#f0a93a 55%,#fb923c);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;display:inline-flex;align-items:center;gap:6px}"
      + ".abn-brand::before{content:'';width:8px;height:8px;border-radius:50%;background:#f0a93a;-webkit-text-fill-color:initial;box-shadow:0 0 0 0 rgba(240,169,58,.6);animation:abnpulse 2.4s ease-out infinite}"
      + "@keyframes abnpulse{0%{box-shadow:0 0 0 0 rgba(240,169,58,.55)}70%{box-shadow:0 0 0 7px rgba(240,169,58,0)}100%{box-shadow:0 0 0 0 rgba(240,169,58,0)}}"
      + ".abn-links{display:flex;gap:3px;flex-wrap:wrap;flex:1}"
      + ".abn-links a{color:#e5e7eb;text-decoration:none;padding:4px 9px;border-radius:7px;font-weight:600;white-space:nowrap;transition:background .15s,color .15s,transform .15s}"
      + ".abn-links a:hover{background:rgba(240,169,58,.2);color:#fff;transform:translateY(-1px)}"
      + ".abn-sr{position:relative}"
      + ".abn-q{border:1px solid #4b5563;background:#111827;color:#fff;border-radius:8px;padding:5px 10px;font-size:13px;width:170px;transition:border-color .15s,box-shadow .15s}"
      + ".abn-q::placeholder{color:#9ca3af}"
      + ".abn-q:focus{outline:0;border-color:#f0a93a;box-shadow:0 0 0 3px rgba(240,169,58,.25)}"
      + ".abn-res{position:absolute;right:0;top:calc(100% + 6px);width:310px;max-height:62vh;overflow:auto;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.28)}"
      + ".abn-res a{display:block;padding:8px 11px;text-decoration:none;color:#1f2937;border-bottom:1px solid #f3f4f6}"
      + ".abn-res a:hover{background:#fff7ed}.abn-res a b{display:block;color:#b45309;font-size:13px}.abn-res a span{font-size:11px;color:#6b7280}"
      + ".abn-no{padding:10px 11px;color:#6b7280;font-size:12px}"
      + "@media(max-width:680px){.abn-links{display:none}.abn-q{width:128px}}"
      + "@media print{.abn-bar{display:none!important}.abn-hub{display:none!important}}"
      + ".abn-hub{max-width:1000px;margin:26px auto;padding:0 18px}"
      + ".abn-hub h2{font-size:1.12rem;margin:22px 0 11px;color:#b45309;display:flex;align-items:center;gap:9px;padding-left:11px;border-left:4px solid #d97706}"
      + ".abn-hub h2 .abn-ic{font-size:1.15rem;-webkit-text-fill-color:initial}"
      + ".abn-hsearch{width:100%;max-width:440px;padding:11px 14px;border:1px solid #e5e7eb;border-radius:11px;font-size:15px;margin-bottom:10px;font-family:inherit;transition:border-color .15s,box-shadow .15s}"
      + ".abn-hsearch:focus{outline:0;border-color:#d97706;box-shadow:0 0 0 4px rgba(217,119,6,.13)}"
      + ".abn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:11px}"
      + ".abn-card{position:relative;overflow:hidden;display:block;border:1px solid #ece3d4;border-radius:13px;padding:13px 15px;text-decoration:none;color:#1f2937;background:linear-gradient(180deg,#fff,#fffbf5);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}"
      + ".abn-card::before{content:'';position:absolute;left:0;top:0;right:0;height:3px;background:linear-gradient(90deg,#d97706,#f0a93a,#fbbf24);transform:scaleX(0);transform-origin:left;transition:transform .22s ease}"
      + ".abn-card:hover{transform:translateY(-3px);border-color:#d97706;box-shadow:0 9px 24px rgba(217,119,6,.16)}"
      + ".abn-card:hover::before{transform:scaleX(1)}"
      + ".abn-card b{display:block;color:#b45309;font-size:.95rem;margin-bottom:2px}.abn-card span{font-size:.8rem;color:#6b7280}";
    var st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st);

    /* Leiste */
    var bar = document.createElement("div"); bar.className = "abn-bar";
    bar.innerHTML = '<div class="abn-in"><a class="abn-brand" href="/">aban</a><nav class="abn-links">'
      + NAV.map(function (x) { return '<a href="' + x[1] + '">' + x[0] + "</a>"; }).join("")
      + '</nav><div class="abn-sr"><input class="abn-q" type="search" placeholder="🔍 Suche…" aria-label="Website durchsuchen"><div class="abn-res" hidden></div></div></div>';
    if (document.body) document.body.insertBefore(bar, document.body.firstChild);

    var q = bar.querySelector(".abn-q"), res = bar.querySelector(".abn-res");
    function doSearch() {
      var v = q.value.trim().toLowerCase();
      if (!v) { res.hidden = true; res.innerHTML = ""; return; }
      var hits = CAT.filter(function (it) { return (it[0] + " " + it[3] + " " + it[2]).toLowerCase().indexOf(v) >= 0; }).slice(0, 12);
      res.innerHTML = hits.length
        ? hits.map(function (it) { return '<a href="' + it[1] + '"><b>' + esc(it[0]) + "</b><span>" + esc(it[2]) + " · " + esc(it[3]) + "</span></a>"; }).join("")
        : '<div class="abn-no">Nichts gefunden</div>';
      res.hidden = false;
    }
    q.addEventListener("input", doSearch);
    q.addEventListener("focus", doSearch);
    document.addEventListener("click", function (e) { if (!bar.contains(e.target)) res.hidden = true; });

    /* Hub-Grid auf der Startseite */
    var hub = document.getElementById("aban-hub");
    if (hub) {
      hub.className = (hub.className ? hub.className + " " : "") + "abn-hub";
      hub.innerHTML = '<input class="abn-hsearch" placeholder="🔍 Alle Tools & Seiten durchsuchen…" aria-label="Tools durchsuchen"><div class="abn-gw"></div>';
      var hs = hub.querySelector(".abn-hsearch"), gw = hub.querySelector(".abn-gw");
      function renderHub() {
        var v = hs.value.trim().toLowerCase(), cats = {}, order = [];
        CAT.forEach(function (it) {
          if (v && (it[0] + " " + it[3] + " " + it[2]).toLowerCase().indexOf(v) < 0) return;
          if (!cats[it[2]]) { cats[it[2]] = []; order.push(it[2]); }
          cats[it[2]].push(it);
        });
        gw.innerHTML = order.length
          ? order.map(function (c) {
              return "<h2><span class=\"abn-ic\">" + (CATICON[c] || "•") + "</span>" + esc(c) + "</h2><div class=\"abn-grid\">"
                + cats[c].map(function (it) { return '<a class="abn-card" href="' + it[1] + '"><b>' + esc(it[0]) + "</b><span>" + esc(it[3]) + "</span></a>"; }).join("")
                + "</div>";
            }).join("")
          : '<p style="color:#6b7280">Nichts gefunden.</p>';
      }
      hs.addEventListener("input", renderHub);
      renderHub();
    }
  } catch (e) { /* nie die Seite kaputt machen */ }
})();
