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
      ["🧰 Tools", "/online-tools.html"],
      ["🤖 KI-Studio", "/ki-studio.html"],
      ["📈 Märkte", "/maerkte.html"],
      ["🧭 Dossiers", "/dossiers.html"],
      ["💼 Cockpit", "/cockpit-app.html"]
    ];

    /* Katalog für Suche + Hub */
    var CAT = [
      ["Startseite", "/", "Start", "Übersicht, Newsletter & alle Bereiche"],
      ["Online-Tools", "/online-tools.html", "Start", "Katalog aller kostenlosen Tools"],
      ["Angebote-Suche", "/angebote-suche.html", "Start", "Schnäppchen aus vielen Kategorien finden (eBay)"],
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
      ["Angebot schreiben", "/angebot-schreiben.html", "Business", "Vorlage + Generator (mit/ohne MwSt)"],
      ["Buchhaltungssoftware-Vergleich", "/buchhaltungssoftware-vergleich.html", "Business", "lexoffice, sevdesk, bexio & Co. — ehrlich eingeordnet"],
      ["Rechnung Schritt für Schritt", "/rechnung-schritt-fuer-schritt.html", "Business", "In 6 Schritten zur ersten Rechnung (Anleitung)"],
      ["Geschäftskonto-Vergleich", "/geschaeftskonto-vergleich.html", "Business", "Qonto, Kontist, Holvi & Co. für Selbstständige"],
      ["Homeoffice absetzen", "/homeoffice-absetzen.html", "Business", "Arbeitszimmer & Pauschale steuerlich nutzen"],
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
      ["KI für deine Branche", "/branchen.html", "KI", "Praxis-Ratgeber je Branche"],
      ["KI-Audit", "/ki-audit.html", "KI", "Wo KI dir wirklich hilft"],
      ["KI-Readiness-Check", "/ki-readiness-check.html", "KI", "Wie bereit bist du für KI?"],
      ["KI-Chatbots", "/ki-chatbots.html", "KI", "Chatbots verstehen & nutzen"],
      ["Welche KI für was?", "/welche-ki-fuer-was.html", "KI", "Das richtige Modell wählen"],
      ["KI-Tools-Vergleich", "/ki-tools-vergleich.html", "KI", "ChatGPT vs Claude vs Gemini — ehrlich verglichen"],
      ["KI-Kosten-Rechner", "/ki-kosten-rechner.html", "KI", "API-Kosten abschätzen"],
      ["KI-Token-Rechner", "/ki-token-rechner.html", "KI", "Tokens & Preise berechnen"],
      ["Geld & KI", "/geld-und-ki.html", "KI", "Mit KI Geld sparen und verdienen"],
      ["Über aban", "/about.html", "Info", "Wer hinter aban steckt"],
      ["Impressum", "/impressum.html", "Info", "Rechtliche Angaben"],
      ["Datenschutz", "/datenschutz.html", "Info", "Datenschutzerklärung"]
    ];

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

    var css = ""
      + ".abn-bar{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#1f2937;color:#fff;font-size:13px;position:relative;z-index:9000}"
      + ".abn-in{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:12px;padding:6px 14px;flex-wrap:wrap}"
      + ".abn-brand{font-weight:800;color:#f0a93a;text-decoration:none;font-size:15px;letter-spacing:.5px}"
      + ".abn-links{display:flex;gap:3px;flex-wrap:wrap;flex:1}"
      + ".abn-links a{color:#e5e7eb;text-decoration:none;padding:4px 8px;border-radius:6px;font-weight:600;white-space:nowrap}"
      + ".abn-links a:hover{background:rgba(255,255,255,.13);color:#fff}"
      + ".abn-sr{position:relative}"
      + ".abn-q{border:1px solid #4b5563;background:#111827;color:#fff;border-radius:7px;padding:5px 10px;font-size:13px;width:170px}"
      + ".abn-q::placeholder{color:#9ca3af}"
      + ".abn-res{position:absolute;right:0;top:calc(100% + 4px);width:310px;max-height:62vh;overflow:auto;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 12px 34px rgba(0,0,0,.28)}"
      + ".abn-res a{display:block;padding:8px 11px;text-decoration:none;color:#1f2937;border-bottom:1px solid #f3f4f6}"
      + ".abn-res a:hover{background:#fff7ed}.abn-res a b{display:block;color:#b45309;font-size:13px}.abn-res a span{font-size:11px;color:#6b7280}"
      + ".abn-no{padding:10px 11px;color:#6b7280;font-size:12px}"
      + "@media(max-width:680px){.abn-links{display:none}.abn-q{width:128px}}"
      + "@media print{.abn-bar{display:none!important}.abn-hub{display:none!important}}"
      + ".abn-hub{max-width:1000px;margin:26px auto;padding:0 18px}"
      + ".abn-hub h2{font-size:1.12rem;margin:18px 0 10px;color:#b45309}"
      + ".abn-hsearch{width:100%;max-width:440px;padding:10px 13px;border:1px solid #e5e7eb;border-radius:10px;font-size:15px;margin-bottom:10px;font-family:inherit}"
      + ".abn-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}"
      + ".abn-card{display:block;border:1px solid #ece3d4;border-radius:12px;padding:12px 14px;text-decoration:none;color:#1f2937;background:#fff}"
      + ".abn-card:hover{border-color:#d97706;box-shadow:0 4px 14px rgba(217,119,6,.13)}"
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
              return "<h2>" + esc(c) + "</h2><div class=\"abn-grid\">"
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
