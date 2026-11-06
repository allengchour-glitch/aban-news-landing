#!/bin/bash
# Alle Tests des gemeinsamen Pakets (nichts davon schreibt in den Shop; die Browsertests holen nur das Live-Dokument und die Datenschalen).
#   bash dropship/katalog-fenster-0611/alle_tests.sh            # alles ausser dem Vollscan und der Mutationsprobe
#   VOLL=1 bash dropship/katalog-fenster-0611/alle_tests.sh     # zusätzlich Vollscan aller 572 Modelle (lang)
# Umgebung: ESBUILD=<Pfad zu esbuild> schaltet zusätzlich die Läufe mit der vom Shopify-CDN verkleinerten Fassung ein.
# Live-Abrufe nacheinander mit Pausen (sonst HTTP 429): die Browsertests laufen darum nie gleichzeitig.
cd "$(dirname "$0")/../.." || exit 1
export NODE_PATH="${NODE_PATH:-$(/opt/node22/bin/npm root -g)}"
N=/opt/node22/bin/node
P=dropship/katalog-fenster-0611
rot=0
lauf() { echo; echo "=== $*"; "$@" || rot=1; }
lauf $N $P/ziel_bauen.mjs --pruefen
lauf $N $P/kombi_test.mjs
lauf $N $P/apply_test.mjs
lauf $N $P/test_bestellbar_kombi.cjs
lauf $N $P/test_texte_kombi.cjs schnell
lauf $N $P/test_texte_kombi.cjs szenarien
lauf $N $P/test_texte_kombi.cjs kombi
if [ -n "$ESBUILD" ]; then
  export MINIFIZIERT=1
  lauf $N $P/test_bestellbar_kombi.cjs
  lauf $N $P/test_texte_kombi.cjs schnell
  lauf $N $P/test_texte_kombi.cjs kombi
  unset MINIFIZIERT
fi
if [ "$VOLL" = "1" ]; then lauf $N $P/test_texte_kombi.cjs voll; fi
echo; [ $rot = 0 ] && echo "ALLE TESTS GRÜN" || echo "MINDESTENS EIN TEST ROT"
exit $rot
