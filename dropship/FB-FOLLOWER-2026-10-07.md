# Facebook: zu wenig Follower — 07.10.2026

Betreiber 07.10.: «mache verbesserung, fb zu wenig follower».

## GEMESSEN
- Seite «LuxeStyle CH» (1049840534888592): **7 Follower**.
- 60 Posts in 10 Tagen, **0 Reaktionen / Kommentare / Shares**. Bild-Posts erreichen fast niemanden.
- Reels seit 06.10.: **206–232 Aufrufe je Reel** (vorher 0–3), zusammen 659 Aufrufe, **0 neue Follower**.
- Seit dem Ende des Meta-Datenzugangs (05.10.) plante `metricool_tiktok_post.mjs` IG + FB als EINEN Metricool-Post mit EINEM
  Text. Facebook bekam damit «🔗 luxestyle.ch/… (Link in Bio)» — auf FB gibt es keine Bio, der Link im Text wäre klickbar —
  und **keine einzige Folge-Aufforderung**.
- **Zweiter Befund, schwerer:** Seit **12:21 UTC kam kein einziges Reel mehr durch** (IG, FB, TikTok; 18 Fehlversuche bis
  17:39). Gemini lehnte die Jury-Anfrage zu `cjreel-1365530192042397696` (Kosmetikpinsel-Tasche) ab:
  `promptFeedback.blockReason = "OTHER"`, kein `candidates` → `KeyError` → Exit 2 «kein Urteil» → der Kandidat blieb vorne in
  der Warteschlange. Mit denselben Bildern immer gleich. Andere Reels bekamen problemlos eine Antwort.

## GETAN
1. `automation/lib/fb_text.mjs`: gemeinsame FB-Textregel. `fbText()` entfernt «(Link in Bio)» und macht den Link klickbar,
   mit UTM. `mitFolgen()` fügt vor die Hashtags die Zeile «➕ Folge LuxeStyle CH – jeden Tag ein neues Fundstück aus der Schweiz 🇨🇭»
   ein, ohne Doppel. Selbsttest 5/5.
2. `metricool_tiktok_post.mjs`: Mit NETZ=instagram plant der Poster jetzt ZWEI Posts. IG behält die IG-Caption. Das FB-Reel
   bekommt den FB-Text: klickbarer Produktlink und Folge-Zeile. Scheitert FB, bleibt IG gültig (nur Warnung).
   DRY-Lauf: beide Bodies geprüft.
3. Auch Bildpost (`social-autopost-meta.mjs`) und Karussell (`ig_karussell_post.mjs`) tragen auf FB die Folge-Zeile
   (DRY-Lauf Bildpost geprüft).
4. `gemini_jury.py`: `promptFeedback.blockReason` ist jetzt die eigene Klasse `GeminiSperre`. Die Anfrage wird nicht
   wiederholt, der Zweitprüfer (`zweitmodell`) urteilt. Fällt auch er aus, gilt das Reel als durchgefallen (Exit 4,
   `jury-skip`) und die Warteschlange läuft weiter. Ohne Urteil wird weiterhin nichts gepostet.
   Nachgemessen am Sperrfall: Zweitprüfer Note 4.83, K.o. «falsches_produkt». Der Kontaktbogen zeigt, warum: die Tasche ist
   beim Kofferpacken klein im Bild, und der Hook «Das trägt jetzt jeder» passt nicht zu einer Tasche.

## REGEL
- **Jeder Text, der nach Facebook geht, nimmt `lib/fb_text.mjs`**: kein «Link in Bio», klickbarer Link, Folge-Zeile.
- **Eine Absage des Modells ist ein Urteil über die Anfrage, kein Netzfehler.** Ein Wächter, der «kein Urteil» meldet,
  darf den Kandidaten nicht vorne liegen lassen, sonst blockiert ein einziger Fall die ganze Warteschlange.

## OFFEN (nur Betreiber)
- **Seiten-Benutzernamen setzen** (facebook.com/luxestyle.ch statt Zahlen-ID): Meta Business Suite → Seite →
  Einstellungen → Benutzername.
- **Freunde einladen**: Seite → «…» → «Freunde einladen». Das ist der schnellste Weg von 7 auf ~50 Follower.
- Nachmessen am 14.10.: Follower (Ausgang 7), Klicks mit `utm_source=facebook` in Shopify.
