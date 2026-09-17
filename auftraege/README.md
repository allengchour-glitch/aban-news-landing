# 📮 Auftragskasten für den Hetzner-Browser-Agenten

Der Server (46.225.75.125) holt sich hier alle 5 Minuten Arbeit ab. **Es geht keine
Verbindung hinein** — er fragt von sich aus nach. Einrichtung: `server/luxe-agent-setup.sh`,
Hintergrund und Messungen: `dropship/HETZNER-SERVER.md`.

## Ablauf

1. Auftrag als JSON nach `auftraege/offen/<id>.json` legen, committen, pushen.
2. Der Server führt ihn aus, löscht die Datei und legt `auftraege/erledigt/<id>.json` an
   (Bilder unter `auftraege/ergebnis/`). Auch ein Fehlschlag bekommt eine Quittung —
   ein Automat, der still scheitert, ist dasselbe wie keiner.
3. Beim nächsten `git pull` liegt das Ergebnis hier.

## Auftragsarten (mehr gibt es nicht — Absicht)

```jsonc
{ "id": "startseite-mobil", "typ": "screenshot",  "url": "https://luxestyle.ch/", "ganze_seite": true }
{ "id": "faq-text",         "typ": "seite_text",  "url": "https://luxestyle.ch/pages/faq" }
{ "id": "merchant",         "typ": "skript",      "skript": "merchant_pruefen.mjs" }
```

`skript` startet ausschliesslich eine Datei aus `automation/browser/`, die im Repo steht
(Basename, kein Pfad). **Aus der Auftragsdatei wird nie Code ausgeführt.** Das Repo ist
öffentlich; ein Runner, der Shell aus der Warteschlange läse, wäre eine Fernsteuerung.

## Wofür das hier wirklich gebraucht wird

Seit dem 19.08. steht gemessen fest: **von unserer eigenen IP ist die Storefront nicht
prüfbar** — das Rechenzentrum bekommt eine stundenalte Bot-Cache-Kopie, und
`site_shot.mjs` teilt diese IP. Der Hetzner-Server sitzt woanders im Netz und sieht die
Seite so, wie eine Kundin sie sieht. Dazu kommen die Aufgaben, die eine **angemeldete**
Sitzung brauchen (Google Merchant, BigBuy-Ticket, Pinterest-OAuth) — dafür muss der
Betreiber das Browserprofil einmal anmelden.
