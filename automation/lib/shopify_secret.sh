# shopify_secret.sh — EIN Ort, der prüft, ob Shopify den SHOPIFY_CLIENT_SECRET der Umgebung annimmt (15.10.2026).
#
# Zum Einbinden (source), nicht zum Ausführen:
#   . automation/lib/shopify_secret.sh && shopify_secret_heilen [melden]
#
# Warum: Am 14.10. trug die Umgebung der Sitzung einen verdorbenen Wert (60 statt 38 Zeichen, Einfügefehler). Shopify lehnt
# jeden Client-Credentials-Grant damit ab; /tmp/secrets_env.sh trägt den gültigen Wert. engine_keepalive.sh prüfte das seit
# 14.10. — aber NUR für das, was es selbst startet. autostart.sh (SessionStart-Hook, läuft bei JEDEM Container-Neustart)
# startete cj_perpetual, cj_queue_runner und autocommit weiter mit dem abgelehnten Wert: cj_category_fill scheiterte
# 6'832× an «shTok: kein Token» (/tmp/cj_perp.log, gemessen 15.10. 04:30). Jeder Startweg ruft deshalb DIESE Funktion.
#
# Was sie tut: Weicht der Umgebungswert vom Dateiwert ab, prüft sie EINMAL je Umgebungswert beide per Grant (nur Statuscode,
# Werte nie ausgegeben, nie in argv; Urteil zwischengespeichert in /tmp/_shop_secret_pruef als «<md5_12> DATEI|OK <ts>»).
# Lehnt Shopify den Umgebungswert ab und nimmt den Dateiwert, exportiert sie den Dateiwert — alles, was der Aufrufer danach
# startet, erbt den gültigen. Wächter für schon laufende Prozesse: automation/secret_umgebung_wache.py.
# Dauerlösung bleibt der Betreiber-Klick: Umgebungsvariable in den Claude-Umgebungseinstellungen korrigieren.
#
# Setzt: SEC_KORRIGIERT=1, wenn das Urteil DATEI in DIESEM Aufruf neu gefällt wurde (Keepalive ersetzt dann einmal den
#        Aufseher); SEC_GEHEILT=1, wenn der Dateiwert exportiert wurde. Rückgabe immer 0.

shopify_secret_heilen() {
  SEC_KORRIGIERT=0; SEC_GEHEILT=0
  [ -s /tmp/secrets_env.sh ] && [ -n "${SHOPIFY_CLIENT_SECRET:-}" ] && [ -n "${SHOPIFY_CLIENT_ID:-}" ] || return 0
  local _sec_datei _sec_md5 _sec_urteil _sec_len_env
  _sec_datei=$(bash -c '. /tmp/secrets_env.sh >/dev/null 2>&1; printf %s "${SHOPIFY_CLIENT_SECRET:-}"')
  if [ -n "$_sec_datei" ] && [ "$_sec_datei" != "$SHOPIFY_CLIENT_SECRET" ]; then
    _sec_md5=$(printf %s "$SHOPIFY_CLIENT_SECRET" | md5sum | cut -c1-12)
    _sec_urteil=$(grep -s "^$_sec_md5 " /tmp/_shop_secret_pruef | tail -1 | cut -d' ' -f2)
    if [ -z "$_sec_urteil" ]; then
      _sec_urteil=$(SEC_DATEI="$_sec_datei" timeout 70 python3 - <<'PYSEC' 2>/dev/null || echo UNKLAR
import json, os, urllib.request, urllib.error
def grant(sec):
    req = urllib.request.Request("https://au3j0y-hq.myshopify.com/admin/oauth/access_token",
        data=json.dumps({"client_id": os.environ["SHOPIFY_CLIENT_ID"], "client_secret": sec, "grant_type": "client_credentials"}).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "luxe-keepalive"})
    try:
        r = urllib.request.urlopen(req, timeout=30)
        return 200 if json.load(r).get("access_token") else 0
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return -1
u, d = grant(os.environ["SHOPIFY_CLIENT_SECRET"]), grant(os.environ["SEC_DATEI"])
print("DATEI" if u in (400, 401, 403) and d == 200 else "OK" if u == 200 else "UNKLAR")
PYSEC
)
      [ "$_sec_urteil" = UNKLAR ] || echo "$_sec_md5 $_sec_urteil $(date -u +%FT%TZ)" >> /tmp/_shop_secret_pruef
      [ "$_sec_urteil" = DATEI ] && SEC_KORRIGIERT=1
    fi
    if [ "$_sec_urteil" = DATEI ]; then
      _sec_len_env=${#SHOPIFY_CLIENT_SECRET}
      export SHOPIFY_CLIENT_SECRET="$_sec_datei"
      SEC_GEHEILT=1
      [ "${1:-}" = melden ] && echo "⚠️ SHOPIFY-SECRET: Umgebungswert von Shopify abgelehnt (${_sec_len_env} Zeichen, gültig ${#_sec_datei} — Einfügefehler?) — gültiger Dateiwert wird verwendet · Betreiber: Umgebungsvariable SHOPIFY_CLIENT_SECRET in den Claude-Umgebungseinstellungen korrigieren"
    fi
  fi
  return 0
}
