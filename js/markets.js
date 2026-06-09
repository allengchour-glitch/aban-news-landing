/* aban news — Märkte (Krypto & Aktien).
 * Vanilla JS, CSP-konform (keine inline-Handler, kein eval).
 * 1) Lädt data/markets.json (Aktien + News + KI-Sentiment vom letzten CI-Lauf).
 * 2) Aktualisiert Krypto-Kurse live über die CoinGecko-Free-API (kein Key nötig).
 * Bricht nie hart ab: ohne JSON oder ohne Netz bleibt die letzte bekannte Anzeige stehen.
 */
(function () {
  'use strict';

  var DATA_URL = '/data/markets.json';
  var CG_URL = 'https://api.coingecko.com/api/v3/coins/markets';
  var REFRESH_MS = 90000; // 90 s

  var state = { assets: [], byId: {} };

  // ---------- Helfer ----------
  function fmtPrice(v, cur) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var c = (cur || 'usd').toUpperCase();
    var digits = v >= 1000 ? 0 : (v >= 1 ? 2 : 4);
    try {
      return new Intl.NumberFormat('de-CH', {
        style: 'currency', currency: c, maximumFractionDigits: digits, minimumFractionDigits: digits
      }).format(v);
    } catch (e) {
      return v.toFixed(digits) + ' ' + c;
    }
  }

  function fmtChange(v) {
    if (v === null || v === undefined || isNaN(v)) return { txt: '—', cls: 'flat' };
    var cls = v > 0.04 ? 'up' : (v < -0.04 ? 'down' : 'flat');
    var sign = v > 0 ? '+' : '';
    return { txt: sign + v.toFixed(2) + ' %', cls: cls };
  }

  function sentimentLabel(s) {
    if (s === 'bullish') return 'Bullish';
    if (s === 'bearish') return 'Bearish';
    return 'Neutral';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  // ---------- Render: Tabelle ----------
  function renderTable() {
    var tbody = document.getElementById('marketRows');
    if (!tbody) return;
    tbody.innerHTML = '';
    state.assets.forEach(function (a) {
      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      tdName.appendChild(el('span', 'asset-name', a.name));
      tdName.appendChild(el('span', 'asset-sym', a.symbol));
      tdName.appendChild(el('span', 'tag-type', a.type === 'crypto' ? 'Krypto' : 'Aktie'));
      tr.appendChild(tdName);

      var tdPrice = el('td', 'num');
      tdPrice.textContent = fmtPrice(a.price, a.currency);
      tr.appendChild(tdPrice);

      var ch = fmtChange(a.change_24h);
      var tdCh = el('td', 'num');
      tdCh.appendChild(el('span', 'chg ' + ch.cls, ch.txt));
      tr.appendChild(tdCh);

      var tdSent = document.createElement('td');
      var sent = a.sentiment || 'neutral';
      tdSent.appendChild(el('span', 'badge ' + sent, sentimentLabel(sent)));
      tr.appendChild(tdSent);

      tbody.appendChild(tr);
    });
  }

  // ---------- Render: Signal-Karten ----------
  function renderCards() {
    var wrap = document.getElementById('signalCards');
    if (!wrap) return;
    wrap.innerHTML = '';
    state.assets.forEach(function (a) {
      var card = el('div', 'card');

      var head = el('div', 'chead');
      head.appendChild(el('span', 'cname', a.name + ' · ' + a.symbol));
      var sent = a.sentiment || 'neutral';
      head.appendChild(el('span', 'badge ' + sent, sentimentLabel(sent)));
      card.appendChild(head);

      if (a.signal) card.appendChild(el('p', 'csignal', a.signal));
      card.appendChild(el('p', 'crat', a.rationale || ''));

      if (typeof a.confidence === 'number' && a.confidence > 0) {
        card.appendChild(el('p', 'cconf', 'KI-Konfidenz: ' + Math.round(a.confidence * 100) + ' %'));
      }
      wrap.appendChild(card);
    });
  }

  // ---------- Render: News ----------
  function renderNews(news) {
    var ul = document.getElementById('newsFeed');
    if (!ul) return;
    ul.innerHTML = '';
    if (!news || !news.length) {
      ul.appendChild(el('li', null, 'Aktuell keine News.'));
      return;
    }
    news.forEach(function (n) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = n.url || '#';
      a.textContent = n.title || 'Ohne Titel';
      a.target = '_blank';
      a.rel = 'noopener';
      li.appendChild(a);

      var meta = el('div', 'meta');
      if (n.source) meta.appendChild(el('span', null, n.source));
      if (n.datum) meta.appendChild(el('span', null, '· ' + n.datum));
      if (n.sentiment) meta.appendChild(el('span', 'badge ' + n.sentiment, sentimentLabel(n.sentiment)));
      li.appendChild(meta);
      ul.appendChild(li);
    });
  }

  function renderSources(quellen) {
    var p = document.getElementById('sources');
    if (!p) return;
    p.innerHTML = '';
    if (!quellen || !quellen.length) return;
    p.appendChild(document.createTextNode('Quellen: '));
    quellen.forEach(function (q, i) {
      var a = document.createElement('a');
      a.href = q.url; a.textContent = q.titel; a.target = '_blank'; a.rel = 'noopener';
      p.appendChild(a);
      if (i < quellen.length - 1) p.appendChild(document.createTextNode(' · '));
    });
  }

  function setUpdated(data) {
    var p = document.getElementById('lastUpdated');
    if (!p) return;
    var when = data.last_updated || '';
    var engine = data.ai_engine && data.ai_engine !== 'seed' ? ' · KI: ' + data.ai_engine : '';
    p.textContent = when ? ('Stand: ' + when + engine + ' · Krypto live') : '';
  }

  // ---------- Live-Krypto via CoinGecko ----------
  function cryptoIds() {
    return state.assets.filter(function (a) { return a.type === 'crypto' && a.coingecko_id; })
      .map(function (a) { return a.coingecko_id; });
  }

  function fetchCrypto() {
    var ids = cryptoIds();
    if (!ids.length) return;
    var url = CG_URL + '?vs_currency=usd&ids=' + encodeURIComponent(ids.join(',')) +
      '&price_change_percentage=24h';
    fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rows) {
        if (!rows || !rows.length) return;
        var changed = false;
        rows.forEach(function (row) {
          state.assets.forEach(function (a) {
            if (a.coingecko_id === row.id) {
              a.price = row.current_price;
              a.change_24h = row.price_change_percentage_24h;
              a.currency = 'usd';
              changed = true;
            }
          });
        });
        if (changed) renderTable();
      })
      .catch(function () { /* still: Snapshot bleibt stehen */ });
  }

  // ---------- Init ----------
  function init(data) {
    state.assets = (data.assets || []).slice();
    renderTable();
    renderCards();
    renderNews(data.news);
    renderSources(data.quellen);
    setUpdated(data);
    // Live-Krypto: sofort + periodisch
    fetchCrypto();
    setInterval(fetchCrypto, REFRESH_MS);
  }

  fetch(DATA_URL, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (data) init(data);
      else {
        var tbody = document.getElementById('marketRows');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">Marktdaten zurzeit nicht verfügbar.</td></tr>';
      }
    })
    .catch(function () {
      var tbody = document.getElementById('marketRows');
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">Marktdaten zurzeit nicht verfügbar.</td></tr>';
    });
})();
