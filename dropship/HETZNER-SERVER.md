# 🖥️ Hetzner-Server — der Weg zu Browser-Aufgaben (Stand 18.09.2026)

Betreiber 17.09.: «hetzner server extra eingerichtet». Er ist **nicht neu** — er läuft
seit dem 22.06.2026 und steht seither im Repo beschrieben.

## Was GEMESSEN feststeht

| Frage | Messung | Ergebnis |
|---|---|---|
| Wo steht er? | `PROJEKT.md:57` | Hetzner **46.225.75.125**, Ubuntu 26.04, Repo unter `/opt/abannews` |
| Was tut er heute? | `server/README.md` | systemd-Timer `abannews-deploy.timer`, alle 3 Min: pollt `origin/main` → `build-pages.sh` → Cloudflare Pages |
| Erreiche ich ihn per SSH? | `/dev/tcp/46.225.75.125/22`, 8 s | **Nein**, Zeitüberschreitung |
| Liegt das am Server? | Gegenprobe `/dev/tcp/140.82.121.4/22` (github.com) | **Nein** — Port 22 ist von hier **generell** blockiert. Das ist die Ausgangsregel des Containers, nicht die Firewall des Servers. |
| Antwortet er auf 443? | `curl -k https://46.225.75.125/` | **Nein** — «Connection reset». Auf 443 lauscht nichts (ufw lässt nur SSH zu). |
| Steht CDP 9222 offen? | `/dev/tcp/…/9222` | **zu** — gut so. |

⚠️ **Eine Messung war wertlos und wäre fast als Befund durchgegangen:** der blosse
TCP-Verbindungstest auf **443 gelingt IMMER** — auch gegen `203.0.113.1`, eine Adresse aus
dem Testnetz, hinter der per Definition nichts steht. Der Ausgangs-Proxy nimmt jede
:443-Verbindung an, bevor irgendein Ziel gefragt wird. **Ein Test, der nicht scheitern
kann, misst nichts.** Erst `curl` gegen den echten Dienst zeigte die Wahrheit.

## 🗺️ Was der Bot KANN — gemessen, nicht vermutet (18.09.2026)

Diese Tabelle ist die Antwort auf «mach den Bot zu einem Superbot». Sie entsteht aus
Auftrag 32 und ist bewusst auch dort ehrlich, wo sie ein Nein enthält: **ein
begründetes Nein spart die Arbeit, die sonst dreimal gegen dieselbe Wand läuft.**

| Dienst | Status | Angemeldet? | Was daraus folgt |
|---|---|---|---|
| **Pinterest** | 200 | ✅ **ja** | Der EINZIGE echte. Profil messen und Felder schreiben — Auftrag 30/31 haben es getan, das ist ein Handlungsbeleg |
| **Shopify Admin** | **403** | ❌ nein | ALLE fünf Admin-Seiten 403 mit 68 Zeichen Text, auch `/settings/billing`. Der Dateispeicher bleibt unmessbar, bis das Profil dort angemeldet ist |
| **BigBuy** | **403** | ❌ nein | Cloudflare sperrt den Agenten (Ray ID gemessen 17.09.). **Die Bot-Erkennung wird nicht umgangen** — Ticket bleibt Betreiber-Klick |
| **CJdropshipping** | **404** | ❌ nein | Startseite zeigt «anmelden»/«registrieren», nirgends «Abmelden»/«Balance»; alle vier Konsolenpfade 404. Für den Dispute USD 25.54: **einmal im Agentenprofil bei CJ einloggen** |
| **TikTok Studio** | 200 | ❌ nein | Leitet auf die Anmeldung. Social-Stopp gilt ohnehin |
| **Google Merchant** | 200 | ⛔ **unmöglich** | Einwilligungswand; Google lässt Passwort-Anmeldungen in diesem Browser grundsätzlich nicht zu. **Nicht erneut versuchen** |

> ⚠️ **Diese Tabelle ist die KORRIGIERTE Fassung (Auftrag 36).** Die erste, ein paar Stunden
> ältere, führte Shopify, BigBuy, Pinterest und CJ alle als «angemeldet ✅» — sie stammte aus
> Auftrag 32, der noch **ohne Statusprüfung** lief. Von diesen vier hielt genau **einer** der
> Nachmessung stand. Der Grund ist eine Regel, die harmlos klang: «Ziel erreicht → angemeldet».
> **Eine erreichte Adresse belegt keine Anmeldung. Nur eine gelungene Handlung belegt sie** —
> Pinterest hat so einen Beleg (Werte gelesen, ein Feld geschrieben), die anderen drei hatten
> nie einen. `angemeldet: true` ist jetzt an Status 200 gebunden.

### Auftragsarten (vier, mehr ist Absicht)

`screenshot` · `seite_text` · `skript` (nur eine Datei aus `automation/browser/`, die im
Repo steht) · `wartung` (nur ein Name aus einer festen Liste). **Aus der Auftragsdatei
wird nie Code ausgeführt** — das Repo ist öffentlich, ein Runner, der Shell aus der
Warteschlange läse, wäre eine Fernsteuerung für jeden.

### Vier Wahrnehmungsschichten — jede kam aus einem Fehlbefund

Der Bot hat viermal «alles gut» gemeldet, wo nichts gut war. Jede Schicht ist die
Antwort auf einen dieser Fälle, und **jede wurde von den anderen dreien nicht gesehen**:

1. `ist_anmeldeseite` — «ist das eine Anmeldemaske?»
2. `hat_ziel_erreicht` — «bin ich überhaupt angekommen?» (Auftrag 06: Googles
   Einwilligungswand mit «Sign in» → gemeldet als *angemeldet: true*)
3. `ist_wandtext` — «steht hier eine Bot-Wand?» (Auftrag 09: Cloudflare behält die
   Adresse, eine Adressprüfung kann das nie sehen)
4. `ist_fehlerseite` — «gibt es diese Seite?» (Auftrag 32: CJ mit Endadresse `/404`
   → *angemeldet: true*. Prüft Status **und** Adressmuster, weil Einzelseiten-
   Anwendungen auf `/404` umleiten und dabei **200** antworten)

**Die Lehre gilt über den Bot hinaus: die Abwesenheit bekannter Fehler ist kein
Beweis für Erfolg.** Drei Wachen, die je eine Art des Scheiterns kennen, melden
gemeinsam «in Ordnung», sobald es auf eine vierte Art scheitert.

### Der Puls — damit sein Tod auffällt

`grep -rln luxe_auftrag_runner automation/ tools/` gab am 18.09. **0 Treffer**: der
einzige Rechner mit einem echten Browser stand in keiner Wacht-Liste. Und weil der
Runner bei leerer Warteschlange mit `exit 0` endete, hinterliess der **häufigste**
Lauf gar keine Spur — «acht Stunden keine Quittung» war nicht von «tot» zu
unterscheiden.

Jetzt schreibt jeder Lauf `auftraege/_puls.json` (gepusht ~stündlich, lokal immer),
und `automation/bot_puls.py` meldet in der stündlichen Ampel, wenn der letzte Lauf
über zwei Stunden her ist. Sechs Gegenproben, darunter die zwei wichtigsten: ein
**frischer** Puls muss schweigen (sonst wäre eine Regel, die immer alarmiert,
«erfolgreich» und wertlos), und eine **fehlende** Datei heisst «noch kein Puls»,
nicht «tot» — ein Fehlalarm, dem niemand mehr glaubt, ist schlimmer als keiner.

## Was daraus folgt

**Von dieser Session aus gibt es KEINEN Weg hinein** — weder SSH noch HTTPS, und daran
ändert kein Zugangsdatum etwas. Die Richtung muss umgekehrt sein: **der Server holt sich
seine Aufträge.** Genau das kann er schon — sein Deploy-Timer pollt seit Juni alle drei
Minuten `origin`. Dasselbe Muster trägt auch Browser-Aufträge.

```
ich → committe Auftrag nach auftraege/offen/*.json → push
                                   ↓ (Timer, alle 5 Min, git fetch)
Server → führt ihn aus → schreibt auftraege/erledigt/*.json + Screenshot → push
                                   ↓
ich → lese das Ergebnis beim nächsten Turn
```

Installation: `server/luxe-agent-setup.sh` (idempotent). **Noch nie auf dem Server
gelaufen** — alles darin ist ungetestet, bis er es einmal ausführt.

## Wie komme ich überhaupt auf den Server?

**1. Normalweg:** `ssh root@46.225.75.125` — setzt voraus, dass der private Schlüssel auf dem
Rechner liegt, von dem aus du dich verbindest.

**2. Wenn SSH abweist:** `server/harden-ssh.sh` setzt `PasswordAuthentication no` und
`PermitRootLogin prohibit-password`. **Ob es je ausgeführt wurde, ist nirgends festgehalten**
— und von der Cloud-Session aus nicht prüfbar, weil Port 22 dort generell gesperrt ist.
Deshalb im Zweifel gleich Weg 3.

**3. Der Weg, der immer geht — die Web-Konsole von Hetzner.** Sie hängt am Bildschirm der
Maschine und braucht weder SSH noch Schlüssel:
- **Cloud-Server:** console.hetzner.cloud → Server öffnen → Symbol **`>_`** («Console»).
  Root-Passwort neu setzen: dort unter **Rescue**.
- **Dedicated / Robot:** robot.hetzner.com → Server → **LARA** bzw. Rescue-System.

Welches Produkt es ist, steht im Repo nicht; `PROJEKT.md:57` nennt nur IP und «Ubuntu 26.04».
Cloud ist das Wahrscheinlichere.

⚠️ Das per Hetzner-Mail verschickte Root-Passwort gilt seit Juni als **kompromittiert**
(`server/README.md`). Wer es zum Einsteigen benutzt, sollte danach `harden-ssh.sh` mit dem
eigenen öffentlichen Schlüssel laufen lassen und das Passwort im Panel rotieren.

## Was nur der Betreiber tun kann

**1. Einmal installieren** — ein Befehl, als root auf 46.225.75.125:

```bash
cd /opt/abannews && git fetch origin claude/luxestyle-status-tztnn1 \
  && git show FETCH_HEAD:server/luxe-agent-setup.sh > /tmp/luxe-agent-setup.sh \
  && bash /tmp/luxe-agent-setup.sh
```

Das Skript legt sich seinen **eigenen Klon nach `/opt/luxe-agent/repo`** an, installiert
Playwright + Chromium und richtet den Timer `luxe-agent.timer` ein (alle 5 Minuten).
Es ist idempotent — zweimal ausführen schadet nicht.

> ⚠️ **Warum ein eigener Klon und nicht `/opt/abannews`?** Dort läuft der Deploy-Poller und
> macht **alle drei Minuten** `git reset --hard origin/main`. Ein Agent, der dort wohnte,
> wäre samt jedem Ergebnis weggeräumt worden, bevor ihn jemand sieht — und seine eigenen
> Commits hätten dem Deploy dazwischengefunkt. Die Remote-URL wird aus dem Deploy-Repo
> übernommen (sie trägt den GitHub-Token bereits, root-only), es braucht also keine zweiten
> Zugangsdaten.

Prüfen: `systemctl status luxe-agent.timer` · `journalctl -u luxe-agent.service -n 50 --no-pager`

**2. Den Browser einmal anmelden.** Ein frisch installiertes Chromium hat **keine**
Sitzungen. Google Merchant, Shopify-Admin, BigBuy, Pinterest, TikTok verlangen Login und
2FA — das kann kein Automat. Ohne diesen Schritt kann der Server nur Seiten ansehen, die
auch ohne Anmeldung offen sind (das reicht bereits für den Storefront-Blick von aussen).

```bash
# auf DEINEM Rechner:
ssh -L 9222:127.0.0.1:9222 root@46.225.75.125
# auf dem SERVER, in derselben Sitzung:
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers npx playwright open --browser chromium \
   --user-data-dir=/var/lib/luxe-agent/chrome-profil https://merchants.google.com
```

Das Profil unter `/var/lib/luxe-agent/chrome-profil` bleibt erhalten und wird von jedem
Auftrag wiederverwendet.

## Sicherheitsregeln (nicht verhandelbar)

- **CDP-Port 9222 nie offen im Internet.** Wer ihn erreicht, steuert den Browser mitsamt
  allen angemeldeten Sitzungen. Nur lokal auf dem Server ansprechbar (`127.0.0.1`).
- **Der Runner führt NIE Shell-Code aus der Warteschlange aus.** Nur eine feste Liste von
  Auftragsarten mit geprüften Parametern. Das Repo ist **öffentlich**; ein Runner, der
  `sh -c "$(cat auftrag.json)"` täte, wäre eine Fernsteuerung für jeden, der je Schreibrechte
  auf den Branch bekommt.
- **Zugangsdaten gehören nach `/tmp/hetzner.env` (Modus 600)** — niemals ins Repo.
  Das Root-Passwort aus der Hetzner-Mail gilt seit Juni als kompromittiert
  (`server/harden-ssh.sh`, Schlüssel-Login erzwingen).
- Die IP steht bereits öffentlich im Repo (`PROJEKT.md`). Das ist kein Geheimnis, aber
  ein Grund mehr für Schlüssel-Login, `fail2ban` und eine enge ufw-Regel.
