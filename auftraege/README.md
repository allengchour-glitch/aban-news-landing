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
{ "id": "startseite-mobil", "typ": "screenshot",  "url": "https://luxestyle.ch/", "mobil": true, "ganze_seite": true }
{ "id": "faq-text",         "typ": "seite_text",  "url": "https://luxestyle.ch/pages/faq" }
{ "id": "anmeldungen",      "typ": "skript",      "skript": "anmeldungen_pruefen.mjs" }
```

`mobil: true` setzt die Fensterbreite auf 390 px — 77 % unserer Besucherinnen sind auf dem
Handy. (Das ist die Breite, keine Geräte-Emulation: die Browser-Kennung bleibt Desktop.
Horizon entscheidet über CSS, dafür genügt es.)

`skript` startet ausschliesslich eine Datei aus `automation/browser/`, die im Repo steht
(Basename, kein Pfad). **Aus der Auftragsdatei wird nie Code ausgeführt.** Das Repo ist
öffentlich; ein Runner, der Shell aus der Warteschlange läse, wäre eine Fernsteuerung.
Vorhanden: `anmeldungen_pruefen.mjs` (rein lesend — sagt, bei welchen Diensten das Profil
angemeldet ist; der sinnvollste erste Auftrag nach dem einmaligen Einloggen).

## Was in der Quittung stehen kann

| `stand` | Bedeutung |
|---|---|
| `ok` | erledigt, `ergebnis` trägt Text/Datei und die **End-URL** (`ziel`) |
| `nicht-angemeldet` | die Seite hat auf eine Anmeldung umgeleitet → Profil einloggen |
| `umgeleitet` | **angekommen ist etwas anderes** — Einwilligungswand, Bot-Wand, fremder Gastgeber |
| `fehler` | alles andere, mit Grund |
| `laufend` | **mittendrin gestorben** — von Hand prüfen, NICHT einfach wiederholen |

`nicht-angemeldet` ist ein eigener Stand, weil sonst der gefährlichste Fall still wäre: ein
Merchant-Auftrag liefert sonst einen hübschen Screenshot **der Login-Maske**, und die
Quittung sähe aus wie Erfolg.

`umgeleitet` kam am 17.09. dazu, nachdem genau das trotzdem zweimal passiert ist. Auftrag 03
landete auf einer Bot-Prüfseite («Deine Verbindung muss verifiziert werden»), Auftrag 06 auf
Googles Einwilligungswand — **mit einer «Sign in»-Schaltfläche oben rechts**. Beide sind keine
Anmeldemasken, beide bekamen `ok`. Der Melder beantwortete also die Frage *«ist das eine
Anmeldemaske?»* völlig richtig — nur war es die falsche Frage. Die richtige lautet **«bin ich
dort angekommen, wo ich hinwollte?»**, und sie wird jetzt getrennt gestellt
(`hat_ziel_erreicht`, Gegenprobe in beide Richtungen mit den zwei echten Fehlalarmen als
Testfall). Wo die Antwort unklar ist, steht seither `null` statt `true` — ein ehrliches
«weiss ich nicht» ist mehr wert als ein falsches Ja.

Und dann kam **Auftrag 09**, die Gegenprobe zu 03 mit genau dieser neuen Prüfung. Er meldete
wieder `ok` — nach seinen eigenen Massstäben zu Recht: Endadresse unverändert
`admin.shopify.com/store/…/marketing`, kein Gastgeberwechsel, keine Anmeldemaske. Im Bild
stand trotzdem nur eine Cloudflare-Wand. **Eine Adressprüfung kann das grundsätzlich nicht
sehen — die Wand behält die Adresse.** Deshalb gibt es jetzt eine dritte Schicht mit einem
anderen Sinnesorgan: dem Seitentext (`ist_wandtext`, nur bei kurzen Seiten, damit ein
Blogartikel über Captchas nicht als Wand gilt — der Köder steht im Test).

Drei Schichten, drei verschiedene Fragen: *Ist das eine Anmeldemaske? Bin ich angekommen?
Steht eine Wand davor?* Jede einzelne hat hier schon einmal «alles gut» gesagt, während es
nicht gut war.

`laufend` entsteht durch den **Claim**: alles, was klicken oder absenden kann, wird vor der
Ausführung als Quittung committet und gepusht. Ohne das käme die Auftragsdatei nach einem
missglückten Push zurück und der Vorgang liefe ein zweites Mal — dieselbe Falle, die hier
schon IG-Doppelposts erzeugt hat (CLAUDE.md Regel 10). Gelingt der Claim-Push nicht, wird
**gar nicht ausgeführt**: unverrichtet ist harmlos, doppelt ausgeführt nicht.

## Was geprüft ist — und was nicht

Am 17.09. im Container durchgespielt (`server/luxe_auftrag_runner.mjs`): unbekannte Art,
`http://` statt `https://`, kaputtes JSON, Pfad-Köder `../../etc/passwd`, fehlendes Skript —
**alle fünf abgelehnt, jede mit Quittung, Warteschlange danach leer.** Der Anmelde-Melder hat
eine eigene Gegenprobe (`/opt/node22/bin/node server/anmelde_erkennung.test.mjs`): 8 echte
Anmeldeseiten erkannt, 8 normale Seiten durchgelassen, darunter der Köder
`/collections/login-armband`.

**Nicht bewiesen ist das eigentliche Laden einer Seite.** Chromium startet und navigiert hier
nachweislich, bricht aber mit `ERR_CERT_AUTHORITY_INVALID` ab: der Ausgangs-Proxy dieses
Containers fängt TLS mit einer CA ab, der der Browser nicht traut. Auf dem Hetzner-Server
gibt es diesen Proxy nicht. Das zu übergehen wäre möglich und wäre falsch — ein angemeldeter
Browser, der Zertifikatsfehler ignoriert, ist genau der Weg, auf dem Sitzungen gestohlen
werden. Die beiden wartenden Aufträge sind deshalb der erste echte Test.

## Wofür das hier wirklich gebraucht wird

Seit dem 19.08. steht gemessen fest: **von unserer eigenen IP ist die Storefront nicht
prüfbar** — das Rechenzentrum bekommt eine stundenalte Bot-Cache-Kopie, und
`site_shot.mjs` teilt diese IP. Der Hetzner-Server sitzt woanders im Netz und sieht die
Seite so, wie eine Kundin sie sieht. Dazu kommen die Aufgaben, die eine **angemeldete**
Sitzung brauchen (Google Merchant, BigBuy-Ticket, Pinterest-OAuth) — dafür muss der
Betreiber das Browserprofil einmal anmelden.

## Den Agenten-Browser anmelden (die Stolperstellen)

Der Agenten-Browser ist ein **kopfloses Chromium auf dem Hetzner-Server** mit eigenem Profil
(`/var/lib/luxe-agent/chrome-profil`). **Anmeldungen im eigenen Brave auf dem PC zählen dort
nicht** — anderes Profil, anderer Rechner. Gemessen am 17.09.: nach dem ersten Versuch waren
Shopify und BigBuy angemeldet (im getunnelten Fenster gemacht), Google und Pinterest nicht
(die waren im privaten Brave).

1. **Server:** `cd /opt/luxe-agent/repo && git pull -q && bash server/luxe-profil-anmelden.sh`
2. **PC:** `ssh -L 9222:127.0.0.1:9222 root@46.225.75.125` — Fenster offen lassen, es *ist* der Tunnel
3. **PC-Browser:** `chrome://inspect` → links **Devices** → `[Configure…]` → `localhost:9222` →
   **Häkchen «Discover network targets» setzen**. Erst dann erscheint der Block
   **Remote Target #localhost:9222** mit einer Zeile je Tab. *Eingetragen ist nicht aktiviert* —
   daran ist es am 17.09. hängen geblieben.

Bleibt der Block leer: `curl http://127.0.0.1:9222/json/version` auf dem PC. JSON mit «Chrome/…»
heisst Tunnel steht (dann fehlt das Häkchen); «Connection refused» heisst SSH-Fenster zu oder das
Anmelde-Skript auf dem Server beendet.
