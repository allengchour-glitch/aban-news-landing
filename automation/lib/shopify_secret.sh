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
#        SHOP_URTEIL ∈ leer|ok|bereinigt|falsch|fremd (das Urteil über den Umgebungswert, wie in der Fallliste).
#
# 19.10.2026 (zweite Prüfung, zwei unabhängige Prüfer, beide bestätigt) — REIHENFOLGE-LÜCKE: engine_keepalive.sh schreibt /tmp/secrets_env.sh
# (env_datei) VOR dem Aufruf von shopify_secret_heilen — ein verdorbener Wert landete roh in der Datei, und die 28 Skripte/Runner, die sie
# per `source` einlesen, überschrieben damit den geheilten Wert wieder (GEMESSEN mit der kopierten Original-Funktion env_datei und erfundenem Wert:
# Umgebung geheilt, «Runner nach source» = Fremdhost). shopify_secrets_datei_heilen (ruft shopify_secret_heilen gleich nach dem Host) korrigiert
# deshalb auch die Datei: die Zeile SHOPIFY_SHOP (jedes Urteil ausser ok/leer → echter Host) und die Zeile SHOPIFY_CLIENT_SECRET (nur das exakte
# Muster Schlüssel + «=SHOPIFY_CLIENT_SECRET»). Schreiben nur nach Prüfung: beim `source` in leerer Umgebung muss die Variable danach den Sollwert
# haben, JEDE andere Variable denselben Wert wie vorher und `bash -n` die Datei annehmen, sonst bleibt die Datei unverändert (SHOP_DATEI_UNGEHEILT=1, Meldung ⚠️). Ersatzdatei
# per mktemp (600) neben der Datei + mv (atomar); Symlink/nicht beschreibbar → nichts. Werte nie in argv, nie ausgegeben.
# Setzt: SHOP_DATEI_GEHEILT=1 / SEC_DATEI_BEREINIGT=1 (Zeile korrigiert), SHOP_DATEI_UNGEHEILT=1 (Korrektur misslungen).
# LÄNGE: Ein Hostname hat höchstens 253 Zeichen (DNS). Längere Werte sind «falsch» und werden NIE bereinigt — die Bash-Trimm-Ausdrücke sind
# auf langem Leerraum quadratisch (GEMESSEN 19.10.: 10'000 Leerzeichen 0,29 s · 20'000 1,06 s · 40'000 4,08 s, rund 45 s bei 130'000 =
# Grösse einer Linux-Umgebungsvariablen; der Aufseher hat dort keinen Timeout). Gleiche Schranke in shopify_host.mjs / .py.

SHOPIFY_SHOP_ECHT=au3j0y-hq.myshopify.com   # EINE Quelle; das Python-Grant unten trägt ihn ebenfalls (Test schlägt bei Drift an)
SHOP_MAXLAENGE=253                          # Hostname-Maximum (DNS); Bytes unter LC_ALL=C — für ASCII, die einzig möglichen Treffer, = Zeichen
SHOPIFY_SECRETS_DATEI=/tmp/secrets_env.sh   # Absichtlich NICHT aus der Umgebung gelesen; Tests setzen die Variable nach dem Einbinden um

# _shop_struktur WERT — Länge (hier: Bytes) und Merkmale, NIE Zeichen des Werts (der Wert könnte ein vertauschter Schlüssel sein).
# Gleiche Merkmalsliste wie hostStruktur in shopify_host.mjs / shopify_host.py. Läuft unter eigenem LC_ALL=C (ASCII-genau).
_shop_struktur() {
  local LC_ALL=C v="$1" t k s w
  s="Länge ${#v}"
  [ "${#v}" -gt "$SHOP_MAXLAENGE" ] && { printf %s "$s, länger als $SHOP_MAXLAENGE"; return 0; }   # nicht weiter scannen (Trimmen unten wäre quadratisch)
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

# _shop_urteil WERT — das reine Urteil (kein Export, kein Netz, keine Datei): setzt SHOP_URTEIL ∈ leer|ok|bereinigt|falsch|fremd und
# SHOP_KANON (der kanonische Host, nur bei ok/bereinigt). Regel: Länge über SHOP_MAXLAENGE → falsch (ohne Bereinigung) · Leerraum am Rand
# weg · ein Paar GLEICHER Anführungszeichen weg · Kleinschreibung · «https://» weg · Vorsatz «shopify_shop=» ODER Anhang «=shopify_shop» weg ·
# ein «/» am Ende weg · Rest muss ^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.myshopify\.com$ treffen (sonst falsch) UND der echte Shop sein (sonst fremd).
_shop_urteil() {
  local LC_ALL=C roh="${1-}" w re
  SHOP_URTEIL=leer; SHOP_KANON=""
  [ -n "$roh" ] || return 0
  if [ "${#roh}" -gt "$SHOP_MAXLAENGE" ]; then SHOP_URTEIL=falsch; return 0; fi
  w="${roh#"${roh%%[![:space:]]*}"}"; w="${w%"${w##*[![:space:]]}"}"
  if [ "${#w}" -ge 2 ] && { [[ $w == \"*\" ]] || [[ $w == \'*\' ]]; }; then
    w="${w:1:${#w}-2}"; w="${w#"${w%%[![:space:]]*}"}"; w="${w%"${w##*[![:space:]]}"}"
  fi
  w="${w,,}"; w="${w#https://}"
  case "$w" in shopify_shop=*) w="${w#shopify_shop=}" ;; *=shopify_shop) w="${w%=shopify_shop}" ;; esac
  w="${w%/}"
  re='^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.myshopify\.com$'
  if ! [[ $w =~ $re ]]; then SHOP_URTEIL=falsch
  elif [ "$w" != "$SHOPIFY_SHOP_ECHT" ]; then SHOP_URTEIL=fremd
  else SHOP_KANON="$w"; if [ "$w" = "$roh" ]; then SHOP_URTEIL=ok; else SHOP_URTEIL=bereinigt; fi
  fi
  return 0
}

# shopify_shop_pruefen [melden] — prüft/heilt SHOPIFY_SHOP der Umgebung (kein Netz, keine Dateien; Rückgabe immer 0).
# Das Urteil fällt _shop_urteil; bereinigt → bereinigt exportiert, falsch/fremd → der echte Host exportiert, leer/ok → nichts.
shopify_shop_pruefen() {
  SHOP_BEREINIGT=0; SHOP_ERSETZT=0
  local roh art
  roh="${SHOPIFY_SHOP-}"
  _shop_urteil "$roh"
  case "$SHOP_URTEIL" in
    leer|ok) return 0 ;;
    bereinigt)
      export SHOPIFY_SHOP="$SHOP_KANON"; SHOP_BEREINIGT=1
      if [ "${1:-}" = melden ]; then echo "ℹ️ SHOPIFY-HOST: SHOPIFY_SHOP war nicht kanonisch ($(_shop_struktur "$roh")) — bereinigt · Betreiber: in den Claude-Umgebungseinstellungen den reinen Host eintragen"; fi
      return 0 ;;
  esac
  art="kein Shopify-Shop-Host"; [ "$SHOP_URTEIL" = fremd ] && art="ein anderer Shop-Host"
  export SHOPIFY_SHOP="$SHOPIFY_SHOP_ECHT"; SHOP_ERSETZT=1
  if [ "${1:-}" = melden ]; then echo "⚠️ SHOPIFY-HOST: SHOPIFY_SHOP ist $art ($(_shop_struktur "$roh")) — der echte Shop-Host wird verwendet, das Client-Secret geht nie an diesen Wert · Betreiber: Umgebungsvariable SHOPIFY_SHOP korrigieren"; fi
  return 0
}

# ── Datei /tmp/secrets_env.sh (Reihenfolge-Lücke, s. Kopf) ────────────────────────────────────────────────────────────────────
# _datei_wert DATEI VAR — der Wert, den ein Runner nach `source DATEI` sähe (leere Umgebung, nur was die DATEI setzt). Sentinel «x»: `$(…)`
# schneidet Zeilenenden ab, und ein Wert wie «host\n» (genau das schreibt env_datei per %q) sähe sonst sauber aus. Die Ausgabe ist deshalb
# «<wert>x» — der Aufrufer fängt sie EINMAL ab und schneidet das «x» selbst ab (`w=$(_datei_wert …); w=${w%x}`); ein zweites `$(…)` dazwischen
# würde das Zeilenende doch wieder verlieren (GEMESSEN 19.10. beim ersten Test: Datei mit «host\n» blieb unrepariert).
_datei_wert() {
  env -i PATH="$PATH" bash --noprofile --norc -c '. "$1" >/dev/null 2>&1; printf %sx "${!2-}"' _ "$1" "$2" 2>/dev/null
}

# _datei_rest DATEI VAR — Fingerabdruck ALLER anderen Variablen nach `source` (allexport: auch Zuweisungen ohne «export»).
_datei_rest() {
  env -i PATH="$PATH" bash --noprofile --norc -c 'set -a; . "$1" >/dev/null 2>&1; unset "$2"; env | LC_ALL=C sort | md5sum | cut -c1-16' _ "$1" "$2" 2>/dev/null
}

# _datei_zeile_heilen DATEI VAR NEUWERT — ersetzt die Zuweisung(en) «[export] VAR=…» durch «export VAR=<NEUWERT>» (am Platz der ersten). 0 nur,
# wenn das Ergebnis geprüft ist (VAR = NEUWERT, alle anderen Variablen unverändert, Datei syntaktisch heil); sonst bleibt DATEI unberührt (1). NEUWERT nie in argv.
_datei_zeile_heilen() {
  local f="$1" var="$2" neu="$3" tmp vorher nachher ist
  [ -f "$f" ] && [ ! -L "$f" ] && [ -w "$f" ] || return 1
  vorher=$(_datei_rest "$f" "$var") && [ -n "$vorher" ] || return 1
  tmp=$(mktemp "$f.XXXXXX" 2>/dev/null) || return 1
  if ! ZEILE="export $var=$(printf %q "$neu")" VAR="$var" awk '
      $0 ~ ("^[ \t]*(export[ \t]+)?" ENVIRON["VAR"] "=") { if (!fertig) print ENVIRON["ZEILE"]; fertig = 1; next }
      { print }' "$f" > "$tmp" 2>/dev/null; then rm -f "$tmp"; return 1; fi
  nachher=$(_datei_rest "$tmp" "$var")
  ist=$(_datei_wert "$tmp" "$var")                  # «<wert>x» (Sentinel, s. _datei_wert): ein Zeilenende am Wert darf nicht still wegfallen
  # `bash -n`: bash führt beim `source` die Zeilen VOR einem Syntaxfehler noch aus — eine übrig gebliebene Folgezeile eines mehrzeiligen Werts
  # (GEMESSEN im ersten Testlauf: «'evil…» + Folgezeile «nochmal'») bräche die Datei, ohne dass Wert- und Fingerabdruck-Vergleich es merken.
  if [ "$nachher" = "$vorher" ] && [ "$ist" = "${neu}x" ] && bash --noprofile --norc -n "$tmp" 2>/dev/null; then
    mv -f "$tmp" "$f" 2>/dev/null && return 0
  fi
  rm -f "$tmp"; return 1
}

# shopify_secrets_datei_heilen [melden] — korrigiert die Zeilen SHOPIFY_SHOP und (nur das exakte Muster) SHOPIFY_CLIENT_SECRET in der Datei.
shopify_secrets_datei_heilen() {
  SHOP_DATEI_GEHEILT=0; SEC_DATEI_BEREINIGT=0; SHOP_DATEI_UNGEHEILT=0
  local f="$SHOPIFY_SECRETS_DATEI" wert neu
  [ -s "$f" ] || return 0
  wert=$(_datei_wert "$f" SHOPIFY_SHOP); wert=${wert%x}
  _shop_urteil "$wert"
  case "$SHOP_URTEIL" in
    bereinigt|falsch|fremd)
      if _datei_zeile_heilen "$f" SHOPIFY_SHOP "$SHOPIFY_SHOP_ECHT"; then
        SHOP_DATEI_GEHEILT=1
        [ "${1:-}" = melden ] && echo "ℹ️ SHOPIFY-HOST: $f trug einen unbrauchbaren SHOPIFY_SHOP ($(_shop_struktur "$wert")) — Zeile korrigiert (die Runner lesen die Datei nach dem Start ein)"
      else
        SHOP_DATEI_UNGEHEILT=1
        [ "${1:-}" = melden ] && echo "⚠️ SHOPIFY-HOST: $f trägt einen unbrauchbaren SHOPIFY_SHOP ($(_shop_struktur "$wert")) und liess sich nicht prüfbar korrigieren — Runner, die sie einlesen, schicken das Secret an diesen Wert · Betreiber: Zeile SHOPIFY_SHOP in der Datei von Hand ersetzen"
      fi ;;
  esac
  wert=$(_datei_wert "$f" SHOPIFY_CLIENT_SECRET); wert=${wert%x}
  if [[ $wert =~ ^(shpss_[0-9a-f]{32})=SHOPIFY_CLIENT_SECRET$ ]]; then
    neu="${BASH_REMATCH[1]}"
    if _datei_zeile_heilen "$f" SHOPIFY_CLIENT_SECRET "$neu"; then
      SEC_DATEI_BEREINIGT=1
      [ "${1:-}" = melden ] && echo "ℹ️ SHOPIFY-SECRET: $f trug «=SHOPIFY_CLIENT_SECRET» hinter dem Schlüssel (60 statt 38 Zeichen) — Anhang abgeschnitten"
    else
      SHOP_DATEI_UNGEHEILT=1
      [ "${1:-}" = melden ] && echo "⚠️ SHOPIFY-SECRET: $f trägt «=SHOPIFY_CLIENT_SECRET» hinter dem Schlüssel und liess sich nicht prüfbar korrigieren · Betreiber: den Anhang in der Datei von Hand löschen"
    fi
  fi
  return 0
}

shopify_secret_heilen() {
  SEC_KORRIGIERT=0; SEC_GEHEILT=0; SEC_BEREINIGT=0
  shopify_shop_pruefen "${1:-}"   # 19.10.2026: Host zuerst — das Grant unten geht an den festen Host, alles danach erbt den geprüften
  shopify_secrets_datei_heilen "${1:-}"   # 19.10.2026: die Datei, die die Runner einlesen, VOR dem Dateiwert-Vergleich unten (Reihenfolge-Lücke)
  # 19.10.2026 (GEMESSEN: Struktur des 60-Zeichen-Werts ohne ihn auszugeben): gültiger Schlüssel (shpss_ + 32 Hex = 38) + «=» +
  # «SHOPIFY_CLIENT_SECRET» (21) = 60 — der Variablenname wurde HINTER den Wert gepastet. Reine Zeichenkettenregel, ohne Netz und ohne
  # Dateiwert: so bleibt der Start auch gesund, wenn /tmp/secrets_env.sh fehlt. Nur dieses exakte Muster wird angefasst.
  if [[ "${SHOPIFY_CLIENT_SECRET:-}" =~ ^(shpss_[0-9a-f]{32})=SHOPIFY_CLIENT_SECRET$ ]]; then
    export SHOPIFY_CLIENT_SECRET="${BASH_REMATCH[1]}"
    SEC_BEREINIGT=1
    [ "${1:-}" = melden ] && echo "ℹ️ SHOPIFY-SECRET: Umgebungswert trug «=SHOPIFY_CLIENT_SECRET» hinter dem Schlüssel (60 statt 38 Zeichen) — Anhang abgeschnitten · Betreiber: in den Claude-Umgebungseinstellungen den Anhang «=SHOPIFY_CLIENT_SECRET» aus dem Wert löschen"
  fi
  [ -s "$SHOPIFY_SECRETS_DATEI" ] && [ -n "${SHOPIFY_CLIENT_SECRET:-}" ] && [ -n "${SHOPIFY_CLIENT_ID:-}" ] || return 0
  local _sec_datei _sec_md5 _sec_urteil _sec_len_env
  _sec_datei=$(bash -c '. "$1" >/dev/null 2>&1; printf %s "${SHOPIFY_CLIENT_SECRET:-}"' _ "$SHOPIFY_SECRETS_DATEI")
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
