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

  // ---------- Watchlist (localStorage, kein Tracking) ----------
  var WATCH_KEY = 'aban_markets_watch';
  function loadWatch() {
    try { return JSON.parse(localStorage.getItem(WATCH_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveWatch(w) { try { localStorage.setItem(WATCH_KEY, JSON.stringify(w)); } catch (e) {} }
  var watch = loadWatch();

  // ---------- i18n (DE/EN je nach <html lang>) ----------
  var LANG = (document.documentElement.lang || 'de').slice(0, 2) === 'en' ? 'en' : 'de';
  var T = {
    de: { krypto: 'Krypto', aktie: 'Aktie', conf: 'KI-Konfidenz', noNews: 'Aktuell keine News.',
          sources: 'Quellen: ', asof: 'Stand: ', cryptoLive: ' · Krypto live', ai: ' · KI: ',
          rate: 'Kurs: ', endval: 'Endwert ≈ ', paid: 'Eingezahlt', gain: 'Wertzuwachs', valueIn: 'Wert in ',
          unavailable: 'Marktdaten zurzeit nicht verfügbar.',
          stale: '⚠️ Daten evtl. veraltet (letzter Lauf vor über {h} h).' },
    en: { krypto: 'Crypto', aktie: 'Stock', conf: 'AI confidence', noNews: 'No news right now.',
          sources: 'Sources: ', asof: 'As of: ', cryptoLive: ' · crypto live', ai: ' · AI: ',
          rate: 'Rate: ', endval: 'Final value ≈ ', paid: 'Paid in', gain: 'Gain', valueIn: 'Value in ',
          unavailable: 'Market data currently unavailable.',
          stale: '⚠️ Data may be stale (last run over {h} h ago).' }
  }[LANG];

  // ---------- Währung (USD/CHF/EUR, localStorage) ----------
  var CUR_KEY = 'aban_markets_cur';
  var cur = (function () { try { return localStorage.getItem(CUR_KEY) || 'usd'; } catch (e) { return 'usd'; } })();
  function setCur(c) { cur = c; try { localStorage.setItem(CUR_KEY, c); } catch (e) {} }
  function rate() { return (state.fx && state.fx[cur]) || 1; }
  function fmtMoney(usdVal) {
    if (usdVal === null || usdVal === undefined || isNaN(usdVal)) return '—';
    return fmtPrice(usdVal * rate(), cur);
  }

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

  // Mini-Sparkline als Inline-SVG (CSP-safe, kein externes Lib).
  function buildSpark(values) {
    var W = 84, H = 26, pad = 2;
    if (!values || values.length < 2) return null;
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    var span = (max - min) || 1;
    var n = values.length;
    var pts = values.map(function (v, i) {
      var x = pad + (i / (n - 1)) * (W - 2 * pad);
      var y = pad + (1 - (v - min) / span) * (H - 2 * pad);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    var up = values[values.length - 1] >= values[0];
    var color = up ? 'var(--ok)' : 'var(--bear)';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.display = 'block';
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', color);
    poly.setAttribute('stroke-width', '1.6');
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(poly);
    return svg;
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
    // Gemerkte Werte zuerst, sonst Originalreihenfolge.
    var ordered = state.assets.slice().sort(function (a, b) {
      return (watch[b.id] ? 1 : 0) - (watch[a.id] ? 1 : 0);
    });
    ordered.forEach(function (a) {
      var tr = document.createElement('tr');
      if (watch[a.id]) tr.className = 'watched';

      var tdStar = el('td', 'starcell');
      var star = document.createElement('button');
      star.type = 'button';
      star.className = 'star' + (watch[a.id] ? ' on' : '');
      star.textContent = watch[a.id] ? '★' : '☆';
      star.setAttribute('aria-pressed', watch[a.id] ? 'true' : 'false');
      star.setAttribute('aria-label', a.name + ' merken');
      star.addEventListener('click', function () {
        if (watch[a.id]) { delete watch[a.id]; } else { watch[a.id] = 1; }
        saveWatch(watch);
        renderTable();
      });
      tdStar.appendChild(star);
      tr.appendChild(tdStar);

      var tdName = document.createElement('td');
      var nameLink = document.createElement('a');
      nameLink.href = '/maerkte/' + a.id + '.html';
      nameLink.className = 'asset-link';
      nameLink.appendChild(el('span', 'asset-name', a.name));
      nameLink.appendChild(el('span', 'asset-sym', a.symbol));
      tdName.appendChild(nameLink);
      tdName.appendChild(el('span', 'tag-type', a.type === 'crypto' ? T.krypto : T.aktie));
      tr.appendChild(tdName);

      var tdPrice = el('td', 'num');
      tdPrice.textContent = fmtMoney(a.price);
      tr.appendChild(tdPrice);

      var ch = fmtChange(a.change_24h);
      var tdCh = el('td', 'num');
      tdCh.appendChild(el('span', 'chg ' + ch.cls, ch.txt));
      tr.appendChild(tdCh);

      var tdSpark = el('td', 'spark');
      var spark = buildSpark(a.spark);
      if (spark) tdSpark.appendChild(spark);
      else tdSpark.textContent = '—';
      tr.appendChild(tdSpark);

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
        card.appendChild(el('p', 'cconf', T.conf + ': ' + Math.round(a.confidence * 100) + ' %'));
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
      ul.appendChild(el('li', null, T.noNews));
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
    p.appendChild(document.createTextNode(T.sources));
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
    var engine = data.ai_engine && data.ai_engine !== 'seed' ? T.ai + data.ai_engine : '';
    p.textContent = when ? (T.asof + when + engine + T.cryptoLive) : '';
    // Stale-Warnung: wenn der letzte Daten-Lauf > 26 h her ist.
    var warn = document.getElementById('staleWarn');
    if (warn && data.fetched_at) {
      var ageH = (Date.now() - new Date(data.fetched_at).getTime()) / 3.6e6;
      if (ageH > 26) {
        warn.textContent = T.stale.replace('{h}', Math.round(ageH));
        warn.style.display = 'block';
      } else { warn.style.display = 'none'; }
    }
  }

  // ---------- Live-Ticker ----------
  function tickerItem(a) {
    var span = el('span', 'tk');
    span.appendChild(el('span', 'tk-sym', a.symbol));
    span.appendChild(el('span', 'tk-px', fmtMoney(a.price)));
    var ch = fmtChange(a.change_24h);
    span.appendChild(el('span', 'tk-ch ' + ch.cls, ch.txt));
    return span;
  }
  function renderTicker() {
    var track = document.getElementById('tickerTrack');
    if (!track) return;
    track.innerHTML = '';
    if (!state.assets.length) return;
    // Inhalt doppelt anhängen → nahtlose Endlosschleife (-50% in CSS).
    for (var pass = 0; pass < 2; pass++) {
      state.assets.forEach(function (a) { track.appendChild(tickerItem(a)); });
    }
  }

  // ---------- Live-Umrechner ----------
  function initConverter() {
    var sel = document.getElementById('convAsset');
    var amt = document.getElementById('convAmount');
    var usd = document.getElementById('convUsd');
    var out = document.getElementById('convOut');
    if (!sel || !amt || !usd || !out) return;

    sel.innerHTML = '';
    state.assets.forEach(function (a) {
      var o = document.createElement('option');
      o.value = a.id; o.textContent = a.name + ' (' + a.symbol + ')';
      sel.appendChild(o);
    });

    function price() {
      var a = state.byId[sel.value];
      return a && typeof a.price === 'number' ? a.price : null;
    }
    function syncLabel() {
      var lab = document.getElementById('convCurLabel');
      if (lab) lab.textContent = T.valueIn + cur.toUpperCase();
    }
    function fromAmount() {
      syncLabel();
      var p = price(), n = parseFloat(amt.value);
      if (p === null || isNaN(n)) { usd.value = ''; out.textContent = '—'; return; }
      var v = n * p;                 // USD
      usd.value = (v * rate()).toFixed(2);
      var a = state.byId[sel.value];
      out.innerHTML = '';
      out.appendChild(document.createTextNode(
        n.toLocaleString(LANG === 'en' ? 'en' : 'de-CH') + ' ' + a.symbol + ' ≈ ' + fmtMoney(v)));
      var s = document.createElement('small');
      s.textContent = T.rate + fmtMoney(p) + ' / ' + a.symbol;
      out.appendChild(s);
    }
    function fromMoney() {
      var p = price(), n = parseFloat(usd.value);
      if (p === null || isNaN(n) || p === 0) { return; }
      var usdVal = n / rate();
      amt.value = (usdVal / p).toFixed(6);
      fromAmount();
    }
    sel.addEventListener('change', fromAmount);
    amt.addEventListener('input', fromAmount);
    usd.addEventListener('input', fromMoney);
    state.convUpdate = fromAmount; // bei Live-Refresh / Währungswechsel neu rechnen
    fromAmount();
  }

  // ---------- Sparplan-Rechner ----------
  function initSavingsCalc() {
    var m = document.getElementById('spMonth');
    var y = document.getElementById('spYears');
    var r = document.getElementById('spRate');
    var out = document.getElementById('spOut');
    if (!m || !y || !r || !out) return;
    function calc() {
      var month = parseFloat(m.value), years = parseFloat(y.value), rate = parseFloat(r.value);
      if (isNaN(month) || isNaN(years) || isNaN(rate) || years <= 0) { out.textContent = '—'; return; }
      var n = Math.round(years * 12);
      var i = (rate / 100) / 12;
      var fv = i === 0 ? month * n : month * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
      var paid = month * n;
      var gain = fv - paid;
      var fmt = function (x) {
        try { return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(x); }
        catch (e) { return Math.round(x) + ' CHF'; }
      };
      out.innerHTML = '';
      out.appendChild(document.createTextNode(T.endval + fmt(fv)));
      var s = document.createElement('small');
      s.textContent = T.paid + ' ' + fmt(paid) + ' · ' + T.gain + ' ' + fmt(gain);
      out.appendChild(s);
    }
    [m, y, r].forEach(function (inp) { inp.addEventListener('input', calc); });
    calc();
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
        if (changed) {
          renderTable();
          renderTicker();
          if (typeof state.convUpdate === 'function') state.convUpdate();
        }
      })
      .catch(function () { /* still: Snapshot bleibt stehen */ });
  }

  // ---------- Währungs-Umschalter ----------
  function initCurrency() {
    var box = document.getElementById('curSel');
    if (!box) return;
    var avail = state.fx || { usd: 1 };
    var btns = box.querySelectorAll('button[data-cur]');
    Array.prototype.forEach.call(btns, function (b) {
      var c = b.getAttribute('data-cur');
      if (!avail[c]) { b.disabled = true; return; }     // ohne FX-Rate ausgrauen
      b.classList.toggle('on', c === cur);
      b.setAttribute('aria-pressed', c === cur ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (!avail[c]) return;
        setCur(c);
        Array.prototype.forEach.call(btns, function (x) {
          var on = x.getAttribute('data-cur') === cur;
          x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderTable(); renderTicker();
        if (typeof state.convUpdate === 'function') state.convUpdate();
      });
    });
  }

  // ---------- Init ----------
  function init(data) {
    state.assets = (data.assets || []).slice();
    state.fx = data.fx || { usd: 1 };
    if (!state.fx[cur]) cur = 'usd';                    // gewählte Währung ohne Rate → USD
    state.byId = {};
    state.assets.forEach(function (a) { state.byId[a.id] = a; });
    initCurrency();
    renderTable();
    renderTicker();
    renderCards();
    renderNews(data.news);
    renderSources(data.quellen);
    setUpdated(data);
    initConverter();
    initSavingsCalc();
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
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted)">' + T.unavailable + '</td></tr>';
      }
    })
    .catch(function () {
      var tbody = document.getElementById('marketRows');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted)">' + T.unavailable + '</td></tr>';
    });
})();
