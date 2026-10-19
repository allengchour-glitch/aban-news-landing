# Verdorbenes SHOPIFY_CLIENT_SECRET der Umgebung: alle Startwege heilen + Wache für laufende Motoren (15.10.2026, nachgetragen 18.10.)

Marken: **GEMESSEN** = selbst nachgemessen, **BEHAUPTUNG** = ungeprüft.

## Befund (GEMESSEN 15.10. 04:30 UTC)
- Umgebungsvariable `SHOPIFY_CLIENT_SECRET` der Sitzung = **60 Zeichen** (gültig: 38, Einfügefehler). Shopify lehnt jeden
  Client-Credentials-Grant damit ab (HTTP 400); `/tmp/secrets_env.sh` trägt den gültigen Wert.
- `engine_keepalive.sh` prüfte das seit 14.10. — aber nur für das, was es selbst startet. Der SessionStart-Hook `autostart.sh` (läuft bei JEDEM
  Container-Neustart) startete `cj_perpetual`, `cj_queue_runner` und `autocommit` weiter mit dem abgelehnten Wert:
  `cj_category_fill` scheiterte **6'832×** an «shTok: kein Token» (`/tmp/cj_perp.log`).
- Folgen ausserhalb des Grinds: `kollektion_leer`, `textbild_fix`, `google_kanal_saeubern`, `bild_quadrat` meldeten «Shopify antwortet nicht».

## Fix
- `automation/lib/shopify_secret.sh` — EINE Funktion `shopify_secret_heilen [melden]`: weicht der Umgebungswert vom Dateiwert ab, prüft sie
  einmal je Umgebungswert beide per Grant (nur Statuscode, Werte nie ausgegeben, nie in argv; Urteil in `/tmp/_shop_secret_pruef` als
  `<md5_12> DATEI|OK <ts>`) und exportiert bei «Shopify lehnt ab, Datei gültig» den Dateiwert. Setzt `SEC_KORRIGIERT`, `SEC_GEHEILT`.
- Jeder Startweg ruft sie: `autostart.sh` (Hook), `engine_keepalive.sh`. `SEC_KORRIGIERT=1` ersetzt den Aufseher einmal.
- `automation/secret_umgebung_wache.py` (`--selbsttest` 16/16, Standard = Bericht, `--heilen`): liest `/proc/<pid>/environ` der Motoren
  (cj_perpetual, cj_queue_runner), vergleicht per md5-Präfix gegen die abgelehnten Werte, beendet betroffene Motoren (die Startwege starten
  sie mit dem gültigen Wert neu). Ledger `dropship/_secret_umgebung.tsv`; Marke `/tmp/_secret_neustart_autostart`.
- Live belegt 15.10. 04:31 UTC: `cj_perpetual` beendet und neu gestartet, STAND 3 CJ-Runner; seitdem meldet jeder Sitzungsstart
  «[autostart] Shopify-Secret der Umgebung abgelehnt → gültiger Dateiwert für alle Starts».

## Stand 18.10. (GEMESSEN 20:10 UTC)
Keepalive-Zeile: «SECRET-UMGEBUNG: Sitzung trägt den abgelehnten Wert (1 Prozesse)» — nur die Sitzung selbst (ihre Umgebung lässt sich
nicht von innen ändern); alle Motoren tragen den gültigen Wert. 61'466 CJ-Einträge, 3 CJ-Runner.

## Regel
Eine Prüfung, die nur an EINEM Startweg hängt, schützt nur diesen. Wer ein Geheimnis prüft, tut es in einer gemeinsamen Funktion, die JEDER
Startweg ruft — und eine Wache liest, was laufende Prozesse wirklich tragen (`/proc/<pid>/environ`), nie, was die Shell glaubt.

## Ursache belegt 19.10.2026 (GEMESSEN, Wert nie ausgegeben)
- Der 60-Zeichen-Wert ist **der gültige Schlüssel (`shpss_` + 32 Hex = 38) + `=` + `SHOPIFY_CLIENT_SECRET`** (38 + 1 + 21 = 60): beim Eintragen in die
  Claude-Umgebungseinstellungen wurde der Variablenname HINTER den Wert gepastet. Belege: `/proc/<claude-pid>/environ` (Länge 60, `=` an Position 38,
  Rest = 21 Grossbuchstaben/Unterstriche), die ersten 38 Zeichen sind gleich dem Dateiwert, Shopify-Grant mit dem ganzen Wert 400, mit den ersten 38 Zeichen **200**.
- Fix im Code (`automation/lib/shopify_secret.sh`, Selbsttest `automation/lib/shopify_secret_test.sh` 7/7): `shopify_secret_heilen` schneidet genau dieses Muster
  (`^shpss_[0-9a-f]{32}=SHOPIFY_CLIENT_SECRET$`) ab — reine Zeichenkettenregel, ohne Netz und ohne `/tmp/secrets_env.sh`, andere Werte mit `=` bleiben unberührt.
  Gemessen an der echten Sitzung: vorher 60, nachher 38, Grant 200. Die Meldung nennt den Anhang, nie den Wert.
- Falle beim Nachmessen: `env | awk -F= '{print length($2)}'` zeigte «38», weil awk am `=` im Wert trennt — **Länge immer mit `${#VAR}` oder `len()` messen, nie mit `-F=`**.
- Der Shell-Schnappschuss von Claude Code (`/root/.claude/shell-snapshots/snapshot-bash-*.sh`) und der `claude`-Prozess tragen den alten Wert weiter; neue Prozesse erben ihn
  erst nach dem Korrigieren der Umgebungsvariable und einem Container-Neustart.

## OFFEN (Betreiber)
In den Claude-Umgebungseinstellungen bei `SHOPIFY_CLIENT_SECRET` hinter dem Schlüssel den Anhang **`=SHOPIFY_CLIENT_SECRET`** löschen (der Wert soll nur `shpss_…` mit 38 Zeichen sein).
Bis dahin heilt der Code bei jedem Start selbst.
