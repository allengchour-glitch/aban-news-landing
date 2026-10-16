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
      if (!liste || !liste.length) return;
      Array.prototype.forEach.call(kaesten, function (kasten) {
        var slug = kasten.getAttribute('data-kit-slug');
        var p = liste.filter(function (x) { return x.slug === slug; })[0];
        if (!p) return;
        var knopf = kasten.querySelector('[data-kit-kaufen]');
        if (knopf && p.buy && p.price) {
          knopf.href = p.buy;
          knopf.rel = 'noopener';
          knopf.target = '_blank';
          knopf.textContent = p.title + ' — ' + p.price;
        }
      });
    })
    .catch(function () { /* Kasten bleibt mit den gebauten Werten stehen. */ });
})();
