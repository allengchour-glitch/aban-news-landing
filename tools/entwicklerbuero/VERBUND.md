# Gemeinsames Projektbüro

`verbund.py` verbindet die vorhandenen öffentlichen Angebote mit Büro, Fachrolle, Verkaufsweg und nächstem Prüfschritt. Chefbüro → Alle Projekte öffnet dieselben 14 Angebotsbereiche wie die Planung und die neue Obsidian-Seite Projekte. Untergruppen wie die Finanzpakete bleiben gemeinsam im bestehenden Shop; die vier Entwicklungsprototypen behalten ihre belegten Meilensteine. Ein zugeordneter Auftrag wird dadurch nicht automatisch ausgeführt oder erledigt.

Die öffentliche Webseite lädt zusätzlich `buero-ablaufstatus.json`. Der Seitenbau liest mit dem vorhandenen, nur lesenden Ausführungstoken die festgelegten Shop-/Social-Abläufe und den Videoentwurfsbau. Der Studio-Lauf versorgt Skript und Video; Kanalwachstum bleibt ohne Kontonachweis offen. Veröffentlicht werden nur Zustand, tatsächliche Laufzeit und feste Erläuterungen. Keine Rohprotokolle, Kontozahlen, Kundeninformationen oder internen Links. Ein erfolgreicher Ablauf ist kein Nachweis für Verkäufe oder vollständige fachliche Prüfung. Ohne Zugang bleibt das Ergebnis unbekannt. Nach 48 Stunden zeigt die Oberfläche den Lauf als alt; fehlgeschlagene Nachladeabrufe erneuern keine Messzeit und ersetzen keinen belegten vorherigen Lauf.

Der geplante Büro-Lauf löst bereits eine neue Seitenveröffentlichung aus. Der Deployment-Token erhält dafür nur zusätzlich `actions: read`, keine Schreibrechte für Shop, Social Media oder Zahlungen. Der Direktlink zu einem Angebot richtet keinen Checkout, Reportversand oder Kontozugang ein. Die tatsächlichen Lücken bleiben im Projektregister sichtbar.

## Fertige Aufträge

`auftraege.py` enthält zwölf konkrete Büroaufträge und je einen Prüfauftrag für die 14 Angebotsbereiche. Der Button Fertige Aufträge öffnet die nach Büro filterbare Auswahl. Projektkarten und Arbeitsplatzdetails wählen den passenden Auftrag direkt aus. Der Text ist vollständig vorbereitet; ein Eingabefeld muss nicht ausgefüllt werden.

Die Auswahl führt keine Aufgabe aus. Du öffnest den fertigen Text über einen ChatGPT-Link in einem neuen Tab oder kopierst ihn für den bereits verbundenen Chat. Private Messwerte, Kontodaten und dieser Gesprächsverlauf werden dabei nicht übertragen. Der neue Chat muss seinen verfügbaren Zugriff selbst prüfen. Bei gesperrter Zwischenablage wird der Text zur manuellen Kopie ausgewählt. Aufträge erlauben keine Kundennachrichten, Veröffentlichungen oder Zahlungs-, Preis- und Budgetänderungen. Fehlende Voraussetzungen bleiben ausdrücklich offen.
