# Rendert Liquid-Vorlagen mit dem ECHTEN Ruby-Liquid (Referenz-Implementierung von Shopify, hier 5.x) gegen Attrappen der Shopify-Objekte und -Filter.
# Eingabe (stdin, JSON): {"vorlagen": {"name": "Liquid-Text", ...}, "faelle": [ {Kontext}, ... ], "modus": "strict"|"lax"}
# Ausgabe (stdout, JSON): {"version": "...", "parse": {"name": "ok"|"Fehlertext"}, "fehler": {"name": [...]}, "ergebnisse": {"name": ["...", ...]}}
# Die Shopify-eigenen Tags {% doc %} und {% stylesheet %} gibt es in Ruby-Liquid nicht: sie werden als stille Rohblöcke angelegt (Shopify gibt sie in der Seite auch nicht aus).
# Die Shopify-Filter (t, money, money_with_currency, asset_url, inline_asset_content, image_url, image_tag) sind Attrappen mit stabiler, erkennbarer Ausgabe: sie gelten für alt und neu gleich.
# Umgebung: RUBY_LIQUID_GEMS = GEM_HOME mit «gem install liquid» (der Test sucht ihn selbst, siehe liquid_test.mjs).
$LOAD_PATH.unshift(*Dir[File.join(ENV.fetch('RUBY_LIQUID_GEMS'), 'gems', '*', 'lib')])
require 'json'
require 'cgi'
require 'liquid'

class StillerRohblock < Liquid::Raw
  def render_to_output_buffer(_context, output)
    output
  end
end
# Ab Liquid 5.9 gilt die Environment-Schnittstelle (die Template-Methoden melden sonst Veraltung auf stderr)
UMGEBUNG = defined?(Liquid::Environment) && Liquid::Environment.respond_to?(:default) ? Liquid::Environment.default : nil
if UMGEBUNG
  UMGEBUNG.register_tag('doc', StillerRohblock)
  UMGEBUNG.register_tag('stylesheet', StillerRohblock)
else
  Liquid::Template.register_tag('doc', StillerRohblock)
  Liquid::Template.register_tag('stylesheet', StillerRohblock)
end

module ShopifyAttrappen
  def t(input, opts = {})
    opts = {} unless opts.is_a?(Hash)
    "[t:#{input}#{opts.empty? ? '' : ' ' + opts.map { |k, v| "#{k}=#{v}" }.join(',')}]"
  end

  def money(cent)
    format('CHF %.2f', cent.to_f / 100)
  end

  def money_with_currency(cent)
    money(cent) + ' CHF'
  end

  def asset_url(name)
    "//cdn.test/assets/#{name}"
  end

  def inline_asset_content(name)
    "<svg data-icon=\"#{name}\"></svg>"
  end

  def image_url(bild, opts = {})
    return '' unless bild.is_a?(Hash)
    "//cdn.test/#{bild['src']}?width=#{opts.is_a?(Hash) ? opts['width'] : ''}"
  end

  def image_tag(url, opts = {})
    opts = {} unless opts.is_a?(Hash)
    "<img src=\"#{CGI.escapeHTML(url.to_s)}\" class=\"#{CGI.escapeHTML(opts['class'].to_s)}\" style=\"#{CGI.escapeHTML(opts['style'].to_s)}\" width=\"250\" height=\"250\" loading=\"lazy\">"
  end
end
UMGEBUNG ? UMGEBUNG.register_filter(ShopifyAttrappen) : Liquid::Template.register_filter(ShopifyAttrappen)

class AttrappenDateisystem
  def read_template_file(pfad)
    case pfad
    when 'spacing-style' then '[SPACING]'
    when 'volume-pricing-info' then '[VPI {{ unique_id }} {{ quantity }}]'
    when 'quantity-selector' then '[QTY {{ in_cart_quantity }} {{ line_index }} {{ can_update_quantity }}]'
    when 'unit-price' then '[UP {{ price }}]'
    when 'lspod-designzwang' then '{% if product.tags contains "pod" %}1{% endif %}'
    else raise Liquid::FileSystemError, "Snippet #{pfad} fehlt in der Attrappe"
    end
  end
end
UMGEBUNG ? (UMGEBUNG.file_system = AttrappenDateisystem.new) : (Liquid::Template.file_system = AttrappenDateisystem.new)

eingabe = JSON.parse($stdin.read)
modus = (eingabe['modus'] || 'strict').to_sym
parse = {}
fehler = {}
ergebnisse = {}
eingabe['vorlagen'].each do |name, text|
  begin
    vorlage = Liquid::Template.parse(text, error_mode: modus)
    parse[name] = 'ok'
  rescue StandardError => e
    parse[name] = e.to_s
    next
  end
  fehler[name] = []
  ergebnisse[name] = eingabe['faelle'].map do |ctx|
    begin
      aus = vorlage.render(ctx, strict_variables: false, strict_filters: true)
      fehler[name].concat(vorlage.errors.map(&:to_s))
      aus
    rescue StandardError => e
      fehler[name] << e.to_s
      ''
    end
  end
  fehler[name] = fehler[name].uniq.first(10)
end
puts JSON.generate({ 'version' => Liquid::VERSION, 'parse' => parse, 'fehler' => fehler, 'ergebnisse' => ergebnisse })
