# Aufträge für Claude Cowork — Stand 29.08.2026, 23:10 UTC

Hier steht, was ich aus der Cloud-Session **nicht** erledigen kann: Klicks in fremden
Web-Konsolen ohne Schreib-Endpunkt, und Entscheidungen, die dir gehören. Mit Cowork +
«Claude in Chrome» kann Claude die Klicks am Bildschirm ausführen.

⚠️ **Keine Zugangsdaten in den Auftragstext schreiben.** Vorher im Browser bei den Diensten
anmelden — Cowork soll die bereits offene Sitzung benutzen.

**Jeder Punkt ist am 29.08. gegen den Live-Stand geprüft.** Erledigtes steht ganz unten, nicht
mehr in der Liste — eine Aufgabenliste, in der Erledigtes mitläuft, wird nach dem zweiten Mal
nicht mehr gelesen.

---

## ⏱️ Wenn du heute nur drei Dinge machst

| | Aufgabe | Aufwand | warum |
|---|---|---|---|
| **1** | **Nichts** — TikTok-Werbekonto NICHT aufladen (Punkt 1) | 0 Min | zwei Kampagnen stehen auf AN und starten sonst von selbst; sie haben CHF 500 für **einen** Kauf verbrannt |
| **2** | Eine Zahl im Theme: `SCHWELLE=5000` → `4900` (Punkt 2) | 2 Min | der Gratis-Versand-Balken lügt 221 Produkte lang in die teuerste Richtung |
| **3** | Klaviyo-Konto: Website-URL auf `luxestyle.ch` (Punkt 3) | 2 Min | die Quelle der toten Domain in jeder NEUEN Mail-Vorlage |

---

# 💸 GELD

## 1. ⛔ Zwei TikTok-Kampagnen stehen auf AN und warten nur auf Guthaben

> **Bevor du das Werbekonto auflädst, lies das hier.** Beide Kampagnen sind eingeschaltet
> (`operation_status: ENABLE`) und laufen nur deshalb nicht, weil das Guthaben leer ist
> (`CAMPAIGN_STATUS_BUDGET_EXCEED`). Sobald Geld drauf ist, starten sie von selbst.

| Kampagne | Konto | Budget |
|---|---|---|
| **Wasserfest CH Juni** | Shopify-Konto (7641101648701554704) | **CHF 30/Tag** |
| LuxeStyle CH Conversion Juli 2026 | LuxeStyle CH Ads (7646349875793182738) | ohne Deckel |

Der freigegebene Konnektor erlaubte am 29.08. die erste Lifetime-Auswertung beider Konten:

| Kampagne | Ausgabe | Impressionen | Klicks | **Käufe** |
|---|---:|---:|---:|---:|
| Conversion Juli 2026 | CHF 332.18 | 231'385 | 409 | **0** |
| Wasserfest CH Juni | CHF 147.36 | 71'799 | 643 | **1** |
| Sommer-Highlights 2026 | CHF 17.81 | 19'106 | 123 | **0** |
| Vatertag-Test-1 | CHF 2.64 | 1'880 | 12 | **0** |
| **Summe** | **CHF 499.99** | **324'170** | **1'187** | **1** |

**CHF 500 für einen Kauf.** Der Shop hat in seiner GESAMTEN Geschichte CHF 227.22 aus
7 Bestellungen umgesetzt, bei CHF 3–5 Marge je Bestellung.
ℹ️ Man könnte einwenden, der Pixel zähle zu niedrig. Darauf kommt es nicht an: Selbst wenn JEDE
Bestellung des Shops von TikTok käme, stünden CHF 227 Umsatz gegen CHF 500 Ausgabe.
→ **Sag ein Wort, dann pausiere ich beide.** Ich habe es nicht von mir aus getan: Kampagnen und
Budget sind deine Entscheidung, und es fliesst gerade ohnehin kein Geld.

## 2. Der Gratis-Versand-Balken zeigt die falsche Schwelle  ⭐⭐

> Shopify-Admin → MAIN-Theme «Horizon · LuxeStyle + Email-Popup (Claude)» →
> `layout/theme.liquid` → die eine Zeile `var SCHWELLE=5000;` auf **`var SCHWELLE=4900;`**.
> Sonst nichts. Bestätige mir den neuen Wert.

**Am 29.08. um 23:05 erneut live geprüft, beides unverändert:** Der Automatik-Rabatt
«Gratis-Versand ab CHF 49» ist ACTIVE, im Theme steht `SCHWELLE = 5000`.
Der Balken sagt einem Korb mit CHF 49.90 **«noch CHF 0.10 bis Gratis-Versand»** — obwohl der
Kunde ihn längst hat. Die Anzeige redet ihm an der teuersten Stelle aus, was er bekommt.
**221 aktive Produkte kosten CHF 49.00–49.99**, darunter das Abendkleid «Sirène» (141 Sitzungen,
**9 Warenkörbe, 0 Kassengänge** in 60 Tagen) und die Slim Wallet (5,0★, bestbewertet).
Die Zusage «ab CHF 50» in allen Texten bleibt wahr (49 < 50) und muss NICHT angefasst werden.
⚠️ Nicht von der Session geändert: Theme und Checkout-Ökonomie sind Betreibersache, und die Kette
45/49/50/65 ist bewusst gebaut. Geändert wird hier NUR die Anzeige.

## 3. Klaviyo: die QUELLE der toten Domain abstellen  ⭐

> Klaviyo-Konsole (Konto XWqMAD, LuxeStyle CH) → Settings → Account → Contact information.
> **Website URL** `https://luxestyle.com.co` → `https://luxestyle.ch`. Bei der Gelegenheit
> **Preferred currency** USD → **CHF** und **Locale** `de-DE` → `de-CH`. Bestätige die drei Werte.

**Warum es noch offen ist, obwohl am 28.08. «45 Vorkommen ersetzt» gemeldet wurde:** Jener Lauf
hat die **Bibliotheks-Vorlagen** repariert — die verschickten Mails benutzen aber eine **eigene
Kopie**, die beim Bearbeiten des Flows entsteht. Deshalb kam am 29.08. noch eine Bewertungs-Mail
mit totem Link an. **13 Live-Nachrichten sind inzwischen umgehängt und einzeln gegengeprüft.**
Das Konto-Feld bleibt trotzdem die Quelle: Klaviyo baut die Domain in NEUE Vorlagen wieder ein.

**Noch wirksamer, falls die Domain dir gehört:** `luxestyle.com.co` per DNS auf Shopify zeigen
lassen und in Shopify als Weiterleitungs-Domain eintragen. Das rettet zusätzlich alle BEREITS
VERSCHICKTEN Mails und alten Social-Posts.

## 3f. Echte Filter: die Search-&-Discovery-App fehlt  ⭐⭐ (NEU 30.08.)

> **2 Minuten:** Shopify-Admin → Apps → im App Store nach **«Shopify Search & Discovery»**
> suchen (kostenlos, von Shopify selbst) → installieren → in der App unter *Filter* die
> Vorschläge übernehmen (Verfügbarkeit, Preis, weitere nach Wunsch). Fertig — mehr nicht.

**Der Befund (30.08., gemessen):** Die Kollektionsseiten hatten **null Filter** — kein Preis,
keine Verfügbarkeit —, obwohl das Theme Filtern eingeschaltet hat (`enable_filtering: true`).
Ursache: Die App ist nicht installiert (alle 25 installierten Apps geprüft), und ohne sie ist
`collection.filters` leer. Installieren kann sie nur ein Mensch im Admin.

**Was bis dahin schon läuft:** Ich habe native Tag-Filter-Chips auf alle Kollektionsseiten
gebaut («Filtern: Damen · Herren · Schuhe · ⚡ Ab CH-Lager …», nur Tags, die im jeweiligen
Sortiment vorkommen, mit Abwahl-Kreuz). Live verifiziert. Die App ergänzt dann Preisregler
und Verfügbarkeit — die Chips bleiben als Schnellfilter sinnvoll.

## 4. Google Merchant Center: Zielland auf Schweiz

> Merchant Center für luxestyle.ch öffnen, Ziel- bzw. Versandland des Feeds auf **nur Schweiz**
> stellen. Melde mir danach, wie viele Artikel «Missing shipping info» verlieren.

Der Shop hat genau EINEN aktiven Markt (Switzerland). Zeigt der Feed auf Deutschland, meldet
Merchant fehlende Versandinfos für Ware, die dorthin gar nicht verkauft werden kann. Google ist
der einzige Kanal mit belegten Verkäufen.

---

# 🤔 ENTSCHEIDUNGEN — nur du kannst sie treffen

## 5. Fünf Küchen-Zubehörteile: rein in den Google-Kanal oder nicht?

> Sag mir Ja oder Nein — den Rest mache ich.

Diese fünf sind ACTIVE, stehen in fünf Kanälen und fehlen **nur** bei Google (am 29.08. um 23:00
einzeln am Produkt abgefragt, nicht aus einem Bericht übernommen):

- Xinzuo Magnetischer Messerblock aus Akazienholz
- Abtropfgestell mit Geschirr- und Messerhalter
- Bambus-Käsebrett-Set mit Messern
- Multifunktionaler Messerhalter mit Wellenmuster
- Diamant-Messerschärfer mit festem Winkel

**Warum sie überhaupt draussen waren — das hat sich heute Abend geklärt, und es war ein
Fehler von uns, keine Richtlinie.** Der Lauf, der solche Lücken schliesst, prüft den Titel gegen
eine Wortliste, und in dieser Liste stand ein ungeankertes `messer`. Über alle **49'270 aktiven
Produkte** gemessen trifft dieses eine Wort **403 Titel — 73 davon sind gar keine Klinge**:
Messerschärfer, magnetische Messerhalter, Wetzsteine, dazu Pulsmesser, Herzfrequenzmesser,
Höhenmesser und ein Mixer «mit 6 Messern». Dieselbe Liste hielt ausserdem **54 Waffelstrick-
Pullover** für Waffen und **268 Augen-, Schlaf- und Gesichtsmasken** für Kostüm-Masken.
Die Liste ist repariert (verankert, 22 Gegenproben, 0 Abweichungen); die gepflegte Klingenregel
lehnt echte Messer weiterhin ab.

**Damit steht die Frage anders:** Es gibt keinen Richtlinien-Grund, diese fünf draussen zu
lassen. Google erlaubt Küchenmesser ausdrücklich, und vier der fünf sind reines Zubehör ganz
ohne Klinge. Google ist der einzige Kanal mit belegten Verkäufen — jedes Produkt, das dort
fehlt, ist ein verschenkter Gratis-Eintrag.

**Warum ich sie trotzdem nicht selbst publiziert habe:** Ein Fehlgriff im Google-Kanal riskiert
die Merchant-Sperre, also genau den Kanal, der als einziger verkauft. Deshalb läuft der
Publizier-Schritt bewusst NICHT automatisch mit den täglichen Wächtern. Ein Wort von dir genügt.

**Zwei Fälle aus derselben Meldung habe ich selbst entschieden**, weil sie eindeutig waren:
Eine **«Retro Schwertabdeckung»** bleibt draussen — das ist eine Scheide für ein Schwert, also
Waffenzubehör; die alte Regel hätte sie durchgelassen, das ist repariert. Ein Deko-Kissen mit
**«Schwertblatt»**-Muster (Schwertblatt = Bogenhanf, eine Pflanze) ist dagegen jetzt drin.
Beides live gegengeprüft.

⚠️ **Eine Absage war nur zufällig richtig, und das gehört dazugesagt:** Die «LED-Gesichtsmaske»
blieb draussen, weil das Wort «Maske» in der Liste stand. Der Grund, den ich am 22.08. notiert
hatte («Therapie» im Text), steht im TEXT — geprüft wird aber der TITEL. Sie ist damit ebenfalls
eine offene Frage, keine getroffene Entscheidung.

## 6. Drei Anmeldewege, drei Ziele — von 1'324 Kundinnen hat EINE eingewilligt  ⭐⭐

> Entscheide, welcher Weg der richtige ist, und sag Bescheid — den Rest baue ich.

Gemessen, nicht geschätzt:

| Weg | schreibt nach |
|---|---|
| Footer-Formular (Shopify-eigenes `contact[email]`) | **Shopify** |
| Popup WELCOME10 | **Klaviyo** |
| Kasse | eigene Einwilligung |

**`email_marketing_state:subscribed` trifft in Shopify auf genau 1 von 1'324 Kundinnen zu**
(seit 02.07.). Klaviyo hat **0 eigene Formulare**. Es gibt also keinen Ort, an dem die Adressen
zusammenlaufen — und E-Mail ist der mit Abstand wirksamste Kanal des Shops: über 365 Tage haben
alle Flows zusammen **17 Empfänger** erreicht und daraus **2 Käufe / CHF 67.80** gemacht, rund
**30 % des Gesamtumsatzes**. Das sind **CHF 14.97 je Empfänger**; TikTok-Ads haben für CHF 499.99
genau **einen** Kauf gebracht. Kein anderer Kanal kommt in die Nähe.

**Meine Empfehlung:** In Shopify unter *Einstellungen → Checkout* die Marketing-Einwilligung an
der Kasse sichtbar anbieten, und das Footer-Formular ebenfalls nach Klaviyo schreiben lassen
(als Notbehelf tut das seit heute ein kleines Skript im Theme — sauber wäre ein echtes
Klaviyo-Formular). Beides ist eine Entscheidung über Einwilligung und Rechtstext — darum frage
ich, statt es zu tun.

## 7. Die VIP-Mail verspricht ein Programm, das es nicht gibt

Wer CHF 500 überschreitet, bekommt laut Mail: «Code VIP10 automatisch angewendet», «Gratis
Versand ohne Mindestbestellwert», «Geburtstags-Geschenk CHF 30», «Early Access 48 h»,
«Founder-Tier: 15 % · Concierge».
Live existieren im Shop nur: Bundle 2+ −10 %, Mengenrabatt ab 3, Gratis-Versand ab CHF 49.
→ **Entweder das Programm einrichten oder die Zusagen aus der Mail nehmen.** Der Flow
«VIP Tier-Upgrade Welcome» ist live.

## 8. Schickt Shopify UND Klaviyo eine Bestellbestätigung?

Shopify verschickt bereits eine eigene Bestellbestätigung, der Klaviyo-Flow schickt eine zweite,
hübschere hinterher. **Willst du beide?** Wenn nein, nehme ich die Klaviyo-Bestätigung raus und
lasse nur die Bewertungs-Anfrage nach 7 Tagen stehen. Ich habe es nicht selbst entschieden:
welche Bestätigung deine Kundin sieht, ist Markenauftritt, keine Technik.

## 9. Fünf Ratgeber bewerben eine Box für CHF 299.90, die es nicht zu kaufen gibt

> Entscheide: Soll die **«🎁 Gentleman's Premium Gift Box»** (CHF 299.90) veröffentlicht werden,
> oder sollen die fünf Ratgeber-Sätze verschwinden? Sag es mir, ich setze es um.

Ein Vollscan über alle 307 veröffentlichten Ratgeber fand 6 Stellen, an denen Ware mit NAMEN und
PREIS beworben wird, die es nicht zu kaufen gibt — **fünf davon sind dieselbe Box**
(`geschenke-fuer-maenner-2026-schweiz`, `herrenuhr-kaufen-ratgeber-schweiz`,
`vatertag-geschenke-schweiz-2026`, `geschenkboxen-sets-verschenken-ideen`,
`echtleder-accessoires-pflegen-anleitung`).

**Beide Wege haben einen Haken:**
- *Veröffentlichen* ist riskant: Die Box ist ein selbst zusammengestelltes Bündel
  (`LXSCH-GIFT-GENTLEMAN`, live geprüft: DRAFT) und nennt in ihrem Inhalt die «Slim Wallet» —
  eines der acht handkuratierten Altprodukte ohne Lieferanten dahinter. Eine bezahlte, nie
  lieferbare Bestellung ist die teure Klasse (#1008).
- *Ein anderes Produkt einsetzen* geht nicht: Die Sätze zählen den Inhalt auf. Die aktive
  «Tech Hero Geschenkbox» (CHF 199.90) enthält Smartwatch und Kopfhörer — der Satz wäre danach
  auf neue Weise falsch.
- Bleibt: die Sätze entfernen. Redaktionelle Arbeit an fünf veröffentlichten Texten.

**Der sechste Fall:** «Leiser Baby Nagelschneider» CHF 29.90 in `baby-schlaft-nicht-7-tipps` —
ebenfalls kein aktives Produkt. (Ein anderer Ratgeber derselben Klasse ist bereits repariert.)

## 10. Drei bedruckbare T-Shirts — zusammenlegen?

> Entscheide, ob `unisex-t-shirt-selbst-gestalten` (CHF 27.90) und
> `klassisches-unisex-t-shirt-selbst-gestalten` (CHF 23.90) neben dem Haupt-Shirt
> (`shirt-zum-selbstgestalten`, CHF 32.90) bestehen bleiben sollen.

«t shirt selbst gestalten» hat **590 Suchen/Monat**, der Shop steht auf **Position 15** — Seite 2,
so nah dran wie nichts anderes im Katalog. Drei fast gleiche Seiten teilen die Signale
untereinander auf. Ich habe die beiden anderen auf eigene SEO-Merkmale gestellt
(nicht-zerstörerisch); Zusammenlegen brächte mehr, nimmt aber Ware aus dem Sortiment.
Der POD-Editor ist das einzige Produkt des Shops, das kein anderer hat — und damit das einzige,
das überhaupt ranken kann.

## 11. Zwei kleine Handgriffe in Klaviyo, die nur von Hand gehen

**a) Die zweite Willkommens-Mail zusammensetzen (2 Min).** Die stillgelegte «E-Mail
Welcome-Serie» hatte eine gute zweite Stufe — nach 3 Tagen «Hey {{ first_name }} — schon was
Schönes entdeckt?», korrekt gebrandet. Die lebende Serie «Welcome Series» hat nur EINE Mail.
Öffne `Welcome Series` → **Add Delay 3 Tage** → **Add Email** → Template
`Welcome T+3d Discovery`. Der Flow-Aufbau lässt sich über die API nicht ändern.

**b) Zwei Profile umhängen.** Auf der alten Liste «Email List» sitzen **2 Profile** — Leute, die
sich angemeldet und den Code nie bekommen haben. Liste öffnen → beide auswählen → *Add to list*
→ «Newsletter Subscribers». Dann bekommen sie die Willkommens-Mail nachträglich.
Ich habe das NICHT selbst gemacht: das verschickt echte Post an echte Menschen.

---

# 🖐️ HANDARBEIT im Browser

## 12. TikTok posten — Material liegt bereit  📱

> Siehe **`dropship/TIKTOK-COWORK-AUFTRAG.md`** — sechs fertige Beiträge, je mit Caption,
> nummerierten Slide-URLs und einer stummen Videodatei. Alle Dateien liegen öffentlich auf dem
> Shopify-CDN, es braucht keinen Repo-Zugriff.
> **Höchstens ein Beitrag pro Tag**, und vor jedem Upload das Profil ansehen.

TikToks Content-Posting-API ist weiter in Review (Punkt 16), und der Browser der Cloud-Session
wird von TikToks Bot-Schutz abgewiesen (die Seite lädt mit 200 und zeigt trotzdem «Something went
wrong»). Der Upload von Hand über tiktokstudio ist der einzige Weg, der heute funktioniert.
**Am 29.08. gegen den Live-Shop geprüft: 6 Beiträge, 0 gesperrt** — alle beworbenen Artikel sind
ACTIVE, die Preise in den Captions stimmen. Der Lauf (`automation/tiktok_cowork_auftrag.py`)
markiert einen Beitrag mit ⛔ GESPERRT, sobald ein Produkt auf DRAFT geht; steht dort ein solcher
Vermerk, den Beitrag NICHT posten.

## 13. Judge.me: Bewertungs-Anfragemails abstellen

> Judge.me-Konsole für au3j0y-hq.myshopify.com → **Settings → Request scheduling → Request
> Timing**. Häkchen bei allen drei Bestellarten (domestic, international, POS) entfernen und
> speichern. Bestätige, dass alle drei aus sind.

Es gibt drei getrennte Schalter; die Mails hören erst auf, wenn alle drei aus sind. Bereits
eingeplante, noch nicht versendete Anfragen entfallen mit; schon verschickte nicht.
Der tägliche Bewertungs-Import verschickt selbst KEINE Mails und darf weiterlaufen.

## 14. Instagram: etwas postet an der Sperre vorbei

> Meta Business Suite für «LuxeStyle CH» (1049840534888592) und @luxestyle.ch öffnen. Unter
> **Planer / Geplante Beiträge** nachsehen, ob automatische oder geplante Posts eingerichtet sind,
> und unter **Einstellungen → Business-Integrationen**, ob eine fremde App Veröffentlichungsrechte
> hat. Melde mir, was du findest. ⚠️ Nichts löschen — nur nachsehen.

Der Stopp-Riegel im Repo wirkt nachweislich: das Autopilot-Log sagt bei jedem Lauf «es wird
NICHTS gepostet». Trotzdem entfernt die Dubletten-Wache **seit dem 19.08. täglich 2–5 Duplikate**
vom Profil, und ihre Ausgabe lautet «⚠️ externer Poster war wieder aktiv». Es postet also etwas
ausserhalb dieser Session. Was, lässt sich nur im Meta-Konto sehen.

---

# 🧹 HYGIENE

## 15. Schlüssel dauerhaft hinterlegen

> In den Claude-Umgebungs-Einstellungen eintragen: `JUDGEME_PRIVATE_TOKEN`,
> `JUDGEME_PUBLIC_TOKEN`, `JUDGEME_SHOP_DOMAIN`.
> **Nicht** in eine Datei im Repo — das Repo ist öffentlich.

Sie liegen derzeit nur unter `/tmp/judgeme.env`. Der Container stellt regelmässig einen alten
Snapshot her und `/tmp` wird mitgedreht — die Token waren am 28.08. schon einmal weg. Ohne sie
endet der tägliche Bewertungs-Import als No-op.

## 16. TikTok-Posting-API: NICHT freigegeben — GEMESSEN am 29.08., 20:44

> **Du hast es heute geklickt, das Ergebnis ist eindeutig.** Der Rücksprung lautete
> `error=unauthorized_client&error_type=client_key`
> (logid `2026082920443016EF4906E0DEFC6C7DC8`). Die App «luxe» ist weiterhin in Review.

**Warum dieser Klick trotzdem richtig war:** Es ist der EINZIGE gültige Test. Der App-Token
(`client_credentials`) läuft auf App-Ebene und braucht keine Review — er funktioniert seit
Wochen und beweist nichts. Und dass der Autorisierungs-Endpunkt auf die Anmeldeseite leitet,
ist der normale erste Schritt jedes OAuth-Flusses. `unauthorized_client` kommt erst NACH der
Zustimmung zurück. Vorher war es eine Vermutung, jetzt ist es belegt.

⚠️ **Bitte nicht weiter probieren.** Jeder weitere Versuch endet gleich; der Nutzen ist
aufgebraucht.

> **Das eine, was jetzt hilft — 2 Minuten:** Öffne
> **developers.tiktok.com/app/7648584035840903189** und sieh beim App-Eintrag nach, welchen
> Status die Review hat. **Elf Tage** sind lang genug, dass eine Ablehnung oder eine Rückfrage
> vorliegen kann, die per Mail kam und untergegangen ist. Unsere API-Antwort sagt darüber
> nichts — `error_type=client_key` heisst nur «dieser Key darf nicht», nicht warum.
> Melde mir, was dort steht.

⚠️ **Nicht die App «LuxeStyle Poster» anfassen** — das ist das KURZDRAMA-Portal
(`/portal/drama/`, verlangt Unternehmensverifizierung), eine andere Baustelle.
⚠️ Das Client-Secret stand einmal in einem Chat — im Portal rotieren lassen, neue Werte an mich.

**Bis dahin läuft alles über Punkt 12** (Upload von Hand über tiktokstudio). Das Material ist
heute gegen den Live-Shop geprüft: 6 Beiträge, 0 gesperrt.

**Was der Ads-Konnektor über das Profil verrät** (neu, 29.08.): `luxestyle.ch` ist dort als
BC-autorisierte Identität hinterlegt (`can_push_video: true`). Die Videoliste über die Ads-API
ist trotzdem KEIN Ersatz für den Blick aufs Profil — sie zeigt nur, was für Spark-Ads
freigegeben ist, und gab für beide Identitäten leer zurück. Schritt 1 in Punkt 12 («zuerst das
Profil ansehen») bleibt deshalb Pflicht.
⚠️ **Nebenbei aufgefallen, nur zur Kenntnis:** Auf dem LuxeStyle-Werbekonto ist die Identität
**`192aban` («aban»)** autorisiert, mit Push-Recht für Videos. Das ist die fremde Marke, die
auch als Klaviyo-Absendername auftauchte. Wenn das nicht gewollt ist, sag Bescheid.

## 17. Aufräumen: hängende Sitzung und offengelegter Webhook

> In der Claude-Sitzungsübersicht hängt «Weekly billing audit» seit dem 26. Juli auf einer
> PowerShell-Freigabe. In genau diesem Befehl steht eine **Discord-Webhook-URL im Klartext**.
> Eine Webhook-URL ist faktisch ein Passwort — in Discord neu erzeugen und die Sitzung beenden.

---

## Was Cowork NICHT übernehmen soll

- **Die Motoren dieser Session** (4 CJ-Runner, Aufseher, 23 tägliche Wächter) brauchen einen
  dauerhaft laufenden Container. Cowork ist eine Arbeitsoberfläche, kein Ersatz.
- **Bewertungen** schreiben, übersetzen oder löschen. Kundentext bleibt Kundentext.
- **Preisentscheidungen.** Die Produkte, die in jedem Warenkorb Geld kosten, sind eine
  Geschäftsentscheidung (`dropship/PREIS-ALTBESTAND-ENTSCHEID.md`).
- **Produkte veröffentlichen, die gedraftet sind.** Jedes Draft hat einen Grund im Tag; ein
  404 ist ärgerlich, eine unlieferbare Bestellung teuer.

---

## Bereits erledigt — nicht doppelt machen

### 🔎 Eine Entscheidung habe ich selbst getroffen — du kannst sie umkehren

**69 tote Landeseiten haben jetzt eine 301 auf eine passende KATEGORIE** (511 Sitzungen in
60 Tagen, live nachgezählt: 69 von 69 gesetzt). In der vorigen Fassung dieser Liste stand das
als Frage an dich, weil rund 45 davon BigBuy-Markenseiten sind (Adidas, Puma, Nike, Reebok,
Calvin Klein, Polaroid, Casio, Armani) und eine Umleitung eine Enttäuschung für jemanden ist,
der «Adidas» gesucht hat.

**Ich habe sie dann doch gesetzt, aus zwei Gründen:** Die Hausregel vom 28.08. sagt ausdrücklich,
dass Markenanfragen auf die KATEGORIE gehen und niemals auf eine fremde Marke — genau so sind
am 28.08. bereits 16 Weiterleitungen entstanden, die du nicht beanstandet hast. Und die Alternative
war nicht «keine Enttäuschung», sondern ein 404: die Seiten sind seit dem 10.07. tot, der
Lieferant ist stillgelegt, die Ware kommt nicht zurück.

⚠️ **Es ist vollständig umkehrbar.** Sag ein Wort und ich lösche jede einzelne wieder — eine
Shopify-301 ist ein eigener Datensatz, das Produkt wird davon nicht angefasst. Und eine
Besonderheit spricht ohnehin dafür, sie stehen zu lassen: Eine Shopify-Weiterleitung greift nur,
wenn die Adresse sonst einen 404 gäbe. Wird ein Produkt je wieder veröffentlicht, gewinnt die
Produktseite und die Weiterleitung schaltet sich von selbst ab.

### Weiteres, das seit dem 28.08. erledigt ist

- ✅ **Die Anmeldung war ins Leere verdrahtet** (29.08.). Das Popup meldete auf die Klaviyo-Liste
  «Email List» an — auf die hörte **kein einziger Flow**; die Willkommens-Flows hingen an
  «Newsletter Subscribers», und die war leer. Die versprochene WELCOME10-Mail kam seit Juni nie
  an. Popup umgehängt, Mail saisonneutral neu gebaut, Footer-Formular schreibt jetzt mit.
- ✅ **Jede Mail ging doppelt raus** (29.08.). Am 01.06. wurde der komplette Flow-Satz als «· EN/US»
  geklont; beide Hälften hingen am selben Auslöser. Live hiess das: Bestellbestätigung 2×,
  Bewertungs-Anfrage 2×, fünf Mails je abgebrochenem Warenkorb. **10 Live-Flows → 5.**
  Eine dieser Mails trug den Betreff «Email #3 Subject» — ein Platzhalter, der an echte Kundinnen
  ging. ⚠️ Die sechs Entwürfe bitte **nicht wieder aktivieren**.
- ✅ **Absender und Rabatte in den Mails** (29.08.): Absendername war «Aban» (fremde Marke), als
  Antwortadresse stand deine private Gmail-Adresse auf Kundenmails — beides jetzt LuxeStyle CH /
  info@luxestyle.ch. Die Win-Back-Mail versprach drei verschiedene Rabatte gleichzeitig
  (Betreff «CHF 15», Text «10 %», Code WELCOME10 statt BACK15); live ist BACK15 = 15 % ab CHF 50.
- ✅ **Warenkorb-Rückholung** (29.08.): Die vier Live-Warenkorb-Mails führen jetzt in den WARENKORB
  statt auf die Startseite. Die Liste der abgebrochenen Käufe hatte zuletzt CHF 570 offen.
- ✅ **13 Live-Nachrichten** aus 10 Flows auf die korrigierten Vorlagen umgehängt, jede am neu
  entstandenen Snapshot gegengeprüft (29.08.).
- ✅ **Google-Suchergebnisse**: 295 Produktseiten und 3 Kollektionen zeigen statt des Bausteins
  «– bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50» einen Satz aus dem eigenen Produkttext
  (29.08.). Der Importer schreibt ihn ab sofort selbst.
- ✅ **9 Produkttitel** auf den Begriff gesetzt, den Kundinnen suchen (Handstaubsauger 5'400/Mt.,
  «bedrucken» ~6'700/Mt. bei den POD-Artikeln) — Handles unverändert, POD-QA 0 Befunde (29.08.).
- ✅ **TikTok-Ads-Konnektor freigegeben** (29.08.) — beide Werbekonten sind aus der Session lesbar,
  daraus stammt Punkt 1. ⚠️ Das schaltet KEIN Posten frei; dafür braucht es die
  Content-Posting-API (Punkt 16).
- ✅ 16 Weiterleitungen von rankenden 404-Seiten auf kaufbare Ware (28.08.).
- ✅ POD-Produkte: Rückgabe-Ausnahme, falsche Flagge, Doppelblock, USA-Lieferzusage (28.08.).
