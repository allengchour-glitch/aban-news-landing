# Prueft das ECHTE Snippet (lx-verdichten.liquid, so wie es live ginge) mit dem Ruby-Referenz-Liquid gegen die JS-Nachbildung.
$LOAD_PATH.unshift(*Dir['/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/seo/liquid-audit/gems/gems/*/lib'])
require 'liquid'
require 'benchmark'
require 'json'
base = '/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/seo/stufe2/'
src = File.read(base + 'lx-verdichten.liquid', mode: 'rb').force_encoding('UTF-8')
tpl = Liquid::Template.parse(src, error_mode: :strict)
js = JSON.parse(File.read(base + '_js_ausgabe.json'))
alle_gleich = true
%w[uhren damen-schuhe spielzeug kissen fr-geschenke].each do |n|
  %w[filter karten].each do |modus|
    roh = File.read(base + "#{n}.#{modus}.html", mode: 'rb').force_encoding('UTF-8')
    out = nil
    zeiten = 3.times.map { Benchmark.realtime { out = tpl.render({ 'html' => roh, 'modus' => modus }, { strict_variables: true, strict_filters: true }) } * 1000 }
    erwartet = js["#{n}.#{modus}"]
    gleich = out.length == erwartet
    alle_gleich &&= gleich
    fehler = tpl.errors.map(&:to_s)
    puts format('%-13s %-7s roh %7d -> %7d (JS %7d) %s  %5.1f ms  Fehler: %s', n, modus, roh.length, out.length, erwartet, gleich ? 'GLEICH' : 'ABWEICHUNG', zeiten.min, fehler.inspect)
  end
end
# Rueckfaelle
{ 'unbekannt' => ['a' + "\n" + '   b', 'foo'], 'skript' => ["<script>x // y\n</script>\n  a", 'filter'], 'leer' => ["a\n   b", ''] }.each do |name, (html, modus)|
  out = tpl.render({ 'html' => html, 'modus' => modus })
  puts "Rueckfall #{name}: #{out == html ? 'unveraendert (richtig)' : 'VERAENDERT ' + out.inspect}"
end
puts alle_gleich ? 'ALLE GLEICH' : 'ES GIBT ABWEICHUNGEN'
