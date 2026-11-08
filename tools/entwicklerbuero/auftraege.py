"""Fertige, begrenzte Chat-Aufträge ohne private Konto- oder Kundendaten."""
import verbund

REGELN = ('Prüfe zuerst den aktuellen Stand und offene Arbeiten, damit nichts doppelt erledigt wird. '
          'Arbeite mit vorhandenen Verbindungen und im Repository allengchour-glitch/aban-news-landing. '
          'Beachte AGENTS.md, CLAUDE.md und die aktuelle Übergabe. '
          'Nenne fehlenden Zugriff konkret und erledige den unabhängig möglichen Rest. '
          'Keine Nachrichten versenden, nichts auf Social Media veröffentlichen, keine Zahlungen, '
          'Preis- oder Budgetänderungen und keine neuen kostenpflichtigen Dienste auslösen. '
          'Private Konto- und Kundendaten bleiben privat. '
          'Berichte knapp: tatsächlich erledigt, geprüftes Ergebnis, verbleibender Blocker und nächster Schritt. '
          'Erfinde keine Verkäufe, Fortschritte oder laufenden Arbeiten.')

AUFTRAEGE = [
    ('tagesrunde','Tagesrunde erledigen','Chefbüro','Die wichtigste offene Arbeit auswählen und erledigen.',
     'Prüfe Shop, vorhandene Verkaufswege und Entwicklerprojekte. Wähle einen aktuell belegten, unabhängig behebbaren Verkaufsblocker. Behebe ihn im erlaubten Codeumfang, teste die Änderung und folge den Repositoryregeln für Merge und Veröffentlichung. Keine weitere reine Linkliste oder Wiederholung erledigter Arbeit.'),
    ('kaufweg','Kaufweg prüfen','Shop','Verkaufsseite, Kaufbutton und geschützte Lieferung prüfen.',
     'Prüfe https://abannews.com/shop und einen vorhandenen Produktweg bis zum Checkout sowie die geschützte Download-Anbindung. Löse keinen echten Kauf aus und umgehe keine Bezahlschranke. Reproduziere konkrete Codefehler, behebe sie mit Gegenprobe und prüfe nach erlaubter Veröffentlichung frisch.'),
    ('shop','Shop verbessern','Shop','Einen belegten Kauf- oder Produktfehler bearbeiten.',
     'Verifiziere den verbundenen Shop LuxeStyle auf luxestyle.ch. Prüfe gezielt einen Kaufweg und die verfügbaren aktuellen Produkt-/Workflowbefunde. Bearbeite einen belegten Fehler innerhalb der aktuellen Inhaberfreigaben. Behaupte aus einem grünen Ablauf keinen fehlerfreien Shop. Fehlt eine Schreibfreigabe für die konkrete Kontoänderung, bereite einen genauen Vorschlag vor.'),
    ('fehler','Ablauffehler klären','Entwicklerbüro','Ursache feststellen, beheben und erneut prüfen.',
     'Prüfe den neuesten tatsächlich fehlgeschlagenen Büro- oder Entwicklungsablauf. Trenne alte pausierte Publisher von der aktuellen Metricool-Planung. Reproduziere die Ursache, behebe den Fehler im eigenen Code und teste gezielt. Starte keine schreibenden Fremdabläufe blind neu.'),
    ('email','E-Mail-Assistent verbessern','Entwicklerbüro','Eine fehlende Funktion im vorhandenen Assistenten umsetzen.',
     'Lies tools/entwicklerbuero/anfragen_assistent und den aktuellen Arbeitsstand. Entwickle die erste unabhängig umsetzbare Verbesserung für den E-Mail-Assistenten weiter. Firmenwissen und manuelle Klärung sind bereits vorhanden: nicht erneut als neue Funktion implementieren. Teste unbekannte und mehrdeutige Anliegen, aktualisiere das Lieferpaket. Keine E-Mail versenden.'),
    ('antworten','E-Mail-Entwürfe vorbereiten','Chefbüro','Geschäftliche Anliegen sichten und Antworten vorbereiten.',
     'Prüfe, welches verbundene Postfach tatsächlich die Geschäftsadresse von abannews.com bedient. Falls die Zuordnung bestätigt ist, lies höchstens fünf neue geschäftliche Anliegen und bereite passende ungesendete Antwortentwürfe aus belegten Firmenangaben vor. Prüfe vorhandene Entwürfe und vermeide Duplikate. Bei unklarer Postfachzuordnung keine privaten Nachrichten als Geschäftspost behandeln.'),
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
    ('geld','Ertrag und Kosten prüfen','Chefbüro','Belegte Einnahmen und Kosten getrennt vergleichen.',
     'Prüfe den tatsächlich verfügbaren Zugriff auf Einnahmen, Erstattungen, Gebühren und Kosten der vorhandenen Produkte. Nutze einen klar benannten abgeschlossenen Zeitraum und halte Währungen getrennt. Lies keine unnötigen Kundendaten. Fehlende Kosten bleiben unbekannt; daraus keinen Gewinn berechnen. Nenne eine belegte wirtschaftliche Verbesserung, ohne Preise, Budgets oder Zahlungen zu ändern.'),
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
