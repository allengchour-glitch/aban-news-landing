# variant_links_liquid_test.rb — Offline-Test des Theme-Snippets lx-karten-href (19.10.2026). Schreibt NIE nach Shopify.
# Nutzt die Ruby-Gem «liquid» (Shopifys eigene Liquid-Implementierung), liest das Snippet aus dropship/_theme_backup_variantlinks_2026-10-19/neu/.
#   ruby automation/variant_links_liquid_test.rb
# Ausgabe: Zeile je Fall + «LIQUID-TEST: n/n» (Exit 0) oder Liste der Abweichungen (Exit 1).
require 'liquid'
pfad = File.expand_path('../dropship/_theme_backup_variantlinks_2026-10-19/neu/snippets/lx-karten-href.liquid', __dir__)
quelle = File.read(pfad)
t = Liquid::Template.parse(quelle, error_mode: :strict)
P  = { 'url' => '/products/x', 'selected_variant' => nil }
PV = { 'url' => '/products/x', 'selected_variant' => { 'url' => '/products/x?variant=42' } }
LEER  = [{ 'active_values' => [], 'min_value' => { 'value' => nil }, 'max_value' => { 'value' => nil } }, { 'active_values' => [] }]
AKTIV = [{ 'active_values' => [{ 'value' => 'M' }] }]
PREIS = [{ 'active_values' => [], 'min_value' => { 'value' => '10' }, 'max_value' => { 'value' => nil } }]
faelle = [
  ['Startseite, keine Auswahl',                 'index',      P,  LEER,  '/products/x'],
  ['Startseite, Auswahl gesetzt (nie Variante)', 'index',      PV, LEER,  '/products/x'],
  ['Standard-Kollektion',                        'collection', P,  LEER,  '/products/x'],
  ['Kollektion mit Optionsfilter (Variante)',    'collection', PV, LEER,  '/products/x?variant=42'],
  ['Suche ohne Filter, Relevanz-Variante',       'search',     PV, LEER,  '/products/x'],
  ['Suche ohne Filter, ohne Variante',           'search',     P,  LEER,  '/products/x'],
  ['Suche mit aktivem Filter (Variante bleibt)', 'search',     PV, AKTIV, '/products/x?variant=42'],
  ['Suche mit Preisfilter (Variante bleibt)',    'search',     PV, PREIS, '/products/x?variant=42'],
  ['Produktseite ohne ?variant=',                'product',    P,  LEER,  '/products/x'],
  ['Produktseite mit ?variant=42',               'product',    PV, LEER,  '/products/x?variant=42'],
  ['Platzhalter (kein Produkt)',                 'collection', nil, LEER, ''],
]
fehler = []
faelle.each do |name, tmpl, prod, filter, soll|
  ist = t.render('product' => prod, 'template' => { 'name' => tmpl }, 'search' => { 'filters' => filter }).strip
  ok = ist == soll
  fehler << "#{name}: soll «#{soll}» ist «#{ist}»" unless ok
  puts "#{ok ? 'OK  ' : 'FAIL'} #{name} -> «#{ist}»"
end
# Mutationsprüfung: ein kaputtes Snippet (immer Variante) MUSS durchfallen
kaputt = Liquid::Template.parse("{{ product.selected_variant.url | default: product.url }}")
mut = kaputt.render('product' => PV, 'template' => { 'name' => 'index' }).strip
mut_ok = mut != '/products/x'
puts "#{mut_ok ? 'OK  ' : 'FAIL'} Mutation (immer Variante) wird erkannt -> «#{mut}»"
fehler << 'Mutation nicht erkannt' unless mut_ok
if fehler.empty?
  puts "LIQUID-TEST: #{faelle.size}/#{faelle.size} Faelle + Mutation ok"
else
  puts "LIQUID-TEST: FEHLER #{fehler.join(' | ')}"
  exit 1
end
