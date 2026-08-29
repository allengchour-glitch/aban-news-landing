# Aufträge für Claude Cowork — Stand 29.08.2026, 21:45 UTC

Diese Aufgaben lassen sich aus der Cloud-Session **nicht** erledigen: Es sind Klicks in fremden
Web-Konsolen, für die es keinen Schreib-Endpunkt gibt, oder Entscheidungen, die dem Betreiber
gehören. Mit Cowork + «Claude in Chrome» kann Claude die Klicks am Bildschirm ausführen.

⚠️ **Keine Zugangsdaten in den Auftragstext schreiben.** Vorher im Browser bei den jeweiligen
Diensten anmelden — Cowork soll die bereits offene Sitzung benutzen.

**Sortiert nach Wirkung.** Die ersten drei haben direkten Geldbezug, danach kommen
Entscheidungen, dann Handarbeit, dann Hygiene.

---

# 💸 GELD — zuerst

## 1. ⛔ Zwei TikTok-Kampagnen stehen auf AN und warten nur auf Guthaben  (NEU 29.08.)
> **Bevor du das Werbekonto auflädst, lies das hier.** Zwei Kampagnen sind eingeschaltet
> (`operation_status: ENABLE`) und laufen im Moment nur deshalb nicht, weil das Guthaben leer
> ist (`CAMPAIGN_STATUS_BUDGET_EXCEED`). Sobald Geld drauf ist, starten sie von selbst.

| Kampagne | Konto | Budget | angelegt |
|---|---|---|---|
| **Wasserfest CH Juni** | Shopify-Konto (7641101648701554704) | **CHF 30/Tag** | 01.07. |
| LuxeStyle CH Conversion Juli 2026 | LuxeStyle CH Ads (7646349875793182738) | ohne Deckel | 06.07. |

**Warum das zählt — jetzt zum ersten Mal mit Zahlen, nicht mit Vermutung.** Der freigegebene
Konnektor erlaubte am 29.08. die Lifetime-Auswertung beider Werbekonten:

| Kampagne | Ausgabe | Impressionen | Klicks | **Käufe** |
|---|---:|---:|---:|---:|
| Conversion Juli 2026 | CHF 332.18 | 231'385 | 409 | **0** |
| Wasserfest CH Juni | CHF 147.36 | 71'799 | 643 | **1** |
| Sommer-Highlights 2026 | CHF 17.81 | 19'106 | 123 | **0** |
| Vatertag-Test-1 | CHF 2.64 | 1'880 | 12 | **0** |
| **Summe** | **CHF 499.99** | **324'170** | **1'187** | **1** |

**CHF 500 für einen Kauf.** Der Shop hat in seiner GESAMTEN Geschichte CHF 227.22 Umsatz aus
7 Bestellungen gemacht — die Werbung hat also mehr als das Doppelte des Gesamtumsatzes gekostet,
bei einer Marge von CHF 3–5 pro Bestellung.
ℹ️ Man könnte einwenden, der Pixel zähle zu niedrig. Darauf kommt es nicht an: Selbst wenn JEDE
Bestellung des Shops von TikTok käme, stünden CHF 227 Umsatz gegen CHF 500 Ausgabe.
→ **Sag mir ein Wort, dann pausiere ich beide.** Ich habe es NICHT von mir aus getan: Kampagnen
und Budget sind deine Entscheidung, und es fliesst gerade ohnehin kein Geld.

## 2. Gratis-Versand-Balken zeigt die falsche Schwelle  ⭐⭐
> Öffne im Shopify-Adminbereich das MAIN-Theme «Horizon · LuxeStyle + Email-Popup (Claude)»,
> bearbeite `layout/theme.liquid` und ändere die eine Zeile `var SCHWELLE=5000;` auf
> **`var SCHWELLE=4900;`**. Sonst nichts. Bestätige mir den neuen Wert.

**Am 29.08. um 21:40 erneut live geprüft — beides steht unverändert:** der Automatik-Rabatt
«Gratis-Versand ab CHF 49» ist ACTIVE, im Theme steht `SCHWELLE = 5000`.
Der Balken sagt einem Korb mit CHF 49.90 **«noch CHF 0.10 bis Gratis-Versand»** — obwohl der
Kunde ihn längst hat. Die Anzeige redet ihm aus, was er bekommt, an der teuersten Stelle.
**221 aktive Produkte kosten CHF 49.00–49.99**, darunter das Abendkleid «Sirène» (141 Sitzungen,
**9 Warenkörbe, 0 Kassengänge** in 60 Tagen) und die Slim Wallet (5,0★, bestbewertet).
Die Zusage «ab CHF 50» in allen Texten bleibt wahr (49 < 50) und muss NICHT angefasst werden.
⚠️ Nicht von der Session geändert: Theme + Checkout-Ökonomie sind Betreibersache, und die Kette
45/49/50/65 ist bewusst gebaut. Geändert wird hier NUR die Anzeige.

## 3. Klaviyo: die QUELLE der toten Domain abstellen  ⭐
> Öffne in Chrome die Klaviyo-Konsole (Konto XWqMAD, LuxeStyle CH).
> Settings → Account → Contact information. Ändere **Website URL** von
> `https://luxestyle.com.co` auf `https://luxestyle.ch` und speichere. Bei der Gelegenheit
> **Preferred currency** USD → **CHF** und **Locale** `de-DE` → `de-CH`. Bestätige die drei Werte.

**Warum es noch offen ist, obwohl am 28.08. «45 Vorkommen ersetzt» gemeldet wurde:** Dieser Fix
hat die **Bibliotheks-Vorlagen** repariert — die verschickten Mails benutzen aber eine **eigene
Kopie**, die beim Bearbeiten des Flows entsteht. Am 29.08. kam deshalb noch eine Bewertungs-Mail
mit totem Link an. **13 Live-Nachrichten sind jetzt umgehängt und einzeln gegengeprüft**
(Bestellbestätigung, erste Willkommens-Mail, beide Warenkorb-Abbrecher, Win-Back, VIP,
Bewertungs-Anfrage). Das Konto-Feld bleibt trotzdem die Quelle: Klaviyo baut die Domain in NEUE
Vorlagen wieder ein.

**Noch wirksamer, falls die Domain dir gehört:** `luxestyle.com.co` per DNS auf Shopify zeigen
lassen und in Shopify als Weiterleitungs-Domain eintragen. Das rettet zusätzlich alle BEREITS
VERSCHICKTEN Mails und alten Social-Posts.

## 4. Google Merchant Center: Zielland auf Schweiz
> Öffne das Google Merchant Center für luxestyle.ch und stelle Ziel- bzw. Versandland des Feeds
> auf **nur Schweiz**. Melde mir danach, wie viele Artikel «Missing shipping info» verlieren.

**Warum:** Der Shop hat genau EINEN aktiven Markt (Switzerland). Zeigt der Feed auf Deutschland,
meldet Merchant fehlende Versandinfos für Ware, die dorthin gar nicht verkauft werden kann.
Google ist der einzige Kanal mit belegten Verkäufen.

---

# 🤔 ENTSCHEIDUNGEN — nur du kannst sie treffen

## 5. Was in den Mails steht und nicht stimmt
> Der tote Link ist repariert (13 Live-Nachrichten, siehe unten). Beim Durchgehen sind
> Aussagen aufgefallen, die eine Entscheidung von dir brauchen — ich habe sie NICHT
> eigenmächtig umgeschrieben, weil es Zusagen an Kundinnen sind.

**1. Die VIP-Mail verspricht ein Programm, das es nicht gibt.** Wer CHF 500 überschreitet,
bekommt: «Code VIP10 automatisch angewendet», «Gratis Versand ohne Mindestbestellwert»,
«Geburtstags-Geschenk CHF 30», «Early Access 48h», «Founder-Tier: 15% · Concierge».
Live existieren im Shop nur: Bundle 2+ −10 %, Mengenrabatt ab 3, Gratis-Versand ab CHF 49.
→ Entweder das Programm einrichten oder die Zusagen aus der Mail nehmen.

**2. Win-Back: Betreff und Inhalt widersprechen sich.** Betreff «CHF 15 sparen mit BACK15»,
im Text steht «10 %» mit Code **WELCOME10**. Eine der beiden Angaben ist falsch.

**3. Die Warenkorb-Mails führen auf die STARTSEITE, nicht in den Warenkorb.** Eine
Rückhol-Mail, die den Korb nicht wiederherstellt, verschenkt ihren einzigen Zweck. Klaviyo
kann das über `{{ event.extra.checkout_url }}`.

**4. Die «EN/US»-Flows sind Dubletten der deutschen** — mit deutschen Betreffzeilen. Eine
Kundin kann dieselbe Bestellbestätigung ZWEIMAL bekommen (Flow «Post-Purchase · Order +
Review» und «Post-Purchase Review · EN/US» laufen beide live). → Einen davon abschalten.

**5. Eine live geschaltete Mail heisst «Email #3 Subject».** Im Flow «Abandoned Cart · EN/US»
steht eine dritte Mail mit unausgefülltem Platzhalter-Betreff auf `live`. → Abschalten oder
fertig schreiben.

**6. In der Bestellbestätigung habe ich drei Aussagen korrigiert** (weil sie derselben Klasse
angehören wie schon entschiedene Fälle) — sag Bescheid, falls du eine davon anders willst:
«30 Tage Geld-zurück — bedingungslos» → «30 Tage Rückgaberecht · Ausnahmen siehe
Rückgaberichtlinie» · «unseren Schweizer-Premium-Lieferanten» → «unseren Lieferanten»
(die Ware kommt von CJ) · die feste Angabe «Versand 7-14 Werktage» → die echten Stufen.

## 6. Fünf Ratgeber bewerben eine Box für CHF 299.90, die es nicht zu kaufen gibt
> Entscheide: Soll die **«🎁 Gentleman's Premium Gift Box»** (CHF 299.90) veröffentlicht werden,
> oder sollen die fünf Ratgeber-Sätze verschwinden? Sag es mir, ich setze es um.

**Der Befund:** Ein Vollscan über alle **307 veröffentlichten Ratgeber** fand 6 Stellen, an denen
Ware mit NAMEN und PREIS beworben wird, die nicht kaufbar ist — **fünf davon sind dieselbe Box**:
`geschenke-fuer-maenner-2026-schweiz` · `herrenuhr-kaufen-ratgeber-schweiz` ·
`vatertag-geschenke-schweiz-2026` · `geschenkboxen-sets-verschenken-ideen` ·
`echtleder-accessoires-pflegen-anleitung`. Wortlaut z. B.:
> «…lohnt ein Blick auf die Gentleman's Premium Gift Box (CHF 299.90), die Uhr, Slim Wallet,
> Lederarmband und Manschettenknöpfe in einer eleganten Box vereint…»

**Warum ich es nicht selbst entschieden habe — beide Wege haben einen Haken:**
- *Veröffentlichen* wäre riskant: Die Box ist ein SELBST zusammengestelltes Bündel
  (`LXSCH-GIFT-GENTLEMAN`), und ihr Inhalt nennt die «Slim Wallet» — eines der acht
  handkuratierten Altprodukte, hinter denen kein Lieferant steht. Eine bezahlte, nie lieferbare
  Bestellung ist die teure Klasse (#1008).
- *Ein anderes Produkt einsetzen* geht nicht: Die Sätze zählen den Inhalt auf. Die aktive
  «Tech Hero Geschenkbox» (CHF 199.90) enthält Smartwatch und Kopfhörer — der Satz wäre danach
  auf neue Weise falsch.
- Bleibt: die Sätze entfernen. Das ist redaktionelle Arbeit an fünf veröffentlichten Texten.

**Der sechste Fall:** «Leiser Baby Nagelschneider» CHF 29.90 in `baby-schlaft-nicht-7-tipps`.
Ebenfalls kein aktives Produkt.
ℹ️ Nebenbefund ohne Handlungsbedarf: **249 der 307 Ratgeber verlinken kein kaufbares Produkt**,
sondern nur Kategorien. Das ist kein Fehler — und die Messung zeigt, dass die meisten Ratgeber
ohnehin kaum Besucher haben. Gelohnt hat sich die Reparatur nur dort, wo wirklich Verkehr ankam
(Faszienrolle, 77 Sitzungen).

## 7. 45 rankende Markenseiten ohne Ware
> Entscheide, ob die toten BigBuy-Markenseiten auf eine passende KATEGORIE umgeleitet werden
> sollen (z. B. «Trainingsanzug Adidas» → Herren-Sportbekleidung) oder ob sie 404 bleiben.
> Sag mir Bescheid; das Umleiten selbst mache ich dann.

**Warum es eine Entscheidung ist und keine Reparatur:** `dropship/TOTE-LANDESEITEN.md` listet
70 Seiten mit Besuchern, die nicht mehr kaufbar sind. **45 davon sind BigBuy** — der Lieferant
ist seit dem 10.07. stillgelegt, die Ware kommt nicht zurück. Es sind Markenartikel (Adidas,
Nike, Puma, Calvin Klein, Reebok, Polaroid), zusammen rund 150 Sitzungen.
Eine Umleitung auf eine FREMDE Marke ist ausgeschlossen — das wäre ein Köderwechsel. Auf eine
Kategorie ist es vertretbar (wir zeigen, was wir haben), aber es bleibt eine Enttäuschung für
jemanden, der «Adidas» gesucht hat. Diese Abwägung gehört dem Betreiber.
Die restlichen 25: 9 ohne Lieferanten-SKU, 5 ausverkauft, 5 nicht CH-lieferbar, 4 Dubletten,
1 ohne erkennbaren Grund.
⚠️ **Zwei Fälle habe ich am 29.08. selbst erledigt**, weil sie eindeutig waren: der Packsack
(82 Sitzungen → aktiver Dry Bag) und das Spitzen-Trägertop (39 Sitzungen → der überlebende
Zwilling, es war als Dublette gedraftet). Bei drei weiteren Dubletten lag die Ähnlichkeit unter
der Schwelle 0.70 — dort habe ich BEWUSST nichts umgeleitet. Grenzfall zum Nachsehen:
«Damen Bikini-Set» → «Elegantes zweiteiliges Damen-Bikini-Set» (0.55), inhaltlich vermutlich
passend, aber unter der Schwelle.

## 8. Drei bedruckbare T-Shirts — zusammenlegen?
> Entscheide, ob `unisex-t-shirt-selbst-gestalten` (CHF 27.90) und
> `klassisches-unisex-t-shirt-selbst-gestalten` (CHF 23.90) neben dem Haupt-Shirt
> (`shirt-zum-selbstgestalten`, CHF 32.90) bestehen bleiben sollen.

**Warum es zählt:** «t shirt selbst gestalten» hat **590 Suchen/Monat**, der Shop steht auf
**Position 15** — Seite 2, so nah wie nichts anderes im Katalog. Drei fast gleiche Seiten teilen
die Signale untereinander auf. Ich habe die beiden anderen auf eigene SEO-Merkmale gestellt
(nicht-zerstörerisch); ein Zusammenlegen würde mehr bringen, nimmt aber Ware aus dem Sortiment.
Der POD-Editor ist das einzige Produkt des Shops, das kein anderer hat — und damit das einzige,
das überhaupt ranken kann.


---

# 🖐️ HANDARBEIT im Browser

## 9. TikTok posten — Material liegt bereit  📱
> Siehe **`dropship/TIKTOK-COWORK-AUFTRAG.md`** — sechs fertige Beiträge, je mit Caption,
> nummerierten Slide-URLs und einer stummen Videodatei. Alle Dateien liegen öffentlich auf dem
> Shopify-CDN, es braucht keinen Repo-Zugriff.
> **Höchstens ein Beitrag pro Tag**, und vor jedem Upload das Profil ansehen.

**Warum über Cowork:** TikToks Content-Posting-API ist weiter in Review (Punkt 5), und der
Browser der Cloud-Session wird von TikToks Bot-Schutz abgewiesen (die Seite lädt mit 200 und
zeigt trotzdem «Something went wrong»). Der Upload von Hand über tiktokstudio ist der einzige
Weg, der heute funktioniert — und den kann Cowork mit der angemeldeten Sitzung ausführen.
**Am 29.08. um 21:45 erneut gegen den Live-Shop geprüft: 6 Beiträge, 0 gesperrt** — alle
beworbenen Artikel sind ACTIVE und die Preise in den Captions stimmen. Der Lauf
(`automation/tiktok_cowork_auftrag.py`) markiert jeden Beitrag mit ⛔ GESPERRT, sobald ein
Produkt auf DRAFT geht; steht dort ein solcher Vermerk, den Beitrag NICHT posten.

## 10. Judge.me: Bewertungs-Anfragemails abstellen
> Öffne die Judge.me-Konsole für den Shop au3j0y-hq.myshopify.com.
> Gehe zu **Settings → Request scheduling → Request Timing**. Entferne die Häkchen bei allen drei
> Bestellarten (domestic, international, POS) und speichere. Bestätige, dass alle drei aus sind.

**Warum:** Es gibt drei getrennte Schalter; die Mails hören erst auf, wenn alle drei aus sind.
Bereits eingeplante, noch nicht versendete Anfragen entfallen mit; schon verschickte nicht.
Der tägliche Bewertungs-Import verschickt selbst KEINE Mails und darf weiterlaufen.

## 11. Instagram: etwas postet an der Sperre vorbei
> Öffne die Meta Business Suite für die Seite «LuxeStyle CH» (1049840534888592) und die
> verbundene Instagram-Seite @luxestyle.ch. Sieh unter **Planer / Geplante Beiträge** nach, ob
> dort automatische oder geplante Posts eingerichtet sind, und ob eine fremde App
> Veröffentlichungsrechte hat (Einstellungen → Business-Integrationen). Melde mir, was du findest.

**Warum:** Der Stopp-Riegel im Repo wirkt nachweislich — das Autopilot-Log sagt bei jedem Lauf
«es wird NICHTS gepostet». Trotzdem entfernt die Dubletten-Wache **seit dem 19.08. jeden Tag
2–5 Duplikate** vom Profil, und ihre eigene Ausgabe lautet «⚠️ externer Poster war wieder aktiv».
Es postet also etwas ausserhalb dieser Session. Was, lässt sich nur im Meta-Konto sehen.
⚠️ Nichts löschen — nur nachsehen und berichten.


---

# 🧹 HYGIENE

## 12. Schlüssel dauerhaft hinterlegen
> Trage in den Claude-Umgebungs-Einstellungen folgende Variablen ein:
> `JUDGEME_PRIVATE_TOKEN`, `JUDGEME_PUBLIC_TOKEN`, `JUDGEME_SHOP_DOMAIN`.
> **Nicht** in eine Datei im Repo — das Repo ist öffentlich.

**Warum:** Sie liegen derzeit nur unter `/tmp/judgeme.env`. Der Container stellt regelmässig einen
alten Snapshot her und `/tmp` wird mitgedreht — die Token waren am 28.08. schon einmal weg. Ohne
sie endet der tägliche Bewertungs-Import als No-op.

## 13. TikTok-Posting-API: NICHT freigegeben — weiter warten
**Am 28.08.2026 gegengeprüft, Ergebnis eindeutig:** Der Autorisierungs-Link antwortet mit
`error=unauthorized_client&error_type=client_key`. Die App «luxe» (Client-Key awhvghmn5q2oh91i)
ist seit dem 18.08. in Review und noch nicht durch.

⚠️ **Nicht weiter probieren.** Jeder Versuch endet gleich, und wiederholte fehlgeschlagene
Autorisierungen bringen nichts. Auf die Freigabe-Mail warten.

⚠️ **Zwei Signale, die NICHT als Freigabe taugen** (beide führten mich in die Irre):
- Der Client-Credentials-Endpunkt stellt ein Token aus — dieser Grant läuft auf APP-Ebene und
  braucht keine Review. Er sagt nichts über die Nutzer-Autorisierung.
- Der Autorisierungs-Endpunkt leitet auf die Anmeldeseite statt sofort auf einen Fehler. Das
  ist der normale erste Schritt; `unauthorized_client` kommt erst NACH der Anmeldung.

Wenn die Mail da ist: einfach Bescheid geben. Das Werkzeug steht bereit
(`automation/tiktok_anmeldung.mjs start`) — dann ist es ein Klick und ein Einfügen, ohne
lokalen Server. Der Refresh-Token landet im Tresor.

Bis dahin läuft der Browser-Weg unverändert: tiktok.com/tiktokstudio/upload, Video aus
`reels_seed.csv` laden, Caption mitgeben, Trend-Sound in der App wählen.

⚠️ Das Client-Secret stand einmal in einem Chat — im Portal rotieren lassen, neue Werte an mich.

## 14. Aufräumen: hängende Sitzung und offengelegter Webhook
> In der Claude-Sitzungsübersicht hängt «Weekly billing audit» seit dem 26. Juli auf einer
> PowerShell-Freigabe. In genau diesem Befehl steht eine **Discord-Webhook-URL im Klartext**.
> Eine Webhook-URL ist faktisch ein Passwort — erzeuge sie in Discord neu und beende die Sitzung.

---

## Was Cowork NICHT übernehmen soll

- **Die Motoren dieser Session** (4 CJ-Runner, Aufseher, 23 tägliche Wächter) brauchen einen
  dauerhaft laufenden Container. Cowork ist eine Arbeitsoberfläche, kein Ersatz.
- **Bewertungen** schreiben, übersetzen oder löschen. Kundentext bleibt Kundentext.
- **Preisentscheidungen.** Die Produkte, die in jedem Warenkorb Geld kosten, sind eine
  Geschäftsentscheidung (`dropship/PREIS-ALTBESTAND-ENTSCHEID.md`).
- **Produkte veröffentlichen, die gedraftet sind.** Jedes Draft hat einen Grund im Tag; ein
  404 ist ärgerlich, eine unlieferbare Bestellung teuer.

## Bereits erledigt — nicht doppelt machen

- ✅ **TikTok-Ads-Konnektor freigegeben** (29.08.) — die Freigabe ist durch, beide Werbekonten
  sind aus der Session lesbar. Daraus stammt Punkt 1. ⚠️ Das schaltet KEIN Posten frei; dafür
  braucht es die Content-Posting-API (Punkt 13).
- ✅ **Klaviyo-Mails**: 13 Live-Nachrichten aus 10 Flows auf die korrigierten Vorlagen umgehängt,
  jede am neu entstandenen Snapshot gegengeprüft (29.08.). Die Bibliotheks-Vorlagen waren schon
  am 28.08. sauber — **das allein reichte nicht**, siehe Punkt 3.
- ✅ **Google-Suchergebnisse**: 295 Produktseiten und 3 Kollektionen haben statt des Bausteins
  «– bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50» einen Satz aus dem eigenen Produkttext
  (29.08.). Der Importer schreibt ihn ab sofort selbst.
- ✅ **9 Produkttitel** auf den Begriff gesetzt, den Kundinnen suchen (Handstaubsauger 5'400/Mt.,
  «bedrucken» ~6'700/Mt. bei den POD-Artikeln) — Handles unverändert, POD-QA 0 Befunde (29.08.).
- ✅ 16 Weiterleitungen von rankenden 404-Seiten auf kaufbare Ware (28.08.).
- ✅ POD-Produkte: Rückgabe-Ausnahme, falsche Flagge, Doppelblock, USA-Lieferzusage (28.08.).
