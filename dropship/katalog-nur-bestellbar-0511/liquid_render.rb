# Rendert Theme-Liquid mit dem ECHTEN Ruby-Liquid (Referenz-Implementierung von Shopify, strikter Modus) gegen Attrappen der Shopify-Objekte.
# Eingabe (stdin, JSON): {"templates": {"name": "Quelltext", …}, "main": "Quelltext", "context": {…}, "translations": {"luxe_clothing.notice": "…", …}}
# Ausgabe (stdout, JSON): {"version": "…", "fehler": […], "ausgabe": "…"}
# Aufruf: RUBY_LIQUID_GEMS=<GEM_HOME mit «gem install liquid -v 5.14.0»> ruby liquid_render.rb < eingabe.json
# Die Shopify-eigenen Filter (t, asset_url, image_url, image_tag, stylesheet_tag, money_with_currency, json) und Tags (schema, javascript, doc) sind hier nachgebaut,
# soweit die Katalog-Dateien sie brauchen; render-Snippets kommen aus «templates».
$LOAD_PATH.unshift(*Dir[File.join(ENV.fetch('RUBY_LIQUID_GEMS'), 'gems', '*', 'lib')])
require 'json'
require 'liquid'

module ShopFilter
  def t(key)
    uebersetzungen = @context.registers[:uebersetzungen] || {}
    uebersetzungen[key.to_s] || "translation missing: #{key}"
  end

  def asset_url(datei)
    "//luxestyle.ch/cdn/shop/t/26/assets/#{datei}?v=1"
  end

  def stylesheet_tag(url)
    %(<link href="#{url}" rel="stylesheet">)
  end

  def image_url(bild, optionen = {})
    "//cdn.test/#{bild['src']}?width=#{optionen['width']}"
  end

  def image_tag(url, optionen = {})
    %(<img src="#{url}" alt="#{optionen['alt']}">)
  end

  def money_with_currency(cent)
    format('CHF %.2f', cent.to_f / 100)
  end

  def json(wert)
    JSON.generate(wert, quirks_mode: true)
  end
end
Liquid::Template.register_filter(ShopFilter)

class Verschlucken < Liquid::Raw
  def render_to_output_buffer(_kontext, ausgabe)
    ausgabe
  end
end
%w[schema javascript doc].each { |name| Liquid::Template.register_tag(name, Verschlucken) }

class AttrappenDateisystem
  def initialize(vorlagen)
    @vorlagen = vorlagen
  end

  def read_template_file(name)
    @vorlagen.fetch(name.to_s) { raise Liquid::FileSystemError, "Snippet fehlt in der Attrappe: #{name}" }
  end
end

eingabe = JSON.parse($stdin.read)
Liquid::Template.file_system = AttrappenDateisystem.new(eingabe['templates'] || {})
fehler = []
ausgabe = ''
begin
  vorlage = Liquid::Template.parse(eingabe['main'], error_mode: :strict)
  # static_environments: die Shopify-Globals (all_products, collections, request …) bleiben auch in {% render %}-Unterkontexten erreichbar
  kontext = Liquid::Context.build(static_environments: eingabe['context'] || {}, registers: Liquid::Registers.new(uebersetzungen: eingabe['translations'] || {}))
  kontext.strict_variables = false
  kontext.strict_filters = true
  ausgabe = vorlage.render(kontext)
  fehler.concat(vorlage.errors.map(&:to_s))
rescue StandardError => e
  fehler << "#{e.class}: #{e.message}"
end
puts JSON.generate({ 'version' => Liquid::VERSION, 'fehler' => fehler, 'ausgabe' => ausgabe })
