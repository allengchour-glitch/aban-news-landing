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
echo "bash-Selbsttest: $ok ok, $fail Fehler"
