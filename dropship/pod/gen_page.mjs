import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('/tmp/wunsch_raw.json','utf8'));
let prods = d.products.edges.map(e=>{
  const n=e.node;
  const name=(n.title||'').replace(/\s*[–-]\s*Selbst gestalten\s*$/i,'').trim();
  const amt=parseFloat(n.priceRangeV2.minVariantPrice.amount);
  const price = amt%1===0 ? `CHF ${amt}.–` : `CHF ${amt.toFixed(2)}`;
  return { name, handle:n.handle, img:n.featuredImage?.url||'', price, amt };
});
// Kuratierte Reihenfolge: relatable Bestseller zuerst
const order = ['klassisches-unisex-t-shirt','unisex-t-shirt','premium-hoodie','unisex-hoodie',
  'keramik-tasse','bio-jutebeutel','baumwolltasche-mit-langen-henkeln','dad-cap',
  'hardcase-iphone','transparente-iphone','edelstahl-trinkflasche','urban-umhangetasche',
  'alltags-umhangetasche','allover-stoffbeutel','kiss-cut-aufkleber','allover-rucksack',
  'allover-yoga-leggings','recycelter-unisex-allover-hoodie','recycelter-unisex-allover-pullover',
  'recycelte-allover-jogginghosen','unisex-allover-bomberjacke','kleid-mit-schlitz',
  'einteiliger-allover-badeanzug','boardshorts-mit-allover-druck','allover-sport-bh','baby-jersey-body'];
const rank=h=>{const i=order.findIndex(o=>h.startsWith(o));return i<0?999:i;};
prods.sort((a,b)=>rank(a.handle)-rank(b.handle));

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const card=p=>{
  const href='/products/'+encodeURIComponent(p.handle);
  return `<a class="lspod-card" href="${href}">
      <div class="lspod-imgwrap"><img loading="lazy" src="${p.img}" alt="${esc(p.name)} selbst gestalten"></div>
      <div class="lspod-info"><span class="lspod-name">${esc(p.name)}</span><span class="lspod-price">ab ${p.price}</span></div>
      <span class="lspod-go">Gestalten →</span>
    </a>`;
};

const html = `<div class="lspod">
<style>
.lspod{--gold:#c1922f;--ink:#16151a;--mut:#6b6b73;--bg:#faf8f5;--line:#ece7df;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--ink);max-width:1180px;margin:0 auto;line-height:1.5;}
.lspod *{box-sizing:border-box;}
.lspod a{text-decoration:none;color:inherit;}
.lspod-hero{text-align:center;padding:30px 18px 26px;}
.lspod-eyebrow{letter-spacing:.22em;font-size:12px;font-weight:700;color:var(--gold);margin:0 0 10px;text-transform:uppercase;}
.lspod-hero h2{font-size:clamp(28px,5vw,46px);line-height:1.05;margin:0 0 12px;font-weight:800;letter-spacing:-.01em;}
.lspod-hero .sub{font-size:clamp(15px,2.4vw,19px);color:var(--mut);max-width:620px;margin:0 auto 18px;}
.lspod-trust{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 16px;font-size:13px;color:var(--ink);margin:0 auto 22px;font-weight:600;}
.lspod-trust span{background:#fff;border:1px solid var(--line);border-radius:999px;padding:6px 13px;}
.lspod-cta{display:inline-block;background:var(--ink);color:#fff;font-weight:700;font-size:16px;padding:14px 30px;border-radius:999px;transition:transform .15s,background .2s;}
.lspod-cta:hover{background:var(--gold);transform:translateY(-2px);}
.lspod-sech{text-align:center;font-size:clamp(20px,3.4vw,30px);font-weight:800;margin:6px 0 4px;}
.lspod-secsub{text-align:center;color:var(--mut);font-size:15px;margin:0 0 22px;}
.lspod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:14px;padding:8px 14px 6px;}
.lspod-card{position:relative;background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;transition:transform .15s,box-shadow .2s,border-color .2s;}
.lspod-card:hover{transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.10);border-color:var(--gold);}
.lspod-imgwrap{aspect-ratio:1/1;background:#f4f1ec;overflow:hidden;}
.lspod-imgwrap img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s;}
.lspod-card:hover .lspod-imgwrap img{transform:scale(1.05);}
.lspod-info{padding:11px 13px 6px;display:flex;flex-direction:column;gap:3px;flex:1;}
.lspod-name{font-weight:700;font-size:14.5px;line-height:1.25;}
.lspod-price{color:var(--mut);font-size:13.5px;}
.lspod-go{margin:0 13px 13px;align-self:flex-start;font-size:12.5px;font-weight:800;color:var(--gold);letter-spacing:.02em;}
.lspod-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:14px;max-width:920px;margin:0 auto;}
.lspod-step{background:#fff;border:1px solid var(--line);border-radius:16px;padding:22px 18px;text-align:center;}
.lspod-num{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:50%;background:var(--gold);color:#fff;font-weight:800;font-size:19px;margin-bottom:10px;}
.lspod-step b{display:block;font-size:16px;margin-bottom:4px;}
.lspod-step p{margin:0;color:var(--mut);font-size:14px;}
.lspod-band{background:var(--ink);color:#fff;border-radius:18px;padding:22px 18px;margin:26px 14px;display:flex;flex-wrap:wrap;justify-content:center;gap:14px 30px;text-align:center;}
.lspod-band div{min-width:140px;}
.lspod-band b{display:block;font-size:22px;color:var(--gold);}
.lspod-band span{font-size:13.5px;opacity:.88;}
.lspod-section{padding:26px 14px;}
.lspod-faq{max-width:760px;margin:0 auto;}
.lspod-faq details{background:#fff;border:1px solid var(--line);border-radius:12px;margin-bottom:10px;padding:2px 16px;}
.lspod-faq summary{cursor:pointer;font-weight:700;padding:13px 0;list-style:none;font-size:15.5px;}
.lspod-faq summary::-webkit-details-marker{display:none;}
.lspod-faq summary::after{content:'+';float:right;color:var(--gold);font-weight:800;font-size:20px;line-height:1;}
.lspod-faq details[open] summary::after{content:'–';}
.lspod-faq p{margin:0 0 14px;color:var(--mut);font-size:14.5px;}
.lspod-final{text-align:center;background:var(--bg);border:1px solid var(--line);border-radius:20px;padding:34px 18px;margin:10px 14px 6px;}
.lspod-final h3{font-size:clamp(22px,3.6vw,32px);font-weight:800;margin:0 0 8px;}
.lspod-final p{color:var(--mut);margin:0 0 18px;}
@media(max-width:560px){.lspod-steps{grid-template-columns:1fr;}.lspod-grid{grid-template-columns:repeat(2,1fr);gap:11px;}}
</style>

<section class="lspod-hero">
  <p class="lspod-eyebrow">LuxeStyle · Print on Demand</p>
  <h2>Dein Design. Dein Teil.</h2>
  <p class="sub">Wähle ein Produkt, lade dein Motiv hoch – wir drucken &amp; liefern. Spruch, Foto oder Logo. Keine Mindestmenge.</p>
  <div class="lspod-trust"><span>🇨🇭 Gratis Versand ab CHF 65</span><span>⚡ On-Demand produziert</span><span>📦 5–10 Tage</span><span>↩️ 30 Tage Rückgabe</span></div>
  <a class="lspod-cta" href="#produkte">Jetzt Produkt wählen ↓</a>
</section>

<section id="produkte" class="lspod-section" style="padding-top:8px;">
  <h3 class="lspod-sech">Wähle dein Produkt</h3>
  <p class="lspod-secsub">${prods.length} Produkte – ab CHF 3. Tippe auf eins, lade dein Design hoch.</p>
  <div class="lspod-grid">
    ${prods.map(card).join('\n    ')}
  </div>
</section>

<section class="lspod-section" style="background:var(--bg);border-radius:20px;margin:8px 0;">
  <h3 class="lspod-sech">So einfach geht's</h3>
  <p class="lspod-secsub">In unter 2 Minuten zu deinem Unikat.</p>
  <div class="lspod-steps">
    <div class="lspod-step"><span class="lspod-num">1</span><b>Produkt wählen</b><p>T-Shirt, Hoodie, Tasse, Tasche, Handyhülle &amp; mehr.</p></div>
    <div class="lspod-step"><span class="lspod-num">2</span><b>Design hochladen</b><p>Spruch, Foto, Motiv oder Logo – direkt im Editor platzieren.</p></div>
    <div class="lspod-step"><span class="lspod-num">3</span><b>Vorschau &amp; bestellen</b><p>Live-Vorschau ansehen, bestellen – wir drucken on-demand.</p></div>
  </div>
</section>

<div class="lspod-band">
  <div><b>120+</b><span>Produkte &amp; Farben</span></div>
  <div><b>0</b><span>Mindestmenge</span></div>
  <div><b>5–10</b><span>Tage Lieferzeit</span></div>
  <div><b>🇨🇭</b><span>Schweizer Shop · TWINT</span></div>
</div>

<section class="lspod-section">
  <h3 class="lspod-sech">Häufige Fragen</h3>
  <div class="lspod-faq">
    <details open><summary>Wie lade ich mein Design hoch?</summary><p>Wähle ein Produkt, öffne den Gestalten-Editor und lade dein Bild, Foto oder Logo hoch. Du siehst sofort eine Live-Vorschau und kannst Grösse &amp; Position anpassen.</p></details>
    <details><summary>Gibt es eine Mindestbestellmenge?</summary><p>Nein. Du kannst ab einem einzigen Stück bestellen – jedes Teil wird on-demand für dich produziert.</p></details>
    <details><summary>Wie lange dauert die Lieferung?</summary><p>Produktion &amp; Versand dauern zusammen ca. 5–10 Werktage. Gratis-Versand ab CHF 65.</p></details>
    <details><summary>Welche Dateien funktionieren am besten?</summary><p>PNG oder JPG in hoher Auflösung (mind. 1500 px). Für scharfe Drucke empfehlen wir transparente PNGs bei Logos/Motiven.</p></details>
    <details><summary>Kann ich zurückgeben?</summary><p>Bei Druckfehlern oder Mängeln ersetzen wir kostenlos. Es gilt unser 30-Tage-Rückgaberecht.</p></details>
  </div>
</section>

<section class="lspod-final">
  <h3>Bereit? Gestalte dein Unikat.</h3>
  <p>Über ${prods.length} Produkte warten auf dein Design – ab CHF 3.</p>
  <a class="lspod-cta" href="#produkte">Produkt wählen ↑</a>
</section>
</div>`;

fs.writeFileSync('/tmp/page_body.html', html);
console.log('HTML geschrieben:', html.length, 'Zeichen,', prods.length, 'Produktkarten');
console.log('Reihenfolge (erste 6):', prods.slice(0,6).map(p=>p.name).join(' · '));
