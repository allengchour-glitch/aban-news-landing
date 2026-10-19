# Selbsttest für automation/lib/shopify_secret.sh (nur erfundene Werte, kein Netz): bash automation/lib/shopify_secret_test.sh
# Läuft gegen den Code NEBEN dieser Datei (BASH_SOURCE), nicht gegen einen festen Pfad — eine Kopie des Ordners prüft sich selbst
# (19.10.2026, zweite Prüfung: mit dem festen Pfad prüfte eine Kopie Code und Fälle aus zwei Orten, Mutationsproben blieben grün).
set -u
LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "$LIB/shopify_secret.sh"
# Wegwerf-Verzeichnis (TMPDIR oder /tmp). SHOPIFY_SECRETS_DATEI zeigt SOFORT dorthin: ohne das lief jeder Test mit erfundenem Secret gegen die
# LIVE-Datei /tmp/secrets_env.sh (Vergleich, Netz-Grant, jetzt auch Zeilenkorrektur) — ein Test darf die echte Datei nie anfassen.
T=$(mktemp -d "${TMPDIR:-/tmp}/shopify_secret_test.XXXXXX") || { echo "FAIL: kein Wegwerf-Verzeichnis"; exit 1; }
trap 'case "$T" in */shopify_secret_test.??????) rm -rf -- "$T" ;; esac' EXIT
SHOPIFY_SECRETS_DATEI="$T/secrets_env.sh"
HEX=0123456789abcdef0123456789abcdef
ok=0; fail=0
t(){ if [ "$2" = "$3" ]; then ok=$((ok+1)); else fail=$((fail+1)); echo "FAIL $1: erwartet «$3» bekommen «$2»"; fi; }
# 1 Schlüssel + Name -> abgeschnitten
SHOPIFY_CLIENT_SECRET="shpss_${HEX}=SHOPIFY_CLIENT_SECRET"; SHOPIFY_CLIENT_ID=x; shopify_secret_heilen >/dev/null; t "anhang" "$SHOPIFY_CLIENT_SECRET|$SEC_BEREINIGT" "shpss_${HEX}|1"
# 2 gueltiger Wert bleibt
SHOPIFY_CLIENT_SECRET="shpss_${HEX}"; shopify_secret_heilen >/dev/null; t "gueltig" "$SHOPIFY_CLIENT_SECRET|$SEC_BEREINIGT" "shpss_${HEX}|0"
# 3 anderes Muster mit = bleibt unangetastet (kein Raten)
SHOPIFY_CLIENT_SECRET="shpss_${HEX}=etwas"; shopify_secret_heilen >/dev/null; t "fremd" "$SHOPIFY_CLIENT_SECRET|$SEC_BEREINIGT" "shpss_${HEX}=etwas|0"
# 4 zu kurzer Hex-Teil bleibt
SHOPIFY_CLIENT_SECRET="shpss_abc=SHOPIFY_CLIENT_SECRET"; shopify_secret_heilen >/dev/null; t "kurz" "$SEC_BEREINIGT" "0"
# 5 leer / ungesetzt unter set -u
unset SHOPIFY_CLIENT_SECRET; shopify_secret_heilen >/dev/null; t "ungesetzt" "$SEC_BEREINIGT" "0"
# 6 melden gibt Hinweis ohne den Wert zu nennen
SHOPIFY_CLIENT_SECRET="shpss_${HEX}=SHOPIFY_CLIENT_SECRET"; m=$(shopify_secret_heilen melden); case "$m" in *"$HEX"*) t "leck" "ja" "nein";; *) t "leck" "nein" "nein";; esac; case "$m" in *"Anhang"*) t "hinweis" ok ok;; *) t "hinweis" fehlt ok;; esac

# ── Shop-Host (19.10.2026): shopify_shop_pruefen gegen die gemeinsame Fallliste shopify_host_faelle.tsv (gleiche Fälle prüfen
#    shopify_host.mjs und shopify_host.py) + Einzelfälle. Kein Netz, keine Dateien ausser der Fallliste. ──
ECHT=au3j0y-hq.myshopify.com
t "H0 Konstante" "$SHOPIFY_SHOP_ECHT" "$ECHT"
# Das Python-Grant in shopify_secret_heilen trägt den Host noch einmal wörtlich — Drift fällt hier auf
t "H0c Test zeigt auf die Wegwerf-Datei, nicht auf /tmp/secrets_env.sh" "${SHOPIFY_SECRETS_DATEI#"$T"/}|$([ -e "$SHOPIFY_SECRETS_DATEI" ] && echo da || echo fehlt)" "secrets_env.sh|fehlt"
t "H0b Grant-Host = Konstante" "$(grep -c "https://$ECHT/admin/oauth/access_token" "$LIB/shopify_secret.sh")" "1"
zeilen=0; arten=""
while IFS=$'\t' read -r feld art host; do
  case "$feld" in ''|'#'*) continue ;; esac
  feld=${feld#«}; feld=${feld%»}
  printf -v roh '%b' "$feld"
  zeilen=$((zeilen+1)); arten+=" $art"
  export SHOPIFY_SHOP="$roh"
  shopify_shop_pruefen
  case "$art" in
    leer)      soll="$roh|0|0" ;;
    ok)        soll="$host|0|0" ;;
    bereinigt) soll="$host|1|0" ;;
    *)         soll="$ECHT|0|1" ;;
  esac
  t "H1 Fall $zeilen ($art, Länge ${#roh})" "$SHOPIFY_SHOP|$SHOP_BEREINIGT|$SHOP_ERSETZT" "$soll"
  # Das Urteil selbst, alle fünf Arten (ohne das blieben «falsch» und «fremd» ununterscheidbar — beide enden in «ersetzt»)
  t "H1u Fall $zeilen Urteil" "$SHOP_URTEIL|$([ -n "$SHOP_KANON" ] && echo kanon || echo -)" "$art|$(case "$art" in ok|bereinigt) echo kanon ;; *) echo - ;; esac)"
  # melden: Hinweis nur bei Änderung, nie der Wert (nur für Werte mit genug Zeichen, sonst trifft jedes Zeichen irgendwo)
  export SHOPIFY_SHOP="$roh"
  m=$(shopify_shop_pruefen melden)
  mm=${m//.myshopify.com/}; mm=${mm//SHOPIFY_SHOP/}   # feste Wörter der Meldung selbst (".myshopify.com", Variablenname) zählen nicht als Leck
  if [ "${#roh}" -ge 8 ]; then case "$mm" in *"$roh"*) t "H2 Fall $zeilen Leck" ja nein ;; esac; fi
  case "$art" in
    leer|ok)   t "H2 Fall $zeilen still" "$m" "" ;;
    bereinigt) case "$m" in "ℹ️ SHOPIFY-HOST"*) ;; *) t "H2 Fall $zeilen Hinweis" "$m" "ℹ️ SHOPIFY-HOST …" ;; esac ;;
    falsch)    case "$m" in "⚠️ SHOPIFY-HOST"*"kein Shopify-Shop-Host"*) ;; *) t "H2 Fall $zeilen Warnung (falsch)" "$m" "⚠️ SHOPIFY-HOST … kein Shopify-Shop-Host …" ;; esac ;;
    *)         case "$m" in "⚠️ SHOPIFY-HOST"*"ein anderer Shop-Host"*) ;; *) t "H2 Fall $zeilen Warnung (fremd)" "$m" "⚠️ SHOPIFY-HOST … ein anderer Shop-Host …" ;; esac ;;
  esac
done < "$LIB/shopify_host_faelle.tsv"
# Kanarienvogel gegen eine leere/zu kurze Tabelle: alle fünf Urteile müssen vorkommen
t "H3 Fallliste vollständig" "$([ "$zeilen" -ge 40 ] && for a in leer ok bereinigt falsch fremd; do case "$arten" in *" $a"*) ;; *) echo fehlt-$a ;; esac; done)" ""
# ASCII-genau: NBSP und das Kelvin-Zeichen (U+212A, kleingeschrieben «k») sind weder Leerraum noch Buchstabe
export SHOPIFY_SHOP=$'\xc2\xa0'"$ECHT"; shopify_shop_pruefen; t "H4 NBSP → ersetzt" "$SHOP_ERSETZT|$SHOPIFY_SHOP" "1|$ECHT"
export SHOPIFY_SHOP=$'\xe2\x84\xaa'"elvin.myshopify.com"; shopify_shop_pruefen; t "H4 Kelvin → ersetzt" "$SHOP_ERSETZT|$SHOPIFY_SHOP" "1|$ECHT"
# Zeilenende mitten im Wert → ersetzt (der Regex-Anker darf nicht vor einem Zeilenende passen)
export SHOPIFY_SHOP="$ECHT"$'\n'"evil.example"; shopify_shop_pruefen; t "H4 Zeilenende mitten im Wert" "$SHOP_ERSETZT|$SHOPIFY_SHOP" "1|$ECHT"
# Wert mit Leerraum und Schlüssel-Form: Hinweis nennt Merkmale, nie Zeichen
SCHL="shp""ss_${HEX}"
export SHOPIFY_SHOP="$SCHL"; m=$(shopify_shop_pruefen melden)
case "$m" in *"$HEX"*|*"shpss"*) t "H5 Schlüssel nicht ausgegeben" ja nein ;; *) t "H5 Schlüssel nicht ausgegeben" nein nein ;; esac
case "$m" in *"schlüsselartig"*) t "H5 Schlüssel-Form erkannt" ok ok ;; *) t "H5 Schlüssel-Form erkannt" fehlt ok ;; esac
export SHOPIFY_SHOP="geheim-marker-4711.example"; m=$(shopify_shop_pruefen melden)
case "$m" in *marker*|*4711*|*geheim*) t "H5 Fantasie-Host nicht ausgegeben" ja nein ;; *) t "H5 Fantasie-Host nicht ausgegeben" nein nein ;; esac
case "$m" in *"Länge 26"*) t "H5 Länge genannt" ok ok ;; *) t "H5 Länge genannt" "$m" "… Länge 26 …" ;; esac
# nicht gesetzt unter set -u: kein Abbruch, nichts exportiert
unset SHOPIFY_SHOP; shopify_shop_pruefen melden >/dev/null; t "H6 ungesetzt" "${SHOPIFY_SHOP-NICHT_DA}|$SHOP_BEREINIGT|$SHOP_ERSETZT" "NICHT_DA|0|0"
# EIN Aufruf pro Startweg: shopify_secret_heilen prüft den Host mit (ohne Secret kehrt der Rest sofort zurück → kein Netz, keine Datei)
export SHOPIFY_SHOP="evil.example.com"; unset SHOPIFY_CLIENT_SECRET; unset SHOPIFY_CLIENT_ID
m=$(shopify_secret_heilen melden); shopify_secret_heilen
t "H7 shopify_secret_heilen heilt den Host" "$SHOPIFY_SHOP|$SHOP_ERSETZT|$SEC_BEREINIGT|$SEC_GEHEILT" "$ECHT|1|0|0"
case "$m" in "⚠️ SHOPIFY-HOST"*) t "H7 Meldung über heilen" ok ok ;; *) t "H7 Meldung über heilen" "$m" "⚠️ SHOPIFY-HOST …" ;; esac
export SHOPIFY_SHOP="$ECHT"; m=$(shopify_secret_heilen melden); t "H7 gültiger Host bleibt, still" "$SHOPIFY_SHOP|$m" "$ECHT|"
# Die Unterfunktion ist kein Seiteneffekt-Leck: LC_ALL der Sitzung bleibt unberührt
LC_ALL=C.UTF-8; export SHOPIFY_SHOP="  $ECHT"; shopify_shop_pruefen; t "H8 LC_ALL unverändert" "$LC_ALL" "C.UTF-8"; unset LC_ALL

# ── H9: Locale-Kanarienvogel — die Funktion rechnet ASCII-genau (local LC_ALL=C). Ohne sie hält eine UTF-8-Sitzung U+2003 (Em-Space) für Leerraum
#    und «bereinigt» ihn weg; mjs und py tun das nicht. Der Test prüft nur etwas, wenn die Locale den Em-Space wirklich als Leerraum kennt.
LC_ALL=C.UTF-8
if [[ $'\xe2\x80\x83' =~ ^[[:space:]]$ ]]; then
  export SHOPIFY_SHOP=$'\xe2\x80\x83'"$ECHT"; shopify_shop_pruefen; t "H9 Em-Space in UTF-8-Sitzung → ersetzt, nicht bereinigt" "$SHOP_ERSETZT|$SHOP_BEREINIGT|$SHOP_URTEIL" "1|0|falsch"
  export SHOPIFY_SHOP=$'\xe2\x80\x83'"$ECHT"; m=$(shopify_shop_pruefen melden); case "$m" in *"Länge 26"*) t "H9 Länge in Bytes (Em-Space = 3)" ok ok ;; *) t "H9 Länge in Bytes (Em-Space = 3)" "$m" "… Länge 26 …" ;; esac
else
  echo "HINWEIS H9 übersprungen: keine UTF-8-Locale, die U+2003 als Leerraum kennt (C.UTF-8 fehlt?) — Locale-Kanarienvogel unbelegt"
fi
unset LC_ALL

# ── H10: Regel 0 — Länge (Grenze 253 exakt, gleiche Zahlen wie shopify_host.py / .mjs) und Laufzeit bei riesigem Leerraum ──
poster() { printf '%*s' "$1" ''; }
export SHOPIFY_SHOP="$(poster $((253 - ${#ECHT})))$ECHT"; shopify_shop_pruefen; t "H10 Grenze: 253 Zeichen (Polster + Host) → bereinigt" "$SHOP_URTEIL|$SHOP_BEREINIGT" "bereinigt|1"
export SHOPIFY_SHOP="$(poster $((254 - ${#ECHT})))$ECHT"; shopify_shop_pruefen; t "H10 Grenze: 254 Zeichen → falsch, ersetzt" "$SHOP_URTEIL|$SHOP_ERSETZT|$SHOPIFY_SHOP" "falsch|1|$ECHT"
# Der Lauf in eigenem Prozess mit Zeitgrenze: die alte Fassung brauchte bei 130'000 Leerzeichen 45,5 s (gemessen 19.10., Befund «quadratisch»)
v0=$(date +%s)
aus=$(timeout 30 bash -c '. "$1"; SHOPIFY_SHOP="x$(printf "%*s" 130000 "")y"; shopify_shop_pruefen melden; echo "[$SHOP_URTEIL|$SHOP_ERSETZT]"' _ "$LIB/shopify_secret.sh" 2>&1); rc=$?
dauer=$(( $(date +%s) - v0 ))
t "H10 riesiger Wert (130002 Zeichen): fertig, falsch, ersetzt" "$rc|${aus##*$'\n'}" "0|[falsch|1]"
case "$aus" in *"Länge 130002, länger als 253"*) t "H10 Meldung nennt nur Länge" ok ok ;; *) t "H10 Meldung nennt nur Länge" "$aus" "… Länge 130002, länger als 253 …" ;; esac
t "H10 Laufzeit unter 5 s (war 45,5 s)" "$([ "$dauer" -lt 5 ] && echo ok || echo "${dauer}s")" "ok"
aus=$(timeout 30 bash -c '. "$1"; SHOPIFY_SHOP="$(printf "%*s" 130000 "")x"; shopify_shop_pruefen; echo "[$SHOP_URTEIL]"' _ "$LIB/shopify_secret.sh" 2>&1); t "H10 Leerraum + x (der Fall des Prüfers)" "$?|$aus" "0|[falsch]"

# ── H11: Datei /tmp/secrets_env.sh — Reihenfolge-Lücke (zwei Prüfer): engine_keepalive.sh schreibt die Datei (env_datei) VOR der Heilung ──
# Die ECHTE env_datei aus engine_keepalive.sh, wenn sie dort noch steht; sonst eine gleichwertige Kopie (HINWEIS). Erfundene Werte.
REPO_KA="$(cd "$LIB/../.." && pwd)/automation/engine_keepalive.sh"
fn=$([ -f "$REPO_KA" ] && sed -n '/^env_datei() {/,/^}/p' "$REPO_KA")
if [ -n "$fn" ]; then eval "$fn"; else
  echo "HINWEIS H11: env_datei steht nicht (mehr) in engine_keepalive.sh — der Test benutzt eine Kopie; bitte prüfen, ob der Keepalive die Datei noch so schreibt"
  env_datei() { local f="$1"; shift; [ -s "$f" ] && return 0; local v inhalt=""; for v in "$@"; do [ -n "${!v:-}" ] && inhalt+="$(printf 'export %s=%q' "$v" "${!v}")"$'\n'; done; [ -n "$inhalt" ] || return 0; ( umask 077; printf '%s' "$inhalt" > "$f" ); }
fi
laufer() { env -i PATH="$PATH" bash --noprofile --norc -c '. "$1"; printf "%s|%s|%s" "${SHOPIFY_SHOP-}" "${#SHOPIFY_CLIENT_SECRET}" "${SHOPIFY_CLIENT_ID-}"' _ "$1"; }   # was ein Runner nach `source` sieht
datei_neu() {  # datei_neu SHOP SECRET → schreibt die Datei wie der Keepalive (aus der Umgebung), Datei vorher leeren
  : > "$SHOPIFY_SECRETS_DATEI"
  ( export SHOPIFY_SHOP="$1" SHOPIFY_CLIENT_ID=id-4711 SHOPIFY_CLIENT_SECRET="$2"; env_datei "$SHOPIFY_SECRETS_DATEI" SHOPIFY_CLIENT_ID SHOPIFY_CLIENT_SECRET SHOPIFY_SHOP >/dev/null )
}
heilen_m() { shopify_secrets_datei_heilen melden > "$T/m.txt"; m=$(<"$T/m.txt"); }   # EIN Lauf in dieser Shell (kein Teilprozess: Flags und Datei gelten danach)
GUT="shpss_$HEX"
unset SHOPIFY_CLIENT_ID SHOPIFY_CLIENT_SECRET; export SHOPIFY_SHOP="$ECHT"
for fall in "evil.example.com" "other-store.myshopify.com" "  AU3J0Y-HQ.myshopify.com " "$ECHT"$'\n' $'\t'"$ECHT"$'\r\n' "$ECHT=SHOPIFY_SHOP"; do
  datei_neu "$fall" "$GUT"
  vorher=$(laufer "$SHOPIFY_SECRETS_DATEI")
  heilen_m
  nachher=$(laufer "$SHOPIFY_SECRETS_DATEI")
  t "H11 Kanarienvogel Fall (Länge ${#fall}): vor der Heilung sieht der Runner den verdorbenen Wert" "$([ "${vorher%%|*}" != "$ECHT" ] && echo verdorben || echo schon-sauber)" "verdorben"
  t "H11 Fall (Länge ${#fall}): danach sieht der Runner den echten Host, Rest unverändert" "$nachher|$SHOP_DATEI_GEHEILT|$SHOP_DATEI_UNGEHEILT" "$ECHT|${#GUT}|id-4711|1|0"
  case "$m" in "ℹ️ SHOPIFY-HOST"*) ;; *) t "H11 Fall (Länge ${#fall}) Meldung" "$m" "ℹ️ SHOPIFY-HOST …" ;; esac
  case "$m" in *"$HEX"*|*evil*|*other-store*) t "H11 Fall (Länge ${#fall}) kein Wert in der Meldung" ja nein ;; esac
done
t "H11 Modus 600, keine Reste" "$(stat -c %a "$SHOPIFY_SECRETS_DATEI")|$(ls "$T" | grep -c '^secrets_env\.sh\.')" "600|0"
# Secret in der Datei: exakt das Muster «Schlüssel + =SHOPIFY_CLIENT_SECRET» → abgeschnitten, ID und Host bleiben
datei_neu "$ECHT" "${GUT}=SHOPIFY_CLIENT_SECRET"
heilen_m
t "H11 Secret in der Datei: Anhang weg (38 Zeichen), Host und ID unverändert" "$(laufer "$SHOPIFY_SECRETS_DATEI")|$SEC_DATEI_BEREINIGT|$SHOP_DATEI_GEHEILT" "$ECHT|38|id-4711|1|0"
case "$m" in *"$HEX"*) t "H11 Secret-Meldung ohne Wert" ja nein ;; *"SHOPIFY-SECRET"*) ;; *) t "H11 Secret-Meldung" "$m" "… SHOPIFY-SECRET …" ;; esac
# Anderes Muster (=etwas) bleibt unangetastet — kein Raten
datei_neu "$ECHT" "${GUT}=etwas"; cp "$SHOPIFY_SECRETS_DATEI" "$T/vorher.sh"; heilen_m
t "H11 fremdes Muster: Datei byte-gleich, nichts gemeldet" "$(cmp -s "$T/vorher.sh" "$SHOPIFY_SECRETS_DATEI" && echo gleich)|$SEC_DATEI_BEREINIGT|$SHOP_DATEI_GEHEILT|$SHOP_DATEI_UNGEHEILT" "gleich|0|0|0"
# Gesunde Datei: byte-gleich (kein unnötiges Umschreiben, Zeitstempel/Inode bleiben)
datei_neu "$ECHT" "$GUT"; cp "$SHOPIFY_SECRETS_DATEI" "$T/vorher.sh"; ino=$(stat -c %i "$SHOPIFY_SECRETS_DATEI"); heilen_m
t "H11 gesunde Datei: byte-gleich, gleicher Inode, still" "$(cmp -s "$T/vorher.sh" "$SHOPIFY_SECRETS_DATEI" && echo gleich)|$([ "$(stat -c %i "$SHOPIFY_SECRETS_DATEI")" = "$ino" ] && echo inode)|$m|$SHOP_DATEI_GEHEILT" "gleich|inode||0"
# Nicht prüfbar korrigierbar (Wert über zwei Zeilen): Datei bleibt, ⚠️ ohne Wert, UNGEHEILT=1
printf 'export SHOPIFY_CLIENT_ID=id-4711\nexport SHOPIFY_SHOP=%s\n' "'evil.example.com" > "$SHOPIFY_SECRETS_DATEI"; printf '%s\n' "nochmal'" >> "$SHOPIFY_SECRETS_DATEI"
cp "$SHOPIFY_SECRETS_DATEI" "$T/vorher.sh"; heilen_m
t "H11 nicht prüfbar: Datei byte-gleich, UNGEHEILT=1" "$(cmp -s "$T/vorher.sh" "$SHOPIFY_SECRETS_DATEI" && echo gleich)|$SHOP_DATEI_GEHEILT|$SHOP_DATEI_UNGEHEILT" "gleich|0|1"
case "$m" in "⚠️ SHOPIFY-HOST"*) ;; *) t "H11 nicht prüfbar: Warnung" "$m" "⚠️ SHOPIFY-HOST …" ;; esac
# Zwei Zuweisungen auf EINER Zeile: Zeilenersatz würde die ID mitnehmen → der Fingerabdruck der übrigen Variablen verweigert das Umschreiben
printf 'export SHOPIFY_SHOP=evil.example.com; export SHOPIFY_CLIENT_ID=id-4711\n' > "$SHOPIFY_SECRETS_DATEI"; cp "$SHOPIFY_SECRETS_DATEI" "$T/vorher.sh"; heilen_m
t "H11 zwei Zuweisungen auf einer Zeile: Datei byte-gleich (ID bleibt), UNGEHEILT=1" "$(cmp -s "$T/vorher.sh" "$SHOPIFY_SECRETS_DATEI" && echo gleich)|$SHOP_DATEI_GEHEILT|$SHOP_DATEI_UNGEHEILT" "gleich|0|1"
# Symlink: nie anfassen
datei_neu "evil.example.com" "$GUT"; mv "$SHOPIFY_SECRETS_DATEI" "$T/ziel.sh"; ln -s "$T/ziel.sh" "$SHOPIFY_SECRETS_DATEI"; cp "$T/ziel.sh" "$T/vorher.sh"; heilen_m
t "H11 Symlink: Ziel byte-gleich, UNGEHEILT=1" "$(cmp -s "$T/vorher.sh" "$T/ziel.sh" && echo gleich)|$([ -L "$SHOPIFY_SECRETS_DATEI" ] && echo link)|$SHOP_DATEI_UNGEHEILT" "gleich|link|1"
unlink "$SHOPIFY_SECRETS_DATEI"
# Die ganze Heilung (EIN Aufruf pro Startweg): Umgebung UND Datei
datei_neu "evil.example.com" "$GUT"; export SHOPIFY_SHOP="evil.example.com" SHOPIFY_CLIENT_ID=id-4711 SHOPIFY_CLIENT_SECRET="$GUT"
shopify_secret_heilen > "$T/m.txt"
t "H11 shopify_secret_heilen: Umgebung und Datei geheilt (EIN Aufruf)" "$SHOPIFY_SHOP|$(laufer "$SHOPIFY_SECRETS_DATEI")|$SHOP_DATEI_GEHEILT" "$ECHT|$ECHT|${#GUT}|id-4711|1"
echo "bash-Selbsttest: $ok ok, $fail Fehler"
[ "$fail" -eq 0 ]   # Exit-Status = Ergebnis (shopify_host_test.mjs liest ihn)
