/* aban news — Lemon-Squeezy-Affiliate-Tracking.
   Bewusst NUR auf den kommerziellen Seiten (KI-Studio, Empfehlen, Start, Premium/Shop)
   eingebunden — die Newsletter-/Inhaltsseiten bleiben tracking-frei (Markenversprechen).
   Setzt die Affiliate-Zuordnung, wenn jemand über einen Affiliate-Link landet. */
(function () {
  try {
    window.lemonSqueezyAffiliateConfig = { store: "abannews" };
    var s = document.createElement('script');
    s.src = "https://lmsqueezy.com/affiliate.js";
    s.defer = true;
    document.head.appendChild(s);
  } catch (e) {}
})();
