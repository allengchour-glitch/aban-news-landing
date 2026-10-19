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
#
# 19.10.2026 — SHOP-HOST (shopify_shop_pruefen, unten): Derselbe Einfügefehler kann SHOPIFY_SHOP treffen; dann ginge das gültige Secret an
# einen Fantasie-Host. GEMESSEN 19.10.: 39 von 123 Dateien, die an admin/oauth/access_token senden, nehmen den Host roh aus der
# Umgebung (24 prüfen nur das Suffix `myshopify\.com$`, das auch «evilmyshopify.com» durchlässt) — und kein Startweg prüfte ihn.
# shopify_secret_heilen ruft shopify_shop_pruefen als ERSTES: EIN Aufruf pro Startweg (autostart.sh, engine_keepalive.sh) deckt beides
# ab, kein Startweg muss angefasst werden. Regel + Fallliste gleich in lib/shopify_host.mjs / shopify_host.py (shopify_host_faelle.tsv).
# Setzt: SHOP_BEREINIGT=1, wenn der Wert nur anders geschrieben war (Leerraum, Anführungszeichen, https://, Grossbuchstaben, Schluss-/,
#        Variablenname als Vorsatz/Anhang) und bereinigt exportiert wurde; SHOP_ERSETZT=1, wenn er auch bereinigt kein Host unter
#        myshopify.com oder ein anderer Shop war und der echte Host exportiert wurde. Nicht gesetzt/leer: nichts (kein Raten).

SHOPIFY_SHOP_ECHT=au3j0y-hq.myshopify.com   # EINE Quelle; das Python-Grant unten trägt ihn ebenfalls (Test schlägt bei Drift an)

# _shop_struktur WERT — Länge (hier: Bytes) und Merkmale, NIE Zeichen des Werts (der Wert könnte ein vertauschter Schlüssel sein).
# Gleiche Merkmalsliste wie hostStruktur in shopify_host.mjs / shopify_host.py. Läuft unter LC_ALL=C des Aufrufers (ASCII-genau).
_shop_struktur() {
  local v="$1" t k s w
  s="Länge ${#v}"
  [[ $v == *[[:space:]]* ]] && s+=", Leerraum"
  [[ $v == *\"* || $v == *\'* ]] && s+=", Anführungszeichen"
  [[ $v == *://* ]] && s+=", enthält «://»"
  [[ $v == */* ]] && s+=", enthält «/»"
  [[ $v == *=* ]] && s+=", enthält «=»"
  [[ $v == *@* ]] && s+=", enthält «@»"
  w=${v//:\/\//}; [[ $w == *:* ]] && s+=", enthält «:»"
  [[ $v == *[A-Z]* ]] && s+=", Grossbuchstaben"
  k=${v,,}; [[ $k == *shopify_shop* ]] && s+=", enthält den Variablennamen"
  t="${v#"${v%%[![:space:]]*}"}"; t="${t%"${t##*[![:space:]]}"}"
  [[ $t =~ ^(shp[a-z]{2}_|[0-9a-fA-F]{32}$) ]] && s+=", schlüsselartig (vertauscht?)"
  k=${t,,}; [[ $k == *.myshopify.com ]] || s+=", endet nicht auf .myshopify.com"
  printf %s "$s"
}

# shopify_shop_pruefen [melden] — prüft/heilt SHOPIFY_SHOP der Umgebung (kein Netz, keine Dateien; Rückgabe immer 0).
# Regel: Leerraum am Rand weg · ein Paar Anführungszeichen weg · Kleinschreibung · «https://» weg · Vorsatz «shopify_shop=» ODER Anhang
# «=shopify_shop» weg · ein «/» am Ende weg · Rest muss ^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.myshopify\.com$ treffen UND der echte Shop sein.
shopify_shop_pruefen() {
  SHOP_BEREINIGT=0; SHOP_ERSETZT=0
  local LC_ALL=C roh w re art
  roh="${SHOPIFY_SHOP-}"
  [ -n "$roh" ] || return 0
  w="${roh#"${roh%%[![:space:]]*}"}"; w="${w%"${w##*[![:space:]]}"}"
  if [ "${#w}" -ge 2 ] && { [[ $w == \"*\" ]] || [[ $w == \'*\' ]]; }; then
    w="${w:1:${#w}-2}"; w="${w#"${w%%[![:space:]]*}"}"; w="${w%"${w##*[![:space:]]}"}"
  fi
  w="${w,,}"; w="${w#https://}"
  case "$w" in shopify_shop=*) w="${w#shopify_shop=}" ;; *=shopify_shop) w="${w%=shopify_shop}" ;; esac
  w="${w%/}"
  re='^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.myshopify\.com$'
  if [[ $w =~ $re ]] && [ "$w" = "$SHOPIFY_SHOP_ECHT" ]; then
    if [ "$w" != "$roh" ]; then
      export SHOPIFY_SHOP="$w"; SHOP_BEREINIGT=1
      if [ "${1:-}" = melden ]; then echo "ℹ️ SHOPIFY-HOST: SHOPIFY_SHOP war nicht kanonisch ($(_shop_struktur "$roh")) — bereinigt · Betreiber: in den Claude-Umgebungseinstellungen den reinen Host eintragen"; fi
    fi
    return 0
  fi
  art="kein Shopify-Shop-Host"; [[ $w =~ $re ]] && art="ein anderer Shop-Host"
  export SHOPIFY_SHOP="$SHOPIFY_SHOP_ECHT"; SHOP_ERSETZT=1
  if [ "${1:-}" = melden ]; then echo "⚠️ SHOPIFY-HOST: SHOPIFY_SHOP ist $art ($(_shop_struktur "$roh")) — der echte Shop-Host wird verwendet, das Client-Secret geht nie an diesen Wert · Betreiber: Umgebungsvariable SHOPIFY_SHOP korrigieren"; fi
  return 0
}

shopify_secret_heilen() {
  SEC_KORRIGIERT=0; SEC_GEHEILT=0; SEC_BEREINIGT=0
  shopify_shop_pruefen "${1:-}"   # 19.10.2026: Host zuerst — das Grant unten geht an den festen Host, alles danach erbt den geprüften
  # 19.10.2026 (GEMESSEN: Struktur des 60-Zeichen-Werts ohne ihn auszugeben): gültiger Schlüssel (shpss_ + 32 Hex = 38) + «=» +
  # «SHOPIFY_CLIENT_SECRET» (21) = 60 — der Variablenname wurde HINTER den Wert gepastet. Reine Zeichenkettenregel, ohne Netz und ohne
  # Dateiwert: so bleibt der Start auch gesund, wenn /tmp/secrets_env.sh fehlt. Nur dieses exakte Muster wird angefasst.
  if [[ "${SHOPIFY_CLIENT_SECRET:-}" =~ ^(shpss_[0-9a-f]{32})=SHOPIFY_CLIENT_SECRET$ ]]; then
    export SHOPIFY_CLIENT_SECRET="${BASH_REMATCH[1]}"
    SEC_BEREINIGT=1
    [ "${1:-}" = melden ] && echo "ℹ️ SHOPIFY-SECRET: Umgebungswert trug «=SHOPIFY_CLIENT_SECRET» hinter dem Schlüssel (60 statt 38 Zeichen) — Anhang abgeschnitten · Betreiber: in den Claude-Umgebungseinstellungen den Anhang «=SHOPIFY_CLIENT_SECRET» aus dem Wert löschen"
  fi
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
