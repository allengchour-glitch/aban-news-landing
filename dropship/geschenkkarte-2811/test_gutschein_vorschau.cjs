'use strict';
// Offline regression. Supply the path to the verified LiquidJS 10.21.1 bundle or use an installed liquidjs package.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Liquid } = require(process.env.LIQUIDJS_PATH || 'liquidjs');
const engine = new Liquid();
const template = dir => {
  const src = fs.readFileSync(dir + '/templates/product.json', 'utf8');
  return JSON.parse(src.slice(src.indexOf('{')));
};
const sourceDir=process.argv[2] || 'original';
const previewDir=process.argv[3] || 'vorschau';
const raw = template(sourceDir);
const next = template(previewDir);
const blocks = template => template.sections.main.blocks['product-details'].blocks;
const before = blocks(raw), after = blocks(next);
const render = (s, ctx) => engine.parseAndRenderSync(s, ctx);
const css = x => x.settings.custom_liquid;
const changes = ['lux_delivery', 'lux_trust'];
let samples = 0;
const giftTags=['geschenk','geschenkkarte','nicht-google-bewerben','weihnachten'];
const pandaTags=['bild-ok','bildmass-ok-0907','ch-lager','dropship','fortura','kat-kinder-baby','neu','pluesch','profil-ch-lager','schweiz-versand','sort-kinder-baby','sort-puppen','spielzeug-ch-front'];
const canonicalPandaId=55970886648193;
const textOnly=html=>html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
for (const lang of ['de','fr']) {
  for (const [gift, tags, price,id] of [
    [true,giftTags,2500,68338120491399], [true,giftTags,5000,68338120524167],
    [true,giftTags,10000,68338120556935], [false,pandaTags,1990,canonicalPandaId],
    [false,[],3490], [false,['geschenkkarte'],2500], [false,['eu-lager'],5400], [false,['profil-ch-lager'],6000],
  ]) {
    const variant={available:true,price,id};
    const product={'gift_card?':gift,tags,price,available:true,selected_or_first_available_variant:variant};
    const ctx={closest:{product},product,request:{locale:{iso_code:lang}},localization:{country:{iso_code:'CH'}}};
    for(const name of changes) {
      const oldHtml=render(css(before[name]),ctx);
      const newHtml=render(css(after[name]),ctx);
      const originalText=textOnly(oldHtml);
      if(gift) {
        if(name==='lux_delivery') {
          assert.ok(originalText.includes(lang==='de' ? 'Direktversand aus Asien' : 'expédition directe depuis l’Asie'));
        } else if (price===2500) {
          assert.ok(originalText.includes(lang==='de' ? 'Versand in der Schweiz CHF 7' : 'Livraison en Suisse CHF 7'));
        }
        assert.equal(newHtml,'',name);
      } else {
        assert.equal(newHtml,oldHtml,name + ': physical HTML changed');
        if(id===canonicalPandaId) {
          const phrases=lang==='de' ? {
            lux_delivery:'Blitzversand aus dem Schweizer Lager',
            lux_trust:'Gratis-Versand in der Schweiz für Ware ab Schweizer Lager'
          } : {
            lux_delivery:'Expédition express depuis l’entrepôt suisse',
            lux_trust:'Livraison gratuite en Suisse pour les articles de l’entrepôt suisse'
          };
          assert.ok(textOnly(newHtml).includes(phrases[name]), 'Panda: '+phrases[name]);
        }
      }
      samples++;
    }
  }
}
// No other JSON keys changed. This includes Shopify's gift recipient form and variant selector.
const restore = structuredClone(next);
for (const name of changes) {
  assert.equal(css(after[name]), '{% unless closest.product.gift_card? %}'+css(before[name])+'{% endunless %}');
  blocks(restore)[name].settings.custom_liquid = css(before[name]);
}
assert.equal(after.accordion_xfeWHx.settings.hide_for_gift_cards,true);
delete blocks(restore).accordion_xfeWHx.settings.hide_for_gift_cards;
assert.deepEqual(raw, restore);
assert.equal(after.buy_buttons_eYQEYi.settings.gift_card_form, true);
assert.ok(Object.hasOwn(after,'variant_picker_R3rGDr'));
assert.ok(css(after.lux_anlass_hinweis).includes('unless closest.product.gift_card? or'));
const read = (dir,p) => fs.readFileSync(dir+'/'+p,'utf8');
const a='blocks/accordion.liquid';
const a1=read(sourceDir,a), a2=read(previewDir,a);
const aStart=a2.indexOf('{% unless closest.product.gift_card? and block_settings.hide_for_gift_cards %}');
const aEnd=a2.indexOf('{% endunless %}',aStart);
assert.ok(aStart>0 && aEnd>aStart);
const actualOuter=a1.slice(a1.indexOf('<div'),a1.indexOf('</div>')+6);
const conditional=a2.slice(aStart,aEnd+'{% endunless %}'.length);
assert.ok(conditional.includes(actualOuter));
const testAccordion=conditional.replace(actualOuter,'accordion-rendered');
const schema=JSON.parse(a2.split('{% schema %}')[1].split('{% endschema %}')[0]);
assert.equal(schema.settings.find(x=>x.id==='hide_for_gift_cards').default,false);
assert.equal(schema.settings.find(x=>x.id==='hide_for_gift_cards').label,'t:settings.hide_for_gift_cards');
for (const lang of ['en.default','de','fr']) {
  const file='locales/'+lang+'.schema.json';
  const parse=src=>JSON.parse(src.slice(src.indexOf('{')).split('\n').filter(line=>!line.trimStart().startsWith('//')).join('\n'));
  const originalLocale=parse(read(sourceDir,file));
  const previewLocale=parse(read(previewDir,file));
  assert.ok(previewLocale.settings.hide_for_gift_cards);
  delete previewLocale.settings.hide_for_gift_cards;
  assert.deepEqual(originalLocale,previewLocale);
}
for (const gift of [true,false]) {
  for (const enabled of [true,false,undefined]) {
    const html=render(testAccordion,{closest:{product:{'gift_card?':gift}},block_settings:{hide_for_gift_cards:enabled}});
    assert.equal(html.includes('accordion-rendered'),!(enabled&&gift));
    samples++;
  }
}
const mf='snippets/meta-tags.liquid', head=read(sourceDir,mf), nextHead=read(previewDir,mf);
const eventStart=head.indexOf("document.addEventListener('DOMContentLoaded',function()");
assert.ok(eventStart>0);
const jsStart=head.lastIndexOf('{%- if',eventStart);
const jsEnd=head.indexOf('{%- endif -%}',eventStart)+'{%- endif -%}'.length;
const originalFragment=head.slice(jsStart,jsEnd), newFragment=originalFragment.replace("== 'product'","== 'product' and product.gift_card? != true");
assert.equal(nextHead,head.replace(originalFragment,newFragment));
for (const page of ['product','collection']) {
  for (const gift of [true,false]) {
    const html=render(newFragment,{product:{'gift_card?':gift},request:{page_type:page}});
    assert.equal(html.includes('DOMContentLoaded'),page==='product'&&!gift);
    samples++;
  }
}
console.log(samples+' Liquid render cases passed. Product JSON, gift form, picker, opt-in accordion schema and fallback JS checked.');

