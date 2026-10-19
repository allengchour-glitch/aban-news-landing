# Selbsttest für automation/lib/shopify_secret.sh (nur erfundene Werte, kein Netz): bash automation/lib/shopify_secret_test.sh
set -u
. /home/user/aban-news-landing/automation/lib/shopify_secret.sh
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
LIB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ECHT=au3j0y-hq.myshopify.com
t "H0 Konstante" "$SHOPIFY_SHOP_ECHT" "$ECHT"
# Das Python-Grant in shopify_secret_heilen trägt den Host noch einmal wörtlich — Drift fällt hier auf
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
  # melden: Hinweis nur bei Änderung, nie der Wert (nur für Werte mit genug Zeichen, sonst trifft jedes Zeichen irgendwo)
  export SHOPIFY_SHOP="$roh"
  m=$(shopify_shop_pruefen melden)
  mm=${m//.myshopify.com/}; mm=${mm//SHOPIFY_SHOP/}   # feste Wörter der Meldung selbst (".myshopify.com", Variablenname) zählen nicht als Leck
  if [ "${#roh}" -ge 8 ]; then case "$mm" in *"$roh"*) t "H2 Fall $zeilen Leck" ja nein ;; esac; fi
  case "$art" in
    leer|ok)   t "H2 Fall $zeilen still" "$m" "" ;;
    bereinigt) case "$m" in "ℹ️ SHOPIFY-HOST"*) ;; *) t "H2 Fall $zeilen Hinweis" "$m" "ℹ️ SHOPIFY-HOST …" ;; esac ;;
    *)         case "$m" in "⚠️ SHOPIFY-HOST"*) ;; *) t "H2 Fall $zeilen Warnung" "$m" "⚠️ SHOPIFY-HOST …" ;; esac ;;
  esac
done < "$LIB/shopify_host_faelle.tsv"
# Kanarienvogel gegen eine leere/zu kurze Tabelle: alle fünf Urteile müssen vorkommen
t "H3 Fallliste vollständig" "$([ "$zeilen" -ge 30 ] && for a in leer ok bereinigt falsch fremd; do case "$arten" in *" $a"*) ;; *) echo fehlt-$a ;; esac; done)" ""
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
echo "bash-Selbsttest: $ok ok, $fail Fehler"
[ "$fail" -eq 0 ]   # Exit-Status = Ergebnis (shopify_host_test.mjs liest ihn)
