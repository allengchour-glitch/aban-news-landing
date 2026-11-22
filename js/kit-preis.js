/* aban news — hält Preis und Kauf-Link der Branchen-Kit-Kästen aktuell.
 *
 * Der Kasten (tools/add_kit_crosslink.py) trägt Preis und Stripe-Link bereits
 * fest im HTML, damit er ohne JavaScript funktioniert. Dieses Skript gleicht
 * beides nach dem Laden mit data/shop-products.json ab, damit eine
 * Preisänderung (automation/stripe_sync.py) sofort auf allen Seiten greift,
 * ohne dass der Generator neu laufen muss.
 */
(function () {
  var kaesten = document.querySelectorAll('[data-aban-kit][data-kit-slug]');
  if (!kaesten.length) return;
  fetch('/data/shop-products.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (liste) {
      if (!Array.isArray(liste)) return;
      Array.prototype.forEach.call(kaesten, function (kasten) {
        var slug = kasten.getAttribute('data-kit-slug');
        var treffer = liste.filter(function (x) { return x && x.slug === slug; });
        if (treffer.length !== 1) return;
        var p = treffer[0];
        var knopf = kasten.querySelector('[data-kit-kaufen]');
        if (!knopf) return;
        var titel = typeof p.title === 'string' && p.title.trim() ? p.title : 'Dieses Kit';
        // Ein ausdrücklich leeres Kaufziel ist ein bestätigter Rückzug. Den
        // alten Checkout dann genauso wie der Generator durch den Shop ersetzen.
        if (p.buy === '') {
          knopf.href = '/shop.html#kit-' + encodeURIComponent(slug);
          knopf.removeAttribute('target');
          knopf.removeAttribute('rel');
          knopf.textContent = titel + ' im Shop ansehen';
          kasten.setAttribute('aria-label', titel + ' im Shop ansehen');
        } else if (typeof p.buy === 'string' && p.buy.trim()
                   && typeof p.price === 'string' && p.price.trim()) {
          knopf.href = p.buy;
          knopf.rel = 'noopener';
          knopf.target = '_blank';
          knopf.textContent = titel + ' — ' + p.price;
          kasten.setAttribute('aria-label', titel + ' kaufen');
        }
      });
    })
    .catch(function () { /* Kasten bleibt mit den gebauten Werten stehen. */ });
})();
