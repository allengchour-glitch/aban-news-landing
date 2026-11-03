#!/usr/bin/env bash
# Stories v2, RUNDE 2 (fuenf Stories; Story 2 Nachtlichtlampe entfaellt). Schreibt NUR nach /tmp/sm-stories-v2/ (out/, orig/, work/).
# Quellen: Shopify-CDN per HTTP-GET, SHA-256 gegen die gesichteten Dateien geprueft. Kein Shop-, Social-, Git-Zugriff.
# Aufruf: ./bauen_v2.sh            alle fuenf   ·   ./bauen_v2.sh 4 6   nur Story 4 und 6
# Python: ausschliesslich /usr/bin/python3 (Pillow + numpy); story_karte.sh (v2-Kopie, Optionen siehe Kopf) und retusche_s4.py liegen daneben.
set -euo pipefail
cd "$(dirname -- "$0")"
S=./story_karte.sh
CDN=https://cdn.shopify.com/s/files/1/0943/6856/3585/files
mkdir -p out orig work

hole() {   # hole DATEI URLTEIL SHA256
  local f="orig/$1" code
  if [ ! -f "$f" ]; then
    code="$(curl --location --silent --show-error --max-time 60 --output "$f" --write-out '%{http_code}' "$CDN/$2")"
    [ "$code" = 200 ] || { echo "FEHLER: $2 liefert HTTP $code" >&2; exit 2; }
  fi
  [ "$(sha256sum "$f" | cut -d' ' -f1)" = "$3" ] || { echo "FEHLER: SHA-256 von $f weicht ab" >&2; exit 2; }
}
hole s1.jpg "1999782621132.jpg?v=1783290113"                        01d9a0ce795cf21500ad732b0556acdfd3ef30615415341cb3b50a916e2c22e3
hole s3.jpg "9473d925-1722-4be5-ba15-c249a62edc0d.jpg?v=1783290145" a1d59903f657f84b0335bac7459c47e6d974aa45677d0465ae40105aadf7d7ad
hole s4.jpg "d6a8cac1-129f-46e1-92b1-3ef7287042e8.jpg?v=1783289707" d767b043a6a6bb1eb849eddc05d50557286d25da6e13966158317c50193c1914
hole s5.jpg "f6c4b442-a6ae-4208-af2b-eaeeda8ddd38.jpg?v=1783290274" b5a0241ba9a3fb4a57c1511c28f3a056df0ff6353cbed696700b34c17e6b6fc9
hole s6.jpg "a06b7e2a-28b6-4ac0-a63d-eaf0b4f016bd.jpg?v=1783289807" ed84341fbc299f381ffeab994354011e64c36ad521a6d1387da2e4f91e4c004a

ARGS=("$@")
sel() { [ "${#ARGS[@]}" -eq 0 ] && return 0; for a in "${ARGS[@]}"; do [ "$a" = "$1" ] && return 0; done; return 1; }

ACC_L=95,74,48        # «.ch» der Fusszeile auf hellem Grund (WCAG 4,5:1 im schlechtesten Pixel; Akzentfarbe der Linien/Rahmen bleibt 139,115,85)
ACC_D=222,192,146     # «.ch» auf dunkler Karte (Story 6; gemessen am fertigen JPG schlechtestes Pixel >= 4,9:1); Story 1 behaelt das urspruengliche 201,171,124 (gemessen 7,0:1)

# 1 LED-Wasser-Speaker (Layout 1, dunkel). Gegenueber der ersten Fassung nur: Hook 110 statt 112 px und Zusatz 54 statt 56 px (>= 20 px Luft zu x 90/990, vorher Hook 13 px, Zusatz 7 px). Runde 2: unveraendert, nur Kontrast-Gate.
if sel 1; then
FOTO_Y=1130 CROP=0:0:800:760 TON=dunkel HOOKW=860 ZUS_SIZE=54 LUFT=20 CONTRAST_MIN=4.5 PRODUKT="LED-Wasser-Speaker mit 3D-Ton" \
SHA=01d9a0ce795cf21500ad732b0556acdfd3ef30615415341cb3b50a916e2c22e3 \
  $S orig/s1.jpg "Musik, die man|sehen kann" "Farbwechselnde Wasserfontäne" 1 out/story-1-wasser-speaker.jpg
fi

# 3 Ewige Rose (Layout 3, hell). Ausschnitt nur Haube (Hase ausserhalb), Goldteller-Rest, Lichtdraht-Zickzack links der Glaskante und Tischtuch im Quellbild mit der Wandfarbe ueberdeckt (retusche_s3.py),
#   Wand ausserhalb der Haube EXAKT gleich der einfarbigen Hinterlegung (kein Fotoschleier), Foto ab Zeile 645 (= Kartenoberkante y 994) hart Wand und im Layout hart bei y 994 abgeschnitten (FOTO_BIS; kein Durchscheinen durch die Karte),
#   Haube 40 px weiter nach oben/kleiner (Faktor 1,35) und Karte 20 px tiefer (Unterkante 1580): das Glas ist bis zum Boden der Glocke sichtbar. Karte x 90..990.
if sel 3; then
/usr/bin/python3 -I retusche_s3.py orig/s3.jpg work/s3_clean.png 645.0
FOTO_Y=596 CROP=205:0:390:700 FITW=526 TON=hell BGFARBE=42,36,26 FEDER=72 FEDER_U=36 FOTO_BIS=994 CARD_X=90 CARD_B=1580 LUFT=20 ACC_FOOT=$ACC_L CONTRAST_MIN=4.5 PRODUKT="Ewige Rose mit LED-Licht" \
  $S work/s3_clean.png "Romantik|im Glas" "Warmweisses LED-Licht" 3 out/story-3-rose-led.jpg
fi

# 4 Anti-Gravitations-Duftbefeuchter (Layout 1, hell). OFF/ON-Beschriftung (und die beiden Schalter-Symbole) im Quellbild retuschiert; Zusatz 54 px.
#   Runde 2: Fusszeile 20 px tiefer (Grundlinie 1568) auf ruhigem Boden, unterer Verlauf kraeftiger (alpha 0,92, endet 1560) statt auf dem Tellerrand.
if sel 4; then
/usr/bin/python3 -I retusche_s4.py orig/s4.jpg work/s4_clean.png alles
FOTO_Y=1030 TON=hell ZUS_SIZE=54 LUFT=20 FUSS_Y=1568 SCRIM_U=1330:1560:0.92 ACC_FOOT=$ACC_L CONTRAST_MIN=4.5 PRODUKT="Anti-Gravitations-Duftbefeuchter mit schwebenden Tropfen" \
  $S work/s4_clean.png "Wie von|Zauberhand" "Tropfen scheinen zu schweben" 1 out/story-4-anti-gravitation.jpg
fi

# 5 Gemuesehobel (Layout 2, hell). Hinterlegung nur aus den Fotorändern (BGKLAR) statt aus dem ganzen Foto: kein grauer Schleier oben. Runde 2: nur «.ch» dunkler.
if sel 5; then
MODUS=fit FITW=940 FOTO_Y=675 MIRROR=40 CROP=0:90:1300:1210 TON=hell BGKLAR=1 ACC_FOOT=$ACC_L CONTRAST_MIN=4.5 PRODUKT="3-in-1 Gemüsehobel mit Scharfen Messern" \
SHA=b5a0241ba9a3fb4a57c1511c28f3a056df0ff6353cbed696700b34c17e6b6fc9 \
  $S orig/s5.jpg "Spiralen|in Sekunden" "Drei Funktionen, ein Gerät" 2 out/story-5-gemuesehobel.jpg
fi

# 6 Automatischer Kaffeebecher (Layout 3, dunkel). Runde 2: Becher steht GANZ sichtbar auf der Karte (Faktor 0,535, Deckel y 281, Boden y 1007 = Kartenoberkante 1006),
#   Karte x 90..990, Unterkante 1580; Hook 106 px (breiter geht es nicht: 20 px Luft zum inneren Kartenrahmen).
if sel 6; then
MODUS=fit FITW=1027 FOTO_Y=653 BGMIX=0 TON=dunkel FOTO_BIS=1006 CARD_X=90 CARD_B=1580 HOOKW=820 LUFT=20 ACC_FOOT=$ACC_D CONTRAST_MIN=4.5 PRODUKT="Automatischer Kaffeebecher" \
SHA=ed84341fbc299f381ffeab994354011e64c36ad521a6d1387da2e4f91e4c004a \
  $S orig/s6.jpg "Der Löffel|hat Feierabend" "Automatische Rührfunktion" 3 out/story-6-kaffeebecher.jpg
fi
