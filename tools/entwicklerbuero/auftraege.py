"""Fertige, begrenzte Chat-Aufträge ohne private Konto- oder Kundendaten."""
import verbund

REGELN = ('Führe diesen Auftrag jetzt mit den verfügbaren Werkzeugen aus. '
          'Setze die unabhängig mögliche Arbeit um und prüfe das Ergebnis. '
          'Ein vorbereiteter oder gespeicherter Auftrag gilt nicht als erledigt. '
          'Prüfe zuerst den aktuellen Stand und offene Arbeiten, damit nichts doppelt erledigt wird. '
          'Arbeite mit vorhandenen Verbindungen und im Repository allengchour-glitch/aban-news-landing. '
          'Lies AGENTS.md, CLAUDE.md, SHARED-MEMORY.md und docs/CODEX-CLAUDE-UEBERGABE.md. '
          'Prüfe bestehende laufende Aufträge vor einem Start; keine Doppelarbeit. '
          'Reproduziere Fehler mit einer konkreten Eingabe und prüfe die Korrektur frisch. '
          'Bei Drosselung oder unklarem schreibendem Ergebnis stoppen, nicht blind wiederholen. '
          'Keine neuen Automationen, Frequenz-, Konto-, DNS- oder Secretänderungen. '
          'Nenne fehlenden Zugriff konkret und erledige den unabhängig möglichen Rest. '
          'Keine Nachrichten versenden, nichts auf Social Media veröffentlichen, keine Zahlungen, '
          'Preis- oder Budgetänderungen und keine neuen kostenpflichtigen Dienste auslösen. '
          'Private Konto- und Kundendaten bleiben privat. '
          'Berichte knapp: tatsächlich erledigt, geprüftes Ergebnis, verbleibender Blocker und nächster Schritt. '
          'Speichere abgeschlossene Arbeit und offene Blocker ohne private Daten in der Claude-Übergabe. '
          'Erfinde keine Verkäufe, Fortschritte oder laufenden Arbeiten.')

AUFTRAEGE = [
    ('tagesrunde','Tagesrunde erledigen','Chefbüro','Die wichtigste offene Arbeit auswählen und erledigen.',
     'Erledige jetzt die wichtigste offene Aufgabe aus meinem KI-Büro auf https://abannews.com/ki-buero. Lies den aktuellen Repositorystand und die Übergabe. Priorisiere einen belegten Fehler bei bestehenden Produkten, Kaufwegen, geschützter Lieferung oder verbundenen Automationen. Wähle genau eine unabhängig umsetzbare Verbesserung mit Bezug zum Verkaufen oder zur Kostensenkung. Setze sie im erlaubten Umfang um, teste das Ergebnis und folge den Repositoryregeln für Merge und bestätigte Bereitstellung. Verwende vorhandene Produkte und Abläufe. Unbekannte Kosten und Einnahmen bleiben unbekannt; finanzielle Wirkung nur mit Beleg als gemessen bezeichnen. Keine Wiederholung bereits erledigter Arbeit.'),
    ('kaufweg','Kaufweg prüfen','Shop','Verkaufsseite, Kaufbutton und geschützte Lieferung prüfen.',
     'Prüfe https://abannews.com/shop und einen vorhandenen Produktweg bis zum Checkout sowie die geschützte Download-Anbindung. Löse keinen echten Kauf aus und umgehe keine Bezahlschranke. Reproduziere konkrete Codefehler, behebe sie mit Gegenprobe und prüfe nach erlaubter Veröffentlichung frisch.'),
    ('shop','Shop verbessern','Shop','Einen belegten Kauf- oder Produktfehler bearbeiten.',
     'Verifiziere den verbundenen Shop LuxeStyle auf luxestyle.ch. Prüfe gezielt einen Kaufweg und die verfügbaren aktuellen Produkt-/Workflowbefunde. Bearbeite einen belegten Fehler innerhalb der aktuellen Inhaberfreigaben. Behaupte aus einem grünen Ablauf keinen fehlerfreien Shop. Fehlt eine Schreibfreigabe für die konkrete Kontoänderung, bereite einen genauen Vorschlag vor.'),
    ('bewertungen','Bewertungsimport prüfen','Shop','Vorhandenen CJ→Judge.me-Import mit Testlauf und Beleg prüfen.',
     'Prüfe den vorhandenen Ablauf cj-reviews.yml und automation/cj_reviews_import.mjs sowie die aktuelle Übergabe. Lies den neuesten Lauf und unterscheide Testlauf, No-op, übersprungene Produkte, unklare Ergebnisse und bestätigte Veröffentlichungen. Prüfe echte CJ-Quellbewertungen nur für das exakt gleiche Produkt, Quellenherkunft und Dubletten. Keine erfundenen Bewertungen, keine eigenen Shopkäufe oder verifizierten Shopkäufer behaupten. Keine Bewertung veröffentlichen, keine Kunden anschreiben, keinen neuen Zeitplan anlegen und keinen unklaren Import wiederholen. Bereite höchstens einen begrenzten Testlauf vor; fehlende Zugriffe konkret nennen. Ein erfolgreicher Workflow allein ist keine bestätigte Importmenge.'),
    ('fehler','Ablauffehler klären','Entwicklerbüro','Ursache feststellen, beheben und erneut prüfen.',
     'Prüfe den neuesten tatsächlich fehlgeschlagenen Büro- oder Entwicklungsablauf. Trenne alte pausierte Publisher von der aktuellen Metricool-Planung. Reproduziere die Ursache, behebe den Fehler im eigenen Code und teste gezielt. Starte keine schreibenden Fremdabläufe blind neu.'),
    ('email','E-Mail-Assistent verbessern','Entwicklerbüro','Eine fehlende Funktion im vorhandenen Assistenten umsetzen.',
     'Lies tools/entwicklerbuero/anfragen_assistent und den aktuellen Arbeitsstand. Entwickle die erste unabhängig umsetzbare Verbesserung für den E-Mail-Assistenten weiter. Firmenwissen und manuelle Klärung sind bereits vorhanden: nicht erneut als neue Funktion implementieren. Teste unbekannte und mehrdeutige Anliegen, aktualisiere das Lieferpaket. Keine E-Mail versenden.'),
    ('antworten','E-Mail-Entwürfe vorbereiten','Chefbüro','Geschäftliche Anliegen sichten und Antworten vorbereiten.',
     'Prüfe, welches verbundene Postfach tatsächlich die Geschäftsadresse info@luxestyle.ch bedient (Weiterleitung). Falls die Zuordnung bestätigt ist, lies höchstens fünf neue geschäftliche Anliegen und bereite passende ungesendete Antwortentwürfe aus belegten Firmenangaben vor. Prüfe vorhandene Entwürfe und vermeide Duplikate. Bei unklarer Postfachzuordnung keine privaten Nachrichten als Geschäftspost behandeln.'),
    ('kommentare','Kommentar-Assistent verbessern','Entwicklerbüro','FAQ, Prüffälle und doppelte Antworten verbessern.',
     'Entwickle den vorhandenen Kommentar-Assistenten in tools/entwicklerbuero/anfragen_assistent sinnvoll weiter. Prüfe FAQ-Treffer, offene Fragen, Datenschutz und den vorhandenen Verlauf gegen doppelte Entwürfe. Behebe eine belegte Lücke, teste sie und baue das Paket. Keine Kommentare veröffentlichen.'),
    ('metricool','Social-Plan prüfen','Social Media','Lücken und doppelte Planungen erkennen.',
     'Verifiziere zuerst die tatsächlich verbundene Metricool-Marke und ihre Kanalidentitäten. Lies die nächsten sieben Tage der vorhandenen Planung in der bestätigten Zeitzone. Prüfe Lücken, doppelte Inhalte und Entwürfe. Bestehende geprüfte Termine erhalten. Erstelle höchstens einen konkreten Verbesserungsvorschlag; plane oder veröffentliche durch diesen Auftrag nichts.'),
    ('social','Social-Inhalt vorbereiten','Social Media','Einen passenden Entwurf mit Quellen und Ziel erstellen.',
     'Verifiziere Marke und ein geeignetes vorhandenes Produkt. Entwickle einen hochwertigen Content-Entwurf mit zwei Hooks, belegten Produktangaben, geeignetem Bild-/Videomaterial und einem passenden Kaufziel. Aktuelle Rechte-, Qualitäts- und Sperrtagregeln beachten. Ein Skript ist kein fertiger Film. Keine minderwertige Serie als Ersatz, nichts veröffentlichen.'),
    ('youtube','Videoentwurf bauen','YouTube-Studio','Eine vorhandene Folge rendern und technisch prüfen.',
     'Nutze tools/youtube_studio für einen begrenzten vorhandenen Videoentwurf ohne Kontozugriff oder Upload. Prüfe vorhandene aktuelle Ergebnisse vor einem neuen Bau. Wenn ein neuer Bau nötig ist, rendere eine Folge, prüfe MP4, Dauer und Lesbarkeit und stelle den Entwurf zur Sichtung bereit. Keine Kanalzuordnung oder Follower behaupten.'),
    ('monitor','Report-Anbindung fertigstellen','Entwicklerbüro','Abo, Reportlauf und Versand getrennt anbinden.',
     'Prüfe den vorhandenen Sichtbarkeits-Monitor und seine tatsächliche Anbindung an aktive Stripe-Abos, private Speicherung, Report-Erzeugung und Versand. Baue den nächsten unabhängig möglichen Integrationsschritt mit Tests. Beispieldaten sind keine echten Abonnenten. Keine Kundendaten ins öffentliche Repository schreiben und keine Reports versenden.'),
    ('seo','Ranking und SEO verbessern','Shop','Frische Suchdaten prüfen und einen belegten SEO-Fehler verbessern.',
     'Lies meine geschützte Büroansicht https://chatgpt.com/space/page_22eb1acdd29481918523331f0ea00ce8 und die aktuellen Search-Console-Daten für die bestätigten Properties von LuxeStyle und abannews.com. Nutze vorhandene Zugriffe; verifiziere Property, Websuche, Zeitraum und Datenstand. Vorläufige Tage und fehlende Zeilen sind keine Null. Vergleiche passende Zeiträume und wähle eine belegte Verkaufsseite mit sinnvoller wirtschaftlicher Relevanz. Lies Claudes neueste SEO-/Merchant-Befunde und Übergaben zuerst, vermeide Doppelarbeit. Setze eine konkrete überprüfbare Verbesserung im erlaubten Repositoryumfang um und bestätige Tests sowie Deployment. Konto-/Themeänderungen nur im separat bestätigten Umfang; keine automatische pauschale SEO-Massenänderung. Erfinde keine Suchnachfrage, Bewertungen oder Rankingsteigerung. Speichere private Messwerte ausschliesslich ausserhalb des Repositorys und aktualisiere die bestehende private Büroanzeige; bei Quellenfehlern alte Werte samt Messzeit erhalten. Ein geöffneter Auftrag ist keine ausgeführte Arbeit.'),
    ('geld','Umsatz, Besucher und Google prüfen','Chefbüro','Belegte Einnahmen und Kosten getrennt vergleichen.',
     'Lies die verbundenen Quellen frisch: Shopify-Gesamtumsatz, Bestellungen und Shop-Besucher für heute; GA4-aktive Nutzer im letzten 30-Minuten-Fenster; Search-Console-Klicks und Impressionen mit Zeitraum und Vorläufigkeitsstatus; Merchant-Center-Produktstatus mit Kennzeichnung von Teilauszügen. Bestätige zuerst Konten, Domain, Währung und Zeitzone. Leere oder fehlgeschlagene Antworten sind nicht automatisch Null. Aktualisiere mit tools/buero/quellenbericht.py einen privaten Quellenbericht ausserhalb des Repositories. Die öffentliche Büro-Webseite hat keinen geschützten Live-Datenzugang; keine privaten Zahlen oder Zugangsdaten dort veröffentlichen und keinen laufenden Sync behaupten. Prüfe ergänzend den tatsächlich verfügbaren Zugriff auf Einnahmen, Erstattungen, Gebühren und Kosten der vorhandenen Produkte. Nutze einen klar benannten abgeschlossenen Zeitraum und halte Währungen getrennt. Lies keine unnötigen Kundendaten. Fehlende Kosten bleiben unbekannt; daraus keinen Gewinn berechnen. Nenne eine belegte wirtschaftliche Verbesserung, ohne Preise, Budgets oder Zahlungen zu ändern.'),
]


def katalog():
    rows = [dict(id=i,titel=t,buero=b,kurz=k,auftrag=a+'\n\n'+REGELN)
            for i,t,b,k,a in AUFTRAEGE]
    for p in verbund.katalog():
        rows.append(dict(id='projekt_'+p['id'],titel=p['name']+' prüfen',buero=p['buero'],
                         kurz=p['naechster'],auftrag='Bearbeite das vorhandene Projekt '+p['name']+
                         ' auf https://abannews.com'+p['pfad']+'. Nächster Prüfpunkt: '+p['naechster']+
                         ' Prüfe zuerst, ob dieser Punkt inzwischen erledigt wurde. Ein vorhandener Link bestätigt weder Käufe noch Lieferung. '
                         'Behebe einen reproduzierten Fehler im eigenen Code mit passenden Tests und folge den Repositoryregeln.\n\n'+REGELN))
    return rows
