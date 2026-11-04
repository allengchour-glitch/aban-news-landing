# Echtfell-Produkte auf Entwurf gesetzt (04.11.2026)

Auslöser: Der Besitzer schickte den TikTok-Beitrag «Kuscheldecke Hasenfell-Imitat Tie-Dye» mit «nimm das raus» und danach «oder kein hasenfell». Auslegung (meine, nicht bestätigt): keine echten Pelzprodukte im Shop; das Video selbst kann nur der Besitzer oder PC-Claude löschen (`dropship/BROWSER-BEFEHL-TIKTOK-LOESCHEN-0411.md`).

## Was geändert wurde (GEMESSEN: Status vorher ACTIVE, nachher frisch gelesen DRAFT)
Nur der Status, sonst nichts (Titel, Preise, Varianten, Bilder unverändert, Bestand 0 und nicht getrackt):

| Produkt | ID | Grund (aus dem eigenen Produkttext) |
|---|---|---|
| `wasserdichte-madchen-stiefel-mit-echtem-hasenf-626600` | 15454094393729 | «mit echtem Hasenfell gefüttert» |
| `warmer-schal-aus-fuchsfell-und-rexkaninchenfel-627600` | 15447889969537 | «Gefertigt aus Fuchsfell und Rexkaninchenfell» |
| `warme-winterhandschuhe-mit-fuchsfell-manschett-614000` | 15447921066369 | «Luxuriöse Fuchsfell-Manschette» (Fuchs, nicht Hase: bewusst mit aufgenommen) |

Dazu Rechtslage als Einschätzung (nicht juristisch geprüft): in der Schweiz müssen Pelzprodukte mit Tierart, Herkunft und Gewinnungsart deklariert sein (Pelzdeklarationsverordnung); die drei Produkte tragen keine solche Angabe.

Bereits vorher auf Entwurf (nicht angefasst): u. a. «Weinroter Kissenbezug aus Rex Kaninchenfell», «Damen Kurzmantel aus Baumwolle mit Pelzkragen».

## Rücknahme
`productUpdate` mit `status: ACTIVE` für die drei IDs (Admin-API, `gid://shopify/Product/<ID>`).

## Messung (nur lesend, Admin-API, 04.11. ca. 22:00 UTC)
321 Produkte mit Fell-Wörtern in Titel oder Tag, 249 mit Fell-Wort in Titel, Text oder Tag; starke Echtfell-Wörter («echtes/echtem …fell», «Rex-Kaninchen», «Echtpelz») in 15 Produkten (9 aktiv ohne Imitat-Wort im Umfeld): davon die drei oben, dazu `leder-und-fellmantel-mit-fleecefutter-608300` («echtes Schafsleder»; kein Pelz), `winterhandschuhe` und mehrere Texte, die «Kaninchenfell» nur als Stoffbeschreibung für Plüsch/Imitat nennen.

## Offen (Entscheid Besitzer)
Diese aktiven Kunstfell-Produkte tragen «Hasenfell»/«Kaninchenfell» im TITEL, obwohl der Text Plüsch/Imitat nennt und könnten für echtes Fell gehalten werden:
- `kuscheldecke-hasenfell-imitat-tie-dye-697984` (das Produkt im TikTok-Video; Titel sagt «Imitat»)
- `doppelseitiges-hasenfell-kissen-fur-sofa-748992` (Text: «weicher Plüsch»)
- `farbenfroher-hasenfell-pompon-rucksack-804864` (Text: «Hasenfell-Pompon», Material «Cord»; ob Pompon echt oder Kunstfell ist, nennt der Text nicht)
- `wohnzimmer-und-eingangsbereichs-fussmatte-mit-602700` (Text: «Imitationskaninchenfell-Textur», Polyester)
Vorschlag: Titel auf «Kunstfell»/«Plüsch» umstellen; Handles und Preise bleiben. Nicht ausgeführt, weil unklar ist, ob der Besitzer das Wort oder nur echte Pelze meint.
