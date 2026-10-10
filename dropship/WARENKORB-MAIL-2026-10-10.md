# Warenkorb-Erinnerung kam während des Bezahlens (10.10.2026, Betreiber «sonst verbessere weiter»)

## Gemessen

**Klaviyo-Flow «Abandoned Checkout» `Vse76a`** (live seit 24.05.):
- Gemessen über `get_flow` mit Definition: Die **erste Aktion (`entry_action_id` 106812819) war die Mail** «Dein Einkauf wartet auf dich».
- Danach kamen erst 1 h + 23 h Wartezeit und Mail 2.
- Die Vorlage selbst heisst «Warenkorb 1 **(nach 1 Std)**». Geplant war also Warten, dann Mail. Verdrahtet war es umgekehrt.
- Der Bericht vom 05.10. hat das falsch gelesen («1 h warten → Mail 1»).

**Zeitstempel** (Klaviyo «Checkout Started» und «Received Email», 27.09.–06.10.). Die Zeit ist der Abstand zwischen Kassenstart und Mail 1:

| Kassenstart (UTC) | Mail 1 nach | Was danach geschah |
|---|---|---|
| 27.09. 21:27 | 7 min | kein Kauf |
| 29.09. 07:44 | 44 min | kein Kauf (Mail 2 nach 24 h) |
| 29.09. 22:14 | **32 s** | **Kauf #1020 um 22:16**: Die Kundin war gerade an der Kasse |
| 30.09. 21:45 | **25 s** | **Kauf #1021**: gerade an der Kasse. Klaviyo zählt das als «zurückgeholt» (CHF 45.90) |
| 03.10. 20:02 | **18 s** | kein Kauf (Mail 2 nach 24 h) |
| 04.10. 00:14 | **14 s** | Eigenkorb des Betreibers |

- **Median 25 s.** 2 von 6 Empfängerinnen haben in dem Moment bezahlt.
- Sie bekamen «Du hast etwas vergessen» mitten im Bezahlen.
- Die einzige «Conversion» des Flows (30 T) ist keine Rückholung.
- Der Filter «Placed Order = 0 seit Flow-Start» kann so nicht greifen, weil er beim Versand geprüft wird, also sofort.

**Wer überhaupt in Frage kam** (Shopify `abandonedCheckouts` 25.09.–06.10. = 10 Körbe; Adressen nur gelesen, nicht notiert):

| Art | Körbe | Beleg |
|---|---|---|
| **eigene Prüfkörbe** | 3 | Adressen `…@example.com`, 03.10. 02:24–02:40. Das waren die «Leinen-Set Pink/S ×2 + Sirène» im Bericht vom 05.10., gezählt als «fremd» |
| Eigenkorb Betreiber | 1 | eigene Kunden-ID (`_grow_bedingung.txt`) |
| Wegwerf-/ungültige Adresse | 4 | 2× ein Weiterleitungsdienst (Klaviyo unterdrückt sie sofort), 2× Zufallsadresse mit Hard Bounce nach 3 min |
| **echt und erreichbar** | **2** | beide bekamen Mail 1 + Mail 2, kein Kauf |

Der Bericht vom 05.10. sprach von «7 fremden Körben von 5 Kunden-IDs». **Echt waren 2.**

**Texte der Mails:**
- Mail 1: «Wir haben deine Lieblingsstücke **reserviert** – aber nicht ewig». Beim Direktversand reserviert niemand etwas.
- Mail 2: «10 % Rabatt – **nur für kurze Zeit**». WELCOME10 läuft bis 31.12.2027, das ist eine falsche Verknappung.
- Beide Mails beginnen mit `Hey {{ first_name|default:'' }},`. Ohne Vorname steht dann «Hey ,».
- Mail 1 schreibt «abschlie**ß**en».
- WELCOME10 selbst geprüft: aktiv, 10 %, Mindestwert CHF 0.01, die Zusage «ohne Mindestbestellwert» stimmt.

## Getan

**Neuer Flow «Abandoned Checkout · 1 Std» `XEGbTB`, live seit 10.10. 08:13 UTC:**
- Auslöser und Filter sind dieselben («Checkout Started», «Placed Order = 0 seit Flow-Start»).
- Ablauf: **1 h warten → Mail 1 → 23 h warten → Mail 2**.
- Absender, Betreff und Smart Sending sind gleich wie vorher.
- Den alten Flow umzubauen ging nicht. Die API kann die Einstiegsaktion eines bestehenden Flows nicht ändern, darum gibt es einen neuen Flow.

**Texte neu** (Vorlagen `XAEbAz`/`Y4qHwq`, im Flow als `RfQt4V`/`RNefka`):
- Mail 1: «dein Warenkorb ist gespeichert. Mit einem Klick bist du wieder an der Kasse – Bezahlen mit TWINT, Karte oder Klarna (Kauf auf Rechnung).» Dazu «Fragen zur Grösse oder Lieferung? Antworte einfach auf diese Mail.» und «Jetzt abschliessen».
- Mail 2: «10 % auf deinen Warenkorb – ohne Mindestbestellwert» und «30 Tage Rückgabe · TWINT, Karte oder Klarna».
- Die Anrede ist `{% if first_name %}Hey {{ first_name }},{% else %}Hallo,{% endif %}`.
- Probe-Render mit und ohne Vorname: «Hallo,» bzw. «Hey Lea,», der Link führt zur Kasse.

**Alter Flow `Vse76a` → Entwurf** (08:13:07 UTC). Er ist umkehrbar und hatte zu dem Zeitpunkt niemanden in der Warteschlange (letzter Kassenstart 06.10.).

**Nachgemessen** (`get_flows_triggered_by_metric` XhnJPv):
- Genau **1 live**: `XEGbTB`.
- `Vse76a` und «Abandoned Cart · EN/US» `UXEjv2` stehen auf Entwurf.

**Wächter:**
- `automation/klaviyo_flow_pruefen.py` mit Regeldatei `automation/data/klaviyo_flow_regel.json` prüft:
  - genau 1 live-Flow je «Checkout Started»
  - erste Aktion ist eine Wartezeit von mindestens 30 min
  - keine verbotenen Sätze (falsche Verknappung, «reserviert», ß, «Hey ,»)
  - der Stand ist höchstens 7 T alt
- Selbsttest 8/8. Der alte Aufbau fällt nachweislich durch (2 Befunde), die Gegenprobe am echten Stand ergab 6 Befunde.
- Die Shell hat keinen Klaviyo-Schlüssel. Deshalb misst eine Session über den Konnektor, und der Stand liegt in `dropship/_klaviyo_flow_stand.json` (ohne Personendaten).
- Der Aufseher (`fixer_keepalive.sh`) prüft stündlich und meldet «⚠️ KLAVIYO-WARENKORB» oder «Messung fällig».

**Messung bereinigt:**
- `automation/checkout_abbruch_messen.py` zählt jetzt `echt · Test · eigen · Wegwerf`.
- Test heisst: Domain `example.*`/`.test`/`.invalid` oder eine Adresse, die mit `test`/`qa` beginnt.
- Eigen heisst: Kunden-ID aus `_grow_bedingung.txt`.
- Wegwerf heisst: bekannte Wegwerfdienste oder `mail` + 6 Ziffern.
- Die Adresse wird nur gelesen, nie ausgegeben.
- Lauf 15 T: **10 Abbrüche (echt 2 · Test 3 · eigen 1 · Wegwerf 4)**.

## Offen

- **Wirkung messen ab ~24.10.**: Bekommen echte Abbrecherinnen Mail 1 nach 60 min, und ist die Zahl der «Käufe während der Kasse», die eine Mail bekommen, gleich 0? (`get_events` Received Email gegen Checkout Started und Placed Order).
- **Prüfkörbe kennzeichnen:** Wer künftig die Kasse testet, nimmt eine Adresse `…@example.com` oder eine, die mit `test`/`qa` beginnt. Dann zählt die Messung sie nicht als Kundin.
- Mail 3 im alten Flow («Email #3 Subject», Entwurf) wurde nicht übernommen. Bei 2 echten Abbrüchen in 15 T lohnt eine dritte Mail nicht.

## Lehre

**Eine Wartezeit, die NACH der Mail steht, verzögert nur die nächste Mail.** Der Name der Vorlage («nach 1 Std») und ein früherer Bericht («1 h warten → Mail 1») sagten beide das Gegenteil von dem, was verdrahtet war. Massgeblich ist die `entry_action_id` und ein Zeitstempel-Vergleich Auslöser→Versand, nicht die Beschriftung.

**Und vor jeder Abbruch-Statistik die eigenen Prüfkörbe abziehen.** 3 von «7 fremden» Körben waren unsere eigenen Tests. Sie stammten von der Landeseite, auf die die ganze Analyse zielte (Provence-Set).
