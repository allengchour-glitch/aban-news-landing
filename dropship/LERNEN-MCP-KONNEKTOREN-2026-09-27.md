# Vier empfohlene Konnektoren, am eigenen Bestand nachgemessen (2026-09-27)

**Quelle:** TikTok `@aiagentgeorg/video/7690216229704912160`, 49 s, 7770 Aufrufe, 197 Likes,
80 Kommentare (GEMESSEN am 27.09. aus den Seitendaten). Titel sinngemäss: „Hör auf, Claude zu
benutzen, bevor du diese 4 Konnektoren installiert hast."

Der Inhalt kam über die **deutsche ASR-Untertitelspur** (`subtitleInfos`, WebVTT, 1800 Bytes) —
genau der Weg aus dem Skill `recherchieren`. Die Caption nennt die vier diesmal auch selbst, das
ist nicht immer so.

## Was das Video sagt (QUELLE)

| # | Konnektor | Versprechen |
|---|---|---|
| 1 | **Perplexity** | tiefe Recherche mit Echtzeit-Infos „statt nur zu raten" |
| 2 | **Firecrawl** | liest und wertet jede Webseite aus, zieht Branding und Konkurrenzdaten |
| 3 | **Playwright** | bedient einen **echten Browser**, füllt Formulare aus, testet Webseiten |
| 4 | **Composio** | verbindet mit hunderten Apps auf einen Schlag |

Der Aufruf am Ende („kommentiere MCP und ich schicke dir einen Prompt") ist **Reichweiten-Mechanik**,
kein Inhalt. Das Konto beschreibt sich mit „Ich erleichtere dein Leben und dein Geschäft mit KI" —
also ein Kanal, der an Aufmerksamkeit verdient. Das macht die Empfehlungen nicht falsch, aber sie
sind nicht neutral.

## Gegenprobe am eigenen Bestand (GEMESSEN)

**Konnektoren in diesem Konto: vier.** Google Drive (verbunden), Shopify (verbunden),
Google Calendar (nicht verbunden), **TikTok Ads (`connect_incomplete`)**.
Im Verzeichnis gesucht: von den vier genannten existiert **nur Firecrawl**
(`installState: not_installed`). Perplexity, Playwright und Composio tauchen gar nicht auf.

### 🔓 Und dabei ist ein Gedächtnis-Satz gefallen, der seit dem 12.06. in Grossbuchstaben steht

`CLAUDE.md` sagt: **„Cloud-Sessions haben KEINEN Browser"** — Browser-Aufgaben gehören an den PC
des Users. **Das stimmt nicht.** Gemessen:

- `Chromium 141.0.7390.37` liegt ausführbar unter
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
- `playwright` liegt **global** in `/opt/node22/lib/node_modules` (darum scheitert ein blosses
  `import "playwright"` aus dem Projekt — das erklärt die Notiz vom 11.09., Playwright sei
  „nicht vorinstalliert")
- eine echte Produktseite lädt mit **HTTP 200**, rendert, und der Screenshot zeigt die Seite

**Die Hürde, an der es ohne Wissen scheitert:** der Agent-Proxy bricht TLS auf, und Chromium 141
bringt seinen **eigenen** Wurzelspeicher mit. System-Trust und die NSS-Datenbank unter
`~/.pki/nssdb` helfen ihm nicht → `ERR_CERT_AUTHORITY_INVALID`.

**Der Weg, der bewusst NICHT gewählt wurde:** `ignoreHTTPSErrors` bzw.
`--ignore-certificate-errors` schaltet die Prüfung **ganz** ab — dann gilt jede Seite als echt,
auch eine untergeschobene. Stattdessen wird über `--ignore-certificate-errors-spki-list` **genau
den dokumentierten Anthropic-Proxy-CAs** vertraut, mit ihrem SPKI-Fingerabdruck aus
`/root/.ccr/ca-bundle.crt`. Alles andere wird weiter geprüft.

**Damit ist Punkt 3 des Videos hier bereits erfüllt — ohne Konnektor, ohne Abo, ohne PC.**

## Gebaut: `tools/browser.mjs` (12 Selbsttests)

```
/opt/node22/bin/node tools/browser.mjs --selbsttest
/opt/node22/bin/node tools/browser.mjs <url> [breite] [hoehe]
```

`ansehen(url, { erwartet, verboten, bild })` liefert Status, Titel, **gerenderten** Text und einen
Screenshot — und nimmt die Gegenprobe gleich mit: `erwartet` muss im Text stehen, `verboten` darf
nicht. Die Selbsttests prüfen unter anderem, dass die Prüfung **nicht pauschal abgeschaltet** wird
und dass ein Unsinn-Wert nicht als Fingerabdruck durchgeht.

**Echter Lauf statt nur grüner Selbsttests** (die Lehre vom 23.09.): Produktseite
`agility-trainingsset-fur-hunde-verstellbar-465922` → HTTP 200, der heute gesetzte Preis
**129.90 im gerenderten Text gefunden**, der alte Preis 98.90 und der Unsinn-Wert 777.77
korrekt **nicht** gefunden.

## Was der Browser sofort gezeigt hat, was `curl` nie zeigt

Der erste Screenshot (Hundebett, 390 px Breite) brachte zwei Befunde, die im Quelltext nicht
stehen:

1. **Die Produktbilder tragen englischen Werbetext** — „LOW MAINTENANCE", „Easy to clean pet
   hair", „Wear-resistant material" — in einem Shop, der auf Deutsch verkauft. Das sind
   Lieferantenbilder, die niemand angesehen hat.
2. **Ein Cookie-Banner liegt mobil über Titel und Preisbereich.** Ob das die erste Sicht auf den
   Preis verdeckt, ist eine eigene Messung wert.

Beides ist **noch nicht über den Katalog gemessen** — es sind zwei Beobachtungen an einer Seite,
keine Klassenaussage. Genau der Fehler, den der 23.09. („eine Seite ist keine Stichprobe")
teuer gelernt hat.

## Die übrigen drei, ehrlich eingeordnet

- **Perplexity (1):** diese Session hat `WebSearch`/`WebFetch`. Ob Perplexity messbar besser
  recherchiert, ist hier **nicht geprüft** — BEHAUPTUNG.
- **Firecrawl (2):** existiert im Verzeichnis, nicht installiert. ⚠️ **Es löst die
  Instagram-Sackgasse vom 20.09. vermutlich nicht**: Instagram liefert an nicht angemeldete
  Abrufer grundsätzlich eine leere Hülle, das ist keine Frage des Auslesewerkzeugs. Ungeprüft.
- **Composio (4):** nicht im Verzeichnis dieses Kontos. Der Nutzen hängt daran, welche Apps der
  Shop überhaupt braucht — der Engpass hier ist gemessen **nicht** die App-Anbindung, sondern
  drei fehlende Shopify-Zugangsdaten.

## 🟡 Der Nebenbefund, der konkret Geld betrifft

**Der Konnektor „TikTok Ads" steht auf `connect_incomplete`** — angefangen, nicht fertig
verbunden. Das Gedächtnis führt „TikTok-Pixel + Conversion-Kampagne" seit dem 13.06. als einen
der drei User-Klicks. Ob das dieselbe Baustelle ist, ist **nicht geprüft**; nachsehen lohnt.
