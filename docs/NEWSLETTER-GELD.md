# Mit dem Newsletter Geld verdienen — die ehrliche Reihenfolge

Kurz und ohne Bullshit: Wie aus aban-news-Abonnenten Geld wird, in der
Reihenfolge, die bei *kleiner* Liste wirklich funktioniert. Kein Kanal ersetzt
Reichweite — aber du musst auch nicht auf 10.000 Leser warten, um anzufangen.

## Der eine Satz

Du verdienst nicht daran, *dass* du Abonnenten **hast**, sondern an dem, was du
ihnen verkaufst. Die Liste ist der Vermögenswert; Geld entsteht über die Kanäle
unten.

## Reihenfolge nach Listengröße

```
1. Eigene Produkte (Buch, Founding)   -> ab den ersten Lesern
2. Affiliate                          -> ab ein paar hundert engagierten Lesern
3. Sponsoring / Werbung               -> erst ab ~1.000+ Lesern lohnend
```

Sponsoring ist **nicht** der erste Hebel, sondern der letzte. Am Anfang verdienst
du an deinem eigenen Buch und an Founding-Members.

## Die Kanäle — Status & wo es im Repo steht

| Kanal | Wie Geld reinkommt | Datei | Status |
|-------|--------------------|-------|--------|
| Buch / eBook (pay what you want) | Käufer zahlt Karte/PayPal → Lemon Squeezy zahlt aufs Konto aus | `js/buch-config.js` (`BUY_URL`) | aktiv |
| KDP / Amazon | Tantiemen per Banküberweisung (IBAN), kein PayPal | `docs/KDP-VEROEFFENTLICHEN.md` | noch nicht veröffentlicht |
| Founding €149 lifetime | Stripe- **oder** PayPal-Link → einmalzahlung | `founding.html` (`STRIPE_FOUNDING_LINK` / `PAYPAL_FOUNDING_LINK`) | Link eintragen |
| Sponsoring / Werbung | Sponsor zahlt pro Ausgabe, Rechnung auf CH-IBAN | `sponsoring.html` (Rate-Card) | bereit, braucht Leser |
| Affiliate | Provision pro Anmeldung (Systeme.io, ElevenLabs) | `ki-tools-radar/affiliate.json` | aktiv |
| beehiiv Boosts / Ad Network | beehiiv zahlt fürs Empfehlen passender Newsletter | beehiiv-Dashboard | optional |

## Bezahlmethoden — was womit geht

- **Lemon Squeezy** (Buch): akzeptiert **Karte + PayPal** im Checkout. Als
  *Merchant of Record* erledigt LS die EU-/DACH-MwSt automatisch und zahlt dir
  aufs Bankkonto aus. Deshalb besser als ein nackter PayPal-Button für digitale
  Produkte.
- **Founding**: Stripe **oder** PayPal-Link. Schnellster Start ohne Setup:
  `paypal.me/DEINNAME/149` in `founding.html` eintragen → Button ist sofort live.
  Stripe hat Vorrang, wenn beide gesetzt sind.
- **KDP**: Amazon zahlt nur per **Banküberweisung (IBAN)** — kein PayPal.
- **Sponsoring**: Rechnung, 14 Tage netto, auf Schweizer IBAN.

## Konkret „heute anfangen"

1. **Buch** läuft schon — Lemon-Squeezy-Link ist gesetzt, PayPal im Checkout
   verfügbar (in den LS-Einstellungen unter *Payment methods* prüfen).
2. **Founding live schalten:** in `founding.html` `STRIPE_FOUNDING_LINK` *oder*
   `PAYPAL_FOUNDING_LINK` eintragen. Solange beide leer sind, läuft der Kauf per
   E-Mail (kein toter Button).
3. **KDP veröffentlichen:** Schritt-für-Schritt in `docs/KDP-VEROEFFENTLICHEN.md`.
4. **Reichweite:** der eigentliche Hebel. Siehe `ki-geld-projekt/MARKETING-PLAYBOOK.md`
   und `LINKEDIN-CONTENT-PLAN.md`. Wachstum zuerst, Monetarisierung folgt.

## Grobe Faustzahlen (zur Erwartungssteuerung, keine Versprechen)

- Nischen-B2B-Sponsoring: ~20–50 € pro 1.000 geöffnete Mails.
- Über alle Kanäle grob 0,50–1 € pro Abonnent und Jahr — mehr, wenn du eigene
  Produkte verkaufst.
- 200 Leser = Taschengeld. ~5.000 engagierte Leser = ernsthafter Nebenverdienst.

## Sicherheit (nicht verhandelbar)

Bankdaten/IBAN **nur** auf der offiziellen Plattform-Seite (Lemon Squeezy, Stripe,
PayPal, KDP — immer https) eingeben. **Nie** per Chat, Mail oder Screenshot. Keine
API-Keys/Passwörter weitergeben. Niemand Seriöses verlangt vorab Geld, damit du
verdienen darfst — das ist immer Betrug.
