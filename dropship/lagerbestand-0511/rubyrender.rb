# Rendert einen Liquid-Block mit dem ECHTEN Ruby-Liquid (Referenz-Implementierung von Shopify).
# Eingabe (stdin, JSON): {"template": "...", "now": 1793867400, "faelle": [ {...Kontext...}, ... ]}
# Ausgabe (stdout, JSON): {"version": "...", "fehler": [...], "ergebnisse": ["...", ...]}
ENV['TZ'] = 'Etc/GMT-1' # UTC+1 fest (POSIX-Vorzeichen umgekehrt) = Winterzeit der Schweiz
$LOAD_PATH.unshift(*Dir[File.join(ENV.fetch('RUBY_LIQUID_GEMS'), 'gems', '*', 'lib')])
require 'json'
require 'liquid'
eingabe = JSON.parse($stdin.read)
fest = Time.at(eingabe['now'])
Time.singleton_class.send(:define_method, :now) { fest }
t = Liquid::Template.parse(eingabe['template'], error_mode: :strict)
fehler = []
ergebnisse = eingabe['faelle'].map do |ctx|
  begin
    out = t.render(ctx, strict_variables: false, strict_filters: true)
    fehler.concat(t.errors.map(&:to_s))
    out
  rescue => e
    fehler << e.to_s
    ''
  end
end
puts JSON.generate({ 'version' => Liquid::VERSION, 'fehler' => fehler.uniq.first(10), 'ergebnisse' => ergebnisse })
