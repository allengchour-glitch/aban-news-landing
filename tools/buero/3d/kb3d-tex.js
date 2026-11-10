/* KB3D Texturen: alles wird zur Laufzeit gezeichnet (Canvas), nichts wird geladen.
   Jede Funktion gibt ein Canvas zurück. Grössen sind Zweierpotenzen, damit Mip-Maps und Wiederholung gehen. */
(function (K) {
  'use strict';
  var T = {};
  var PI = Math.PI;

  function mk(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    return { c: c, g: c.getContext('2d') };
  }
  function rng(seed) {
    var s = (seed >>> 0) || 2463534242;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }
  function rgb(r, g, b) { return 'rgb(' + Math.round(Math.min(255, r * 255)) + ',' + Math.round(Math.min(255, g * 255)) + ',' + Math.round(Math.min(255, b * 255)) + ')'; }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function hashStr(s) {
    var x = 7;
    for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) >>> 0;
    return x;
  }
  var FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  T.infowand = function (info) {
    var o = mk(1024, 512), g = o.g;
    g.fillStyle='#0b1729'; g.fillRect(0,0,1024,512);
    var grad=g.createLinearGradient(0,0,1024,512);grad.addColorStop(0,'#153c51');grad.addColorStop(1,'#16243c');g.fillStyle=grad;g.fillRect(12,12,1000,488);
    g.fillStyle='#84e5de';g.font='bold 26px '+FONT;g.fillText('KI-BÜRO / ZENTRALE',48,66);
    g.fillStyle='#f3f8ff';g.font='bold 46px '+FONT;g.fillText('Deine Aufgaben im Blick.',48,133);
    ['01  SHOP & PROJEKTE','02  SOCIAL MEDIA'].forEach(function(t,i){g.fillStyle='#254759';g.fillRect(48+i*478,173,450,145);g.fillStyle='#a5e9df';g.font='bold 22px '+FONT;g.fillText(t,68+i*478,214);g.fillStyle='#edf7fa';g.font='28px '+FONT;g.fillText(i===0?'Sortiment + Fortschritt':'Planung + Ergebnisse',68+i*478,274);});
    g.fillStyle='#eff8fa';g.font='27px '+FONT;g.fillText(info || 'Noch kein Messstand geladen',48,375);
    g.fillStyle='#9cb8c8';g.font='22px '+FONT;g.fillText('Raum wählen und den nächsten Schritt öffnen.',48,446);
    return o.c;
  };
  T.geldwand=function(info){
    var o=mk(1024,512),g=o.g,grad=g.createLinearGradient(0,0,1024,512);
    grad.addColorStop(0,'#102e3c');grad.addColorStop(1,'#1e4949');g.fillStyle=grad;g.fillRect(0,0,1024,512);
    g.fillStyle='#9af0d4';g.font='bold 26px '+FONT;g.fillText('CHEFBÜRO / FINANZMONITOR',42,64);
    g.fillStyle='#f0faf7';g.font='bold 43px '+FONT;g.fillText('Umsatz. Ausgaben. Ergebnis.',42,132);
    var werte=info&&info.werte||['Unbekannt','Unbekannt','Unbekannt'];
    [['UMSATZ',werte[0]],['BEKANNTE AUSGABEN',werte[1]],['GEWINN',werte[2]]].forEach(function(pair,i){
      g.fillStyle='#244b52';rr(g,42+i*318,184,300,154,18);g.fill();g.fillStyle='#a6e5d0';g.font='bold 19px '+FONT;g.fillText(pair[0],58+i*318,223);g.fillStyle='#f1faf5';g.font='22px '+FONT;g.fillText(pair[1],58+i*318,285);
    });
    g.fillStyle='#c3dfd6';g.font='24px '+FONT;g.fillText(info&&info.zeitraum||'Private Datenquelle noch nicht geladen',42,405);
    g.font='20px '+FONT;g.fillText('Antippen für die Tabelle · Fehlende Kosten bleiben unbekannt',42,463);return o.c;
  };
  /* ---------- Liveboard: grosser Wandmonitor je Raum, Zahlen kommen nur aus den Zeilen ----------
     model = { titel, zeit, stand, farben, zaehler:{gruen,gelb,rot,du,alt}, kpi:{wert,label}|null,
               zeilen:[{ name, state, text, frisch (0..1 oder null) }] }   (null = noch keine Daten) */
  var LB_FARBE = { gruen: '#2f9e5b', gelb: '#d99a1b', rot: '#e04b4b', du: '#4f86f0', alt: '#8b949e' };
  var LB_WORT = { gruen: 'Läuft', gelb: 'Prüfen', rot: 'Steht', du: 'Für dich', alt: 'Alt' };
  var LB_ZUSTAENDE = ['gruen', 'gelb', 'rot', 'du', 'alt'];
  function lbFit(g, text, maxW) {
    text = String(text == null ? '' : text);
    if (g.measureText(text).width <= maxW) return text;
    while (text.length > 1 && g.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text + '…';
  }
  /* Lampe: gleiche Formen wie die Markierungen im Raum (Kreis, Dreieck, Quadrat, Raute, Ring). */
  function lbLampe(g, state, x, y, r, farbe) {
    g.fillStyle = farbe; g.strokeStyle = farbe;
    g.beginPath();
    if (state === 'gruen') { g.arc(x, y, r, 0, PI * 2); g.fill(); return; }
    if (state === 'gelb') { g.moveTo(x, y - r * 1.1); g.lineTo(x + r * 1.05, y + r * 0.8); g.lineTo(x - r * 1.05, y + r * 0.8); g.closePath(); g.fill(); return; }
    if (state === 'rot') { g.rect(x - r * 0.9, y - r * 0.9, r * 1.8, r * 1.8); g.fill(); return; }
    if (state === 'du') { g.moveTo(x, y - r * 1.15); g.lineTo(x + r * 0.95, y); g.lineTo(x, y + r * 1.15); g.lineTo(x - r * 0.95, y); g.closePath(); g.fill(); return; }
    g.lineWidth = Math.max(2, r * 0.38); g.arc(x, y, r * 0.8, 0, PI * 2); g.stroke();
  }
  function lbKopf(g, kicker, titel, zeit, farben, ins) {
    ins = ins || 0;           // Randstreifen innen: Nachbarwände verdecken beim Zentralmonitor den Rand des Bildes
    var grad = g.createLinearGradient(0, 0, 1024, 512); grad.addColorStop(0, '#0f2a3d'); grad.addColorStop(1, '#16213a');
    g.fillStyle = '#08121f'; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = grad; rr(g, 8, 8, 1008, 496, 18); g.fill();
    g.fillStyle = '#7ad6c4'; g.font = 'bold 17px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillText(kicker, 48 + ins, 44);
    g.fillStyle = '#f3f8ff'; g.font = 'bold 44px ' + FONT; g.fillText(lbFit(g, titel, 560), 48 + ins, 92);
    // Uhr und «live»-Punkt
    g.textAlign = 'right';
    g.fillStyle = '#a5e9df'; g.font = 'bold 16px ' + FONT; g.fillText('LIVE', 976 - ins, 38);
    g.fillStyle = farben.gruen; g.beginPath(); g.arc(976 - ins - g.measureText('LIVE').width - 14, 33, 6, 0, PI * 2); g.fill();
    g.fillStyle = '#f3f8ff'; g.font = 'bold 44px ' + FONT; g.fillText(zeit || '--:--', 976 - ins, 82);
    g.fillStyle = '#9cb8c8'; g.font = '16px ' + FONT; g.fillText('Schweizer Zeit', 976 - ins, 103);
    g.textAlign = 'left';
  }
  T.liveboard = function (m) {
    var o = mk(1024, 512), g = o.g, farben = Object.assign({}, LB_FARBE, m && m.farben || {}), i;
    lbKopf(g, 'LIVEBOARD', m ? m.titel : 'Liveboard', m && m.zeit, farben);
    if (!m) {
      g.fillStyle = '#9cb8c8'; g.font = '28px ' + FONT; g.fillText('Wartet auf die Zeilen dieses Raums …', 48, 250);
      return o.c;
    }
    // Sonder-Kennzahl (zum Beispiel offene Bestellungen) als Plakette neben der Uhr
    if (m.kpi) {
      g.fillStyle = 'rgba(122,214,196,0.16)'; rr(g, 560, 52, 230, 58, 14); g.fill();
      g.fillStyle = '#f3f8ff'; g.font = 'bold 38px ' + FONT; g.textAlign = 'left'; g.fillText(String(m.kpi.wert), 576, 95);
      var nw = g.measureText(String(m.kpi.wert)).width;
      g.fillStyle = '#a5e9df'; g.font = '15px ' + FONT;
      g.fillText(lbFit(g, m.kpi.label, 790 - 576 - nw - 20), 576 + nw + 12, 94);
    }
    // Fünf Zähler
    var tw = 176, th = 78, ty = 112;
    for (i = 0; i < 5; i++) {
      var st = LB_ZUSTAENDE[i], tx = 48 + i * (tw + 12), n = (m.zaehler && m.zaehler[st]) || 0;
      g.fillStyle = 'rgba(255,255,255,0.075)'; rr(g, tx, ty, tw, th, 14); g.fill();
      g.fillStyle = farben[st]; rr(g, tx, ty + 10, 6, th - 20, 3); g.fill();
      g.fillStyle = n > 0 || st === 'gruen' ? '#f3f8ff' : '#7f93a3'; g.font = 'bold 50px ' + FONT; g.textAlign = 'left'; g.fillText(String(n), tx + 22, ty + 52);
      g.fillStyle = '#b5cad6'; g.font = '18px ' + FONT; g.fillText(LB_WORT[st], tx + 22, ty + 72);
      lbLampe(g, st, tx + tw - 28, ty + 26, 9, farben[st]);
    }
    // Zeilen
    var zeilen = m.zeilen || [], y0 = 216, zh = 36, max = 7;
    g.fillStyle = '#7ad6c4'; g.font = 'bold 16px ' + FONT; g.fillText('ABLAUF', 82, y0 - 6); g.fillText('LETZTES EREIGNIS', 452, y0 - 6); g.fillText('FRISCHE', 840, y0 - 6);
    for (i = 0; i < Math.min(max, zeilen.length); i++) {
      var z = zeilen[i], y = y0 + 6 + i * zh, c = farben[z.state] || farben.alt;
      if (i % 2 === 0) { g.fillStyle = 'rgba(255,255,255,0.045)'; rr(g, 40, y - 2, 944, zh - 2, 8); g.fill(); }
      lbLampe(g, z.state, 62, y + zh / 2 - 2, 10, c);
      g.fillStyle = '#f3f8ff'; g.font = 'bold 25px ' + FONT; g.textAlign = 'left'; g.fillText(lbFit(g, z.name, 355), 84, y + 27);
      g.fillStyle = '#b5cad6'; g.font = '21px ' + FONT; g.fillText(lbFit(g, z.text || '', 370), 452, y + 27);
      // Frische-Balken: voll = eben gemessen, leer = Messung ist so alt wie die Frist
      g.fillStyle = 'rgba(255,255,255,0.12)'; rr(g, 840, y + 12, 130, 12, 6); g.fill();
      if (z.frisch != null) {
        var f = Math.max(0, Math.min(1, z.frisch));
        g.fillStyle = f > 0.5 ? farben.gruen : f > 0.2 ? farben.gelb : farben.rot;
        if (f > 0.02) { rr(g, 840, y + 12, Math.max(12, 130 * f), 12, 6); g.fill(); }
      } else { g.fillStyle = '#7f93a3'; g.font = '15px ' + FONT; g.fillText('kein Alter', 846, y + 24); }
    }
    g.fillStyle = '#8fa6b5'; g.font = '16px ' + FONT; g.textAlign = 'left';
    g.fillText(m.stand ? 'Messstand ' + m.stand + ' · Lampen und Balken sind Messwerte, kein Livesignal' : 'Messstand unbekannt', 48, 492);
    // Mehr Zeilen als Platz: der Hinweis steht rechts auf der Fusszeile (unter den Zeilen ist kein Platz mehr)
    if (zeilen.length > max) { g.fillStyle = '#9cb8c8'; g.textAlign = 'right'; g.fillText('+ ' + (zeilen.length - max) + ' weitere Zeilen im Raum', 976, 492); g.textAlign = 'left'; }
    return o.c;
  };
  /* Zentralmonitor: alle Räume nebeneinander. model = { zeit, stand, farben, summe:{...}, n, raeume:[{ titel, n, zaehler }] } */
  T.liveboardUebersicht = function (m) {
    var o = mk(1024, 512), g = o.g, farben = Object.assign({}, LB_FARBE, m && m.farben || {}), i, k;
    lbKopf(g, 'ZENTRALMONITOR', 'Alle Räume im Blick', m && m.zeit, farben, 28);
    if (!m) { g.fillStyle = '#9cb8c8'; g.font = '28px ' + FONT; g.fillText('Wartet auf die Zeilen des Büros …', 76, 250); return o.c; }
    var raeume = (m.raeume || []).slice(0, 7), tw = 209, th = 168, gap = 12, x0 = 76, y0 = 120;   // Rand 76 px: die Wände der Nachbarräume verdecken je nach Kamera bis zu 55 px
    function kachel(idx, titel, zaehler, n, gross) {
      var cx = x0 + (idx % 4) * (tw + gap), cy = y0 + Math.floor(idx / 4) * (th + gap), j, summe = 0;
      g.fillStyle = gross ? 'rgba(122,214,196,0.15)' : 'rgba(255,255,255,0.075)'; rr(g, cx, cy, tw, th, 16); g.fill();
      g.fillStyle = '#f3f8ff'; g.font = 'bold 21px ' + FONT; g.textAlign = 'left'; g.fillText(lbFit(g, titel, tw - 24), cx + 16, cy + 36);
      g.fillStyle = '#b5cad6'; g.font = '16px ' + FONT; g.fillText(n + (n === 1 ? ' Eintrag' : ' Einträge'), cx + 16, cy + 60);
      for (j = 0; j < 5; j++) summe += zaehler[LB_ZUSTAENDE[j]] || 0;
      // Balken: Anteile der fünf Zustände
      var bx = cx + 16, bw = tw - 32, by = cy + 76, off = 0;
      g.fillStyle = 'rgba(255,255,255,0.12)'; rr(g, bx, by, bw, 14, 7); g.fill();
      if (summe > 0) {
        g.save(); rr(g, bx, by, bw, 14, 7); g.clip();
        for (j = 0; j < 5; j++) {
          var cnt = zaehler[LB_ZUSTAENDE[j]] || 0; if (!cnt) continue;
          var w = bw * cnt / summe; g.fillStyle = farben[LB_ZUSTAENDE[j]]; g.fillRect(bx + off, by, w + 0.5, 14); off += w;
        }
        g.restore();
      }
      // Zahlen mit Lampen
      for (j = 0; j < 5; j++) {
        var st = LB_ZUSTAENDE[j], px = cx + 16 + (j % 3) * 66, py = cy + 122 + Math.floor(j / 3) * 34;
        lbLampe(g, st, px + 8, py - 6, 7, farben[st]);
        g.fillStyle = (zaehler[st] || 0) > 0 ? '#f3f8ff' : '#6f8394'; g.font = 'bold 22px ' + FONT; g.fillText(String(zaehler[st] || 0), px + 22, py);
      }
    }
    for (i = 0; i < raeume.length; i++) kachel(i, raeume[i].titel, raeume[i].zaehler || {}, raeume[i].n || 0, false);
    kachel(7, 'Alle zusammen', m.summe || {}, m.n || 0, true);
    g.fillStyle = '#8fa6b5'; g.font = '16px ' + FONT; g.textAlign = 'left';
    g.fillText(m.stand ? 'Messstand ' + m.stand + ' · Antippen: grosse Ansicht' : 'Messstand unbekannt', 76, 492);
    return o.c;
  };
  T.rng = rng; T.mk = mk; T.rr = rr; T.hashStr = hashStr; T.FONT = FONT;

  /* ---------- Böden ---------- */
  T.parquet = function (base, seed) {
    var o = mk(256, 256), g = o.g, r = rng(seed || 3), b = K.col(base);
    for (var row = 0; row < 8; row++) {
      var y = row * 32, off = (row % 2) * 64;
      for (var x = -64; x < 256; x += 128) {
        var f = 0.88 + r() * 0.22;
        g.fillStyle = rgb(b[0] * f, b[1] * f, b[2] * f);
        g.fillRect(x + off, y, 128, 32);
        g.fillStyle = 'rgba(0,0,0,0.06)';
        for (var k = 0; k < 4; k++) g.fillRect(x + off + r() * 100, y + 4 + r() * 22, 18 + r() * 34, 1);
        g.fillStyle = 'rgba(0,0,0,0.22)';
        g.fillRect(x + off + 127, y, 1, 32);
      }
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.fillRect(0, y + 31, 256, 1);
    }
    return o.c;
  };
  T.concrete = function (base, seed) {
    var o = mk(256, 256), g = o.g, r = rng(seed || 5), b = K.col(base);
    g.fillStyle = rgb(b[0], b[1], b[2]); g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 2600; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,' + (0.02 + r() * 0.06) + ')' : 'rgba(255,255,255,' + (0.03 + r() * 0.07) + ')';
      g.fillRect(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 3);
    }
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 0, 256, 2); g.fillRect(0, 128, 256, 2); g.fillRect(0, 0, 2, 256); g.fillRect(128, 0, 2, 256);
    return o.c;
  };
  T.carpet = function (base, seed, line) {
    var o = mk(256, 256), g = o.g, r = rng(seed || 9), b = K.col(base);
    g.fillStyle = rgb(b[0], b[1], b[2]); g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 3200; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.05)';
      g.fillRect(r() * 256, r() * 256, 2, 2);
    }
    g.fillStyle = line || 'rgba(120,200,255,0.16)';
    g.fillRect(0, 0, 256, 2); g.fillRect(0, 128, 256, 2); g.fillRect(0, 0, 2, 256); g.fillRect(128, 0, 2, 256);
    return o.c;
  };
  T.tiles = function (base, seed) {
    var o = mk(256, 256), g = o.g, r = rng(seed || 11), b = K.col(base);
    for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
      var f = 0.94 + r() * 0.08;
      g.fillStyle = rgb(b[0] * f, b[1] * f, b[2] * f); g.fillRect(x * 64, y * 64, 64, 64);
    }
    g.fillStyle = 'rgba(0,0,0,0.14)';
    for (var i = 0; i < 4; i++) { g.fillRect(i * 64, 0, 1.5, 256); g.fillRect(0, i * 64, 256, 1.5); }
    return o.c;
  };

  /* ---------- Bildschirme (128x128, 'code' 128x256 für Lauftext) ---------- */
  function chrome(g, w, title) {
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(0, 0, w, 11);
    var cs = ['#ff5f57', '#febc2e', '#28c840'];
    for (var i = 0; i < 3; i++) { g.fillStyle = cs[i]; g.beginPath(); g.arc(7 + i * 9, 5.5, 2.4, 0, 7); g.fill(); }
    if (title) { g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = 'bold 7px ' + FONT; g.fillText(title, 40, 8.5); }
  }
  T.screen = function (kind, seed) {
    var tall = kind === 'code';
    var o = mk(128, tall ? 256 : 128), g = o.g, r = rng(seed || 7), i, x, y;
    var W = 128, H = tall ? 256 : 128;
    switch (kind) {
      case 'code': {
        g.fillStyle = '#1b2030'; g.fillRect(0, 0, W, H);
        var pal = ['#7ee787', '#79c0ff', '#ffa657', '#d2a8ff', '#e6edf3', '#ff7b72'];
        for (var half = 0; half < 2; half++) {
          var q = rng(seed || 7);
          for (i = 0; i < 14; i++) {
            y = half * 128 + 5 + i * 9;
            var ind = ((q() * 3) | 0) * 9, w = 16 + q() * 70;
            g.fillStyle = '#4b5263'; g.fillRect(3, y, 6, 4);
            g.fillStyle = pal[(q() * pal.length) | 0]; g.fillRect(14 + ind, y, w, 4);
            if (q() < 0.45) { g.fillStyle = pal[(q() * pal.length) | 0]; g.fillRect(16 + ind + w, y, 10 + q() * 20, 4); }
          }
        }
        break;
      }
      case 'sheet': {
        g.fillStyle = '#f4f6f3'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#2f8f5b'; g.fillRect(0, 0, W, 16);
        g.fillStyle = '#e1e6e0';
        for (i = 1; i < 9; i++) g.fillRect(0, 16 + i * 12, W, 1);
        for (i = 1; i < 5; i++) g.fillRect(i * 25, 16, 1, H);
        g.fillStyle = '#35403a';
        for (y = 0; y < 8; y++) for (x = 0; x < 4; x++) g.fillRect(4 + x * 25, 21 + y * 12, 8 + r() * 12, 3);
        g.fillStyle = '#2f8f5b'; g.fillRect(4, 21 + 3 * 12, 20, 3);
        break;
      }
      case 'chart': {
        g.fillStyle = '#101725'; g.fillRect(0, 0, W, H);
        chrome(g, W, 'BTC/USDT');
        g.fillStyle = 'rgba(255,255,255,0.08)';
        for (i = 1; i < 5; i++) g.fillRect(0, 12 + i * 22, W, 1);
        var v = 70;
        for (i = 0; i < 20; i++) {
          var open = v, d = (r() - 0.46) * 16; v = Math.max(26, Math.min(104, v - d));
          var hi = Math.min(open, v) - r() * 6 - 1, lo = Math.max(open, v) + r() * 6 + 1;
          g.fillStyle = v < open ? '#2ecf7d' : '#f0556a';
          g.fillRect(i * 6 + 6, hi, 1, lo - hi);
          g.fillRect(i * 6 + 4, Math.min(open, v), 5, Math.abs(open - v) + 1);
        }
        g.strokeStyle = '#ffd166'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, v); g.lineTo(W, v); g.stroke();
        break;
      }
      case 'map': {
        g.fillStyle = '#e8eef2'; g.fillRect(0, 0, W, H);
        chrome(g, W, 'Sendungen');
        g.strokeStyle = '#c4ced6'; g.lineWidth = 4;
        for (i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 28 + i * 24); g.lineTo(W, 20 + i * 26); g.stroke(); }
        for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(24 + i * 38, 12); g.lineTo(34 + i * 34, H); g.stroke(); }
        g.strokeStyle = '#e48a3f'; g.lineWidth = 3; g.setLineDash([6, 4]);
        g.beginPath(); g.moveTo(16, 100); g.lineTo(46, 70); g.lineTo(78, 82); g.lineTo(108, 36); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#d95555'; g.beginPath(); g.arc(108, 36, 6, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.fillRect(105, 34, 6, 5);
        break;
      }
      case 'shop': {
        g.fillStyle = '#f7f1ea'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#d9748f'; g.fillRect(0, 0, W, 14);
        g.fillStyle = '#fff'; g.font = 'bold 9px ' + FONT; g.fillText('LuxeStyle', 6, 10.5);
        var cc = ['#4f6fa5', '#e48a3f', '#58a56b', '#8a6fb0', '#e8bd45', '#37c8d8'];
        for (y = 0; y < 2; y++) for (x = 0; x < 3; x++) {
          g.fillStyle = cc[(x + y * 3 + ((seed || 0) % 3)) % cc.length]; g.fillRect(6 + x * 39, 22 + y * 50, 35, 36);
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(6 + x * 39, 62 + y * 50 - 3, 22, 2);
        }
        break;
      }
      case 'warn': {
        g.fillStyle = '#2b2415'; g.fillRect(0, 0, W, H);
        chrome(g, W, 'Achtung');
        g.fillStyle = '#e8bd45'; g.beginPath(); g.moveTo(64, 24); g.lineTo(104, 98); g.lineTo(24, 98); g.closePath(); g.fill();
        g.fillStyle = '#2b2415'; g.font = 'bold 46px ' + FONT; g.textAlign = 'center'; g.fillText('!', 64, 90); g.textAlign = 'left';
        break;
      }
      case 'error': {
        g.fillStyle = '#34161a'; g.fillRect(0, 0, W, H);
        chrome(g, W, 'Fehler');
        g.fillStyle = '#e5484d'; rr(g, 30, 26, 68, 68, 8); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 8; g.lineCap = 'round';
        g.beginPath(); g.moveTo(48, 44); g.lineTo(80, 76); g.moveTo(80, 44); g.lineTo(48, 76); g.stroke();
        break;
      }
      case 'sleep': {
        g.fillStyle = '#0d0f14'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#c9d2e0'; g.beginPath(); g.arc(46, 56, 14, 0, 7); g.fill();
        g.fillStyle = '#0d0f14'; g.beginPath(); g.arc(52, 52, 13, 0, 7); g.fill();
        g.fillStyle = '#7b8496'; g.font = 'bold 18px ' + FONT; g.fillText('z', 78, 60); g.font = 'bold 13px ' + FONT; g.fillText('z', 94, 48);
        g.fillStyle = '#58a56b'; g.beginPath(); g.arc(118, 120, 2.5, 0, 7); g.fill();
        break;
      }
      case 'idle': {
        var gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#3b2f63'); gr.addColorStop(1, '#2b5f8a');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.arc(34, 86, 30, 0, 7); g.fill(); g.beginPath(); g.arc(96, 40, 22, 0, 7); g.fill();
        g.fillStyle = '#f3efe8'; rr(g, 48, 52, 28, 24, 4); g.fill();
        g.strokeStyle = '#f3efe8'; g.lineWidth = 4; g.beginPath(); g.arc(80, 63, 8, -1.4, 1.4); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(56, 46); g.quadraticCurveTo(52, 38, 57, 32); g.moveTo(66, 46); g.quadraticCurveTo(62, 38, 67, 32); g.stroke();
        break;
      }
      case 'dash': {
        g.fillStyle = '#12202b'; g.fillRect(0, 0, W, H);
        chrome(g, W, 'Übersicht');
        var bars = [0.5, 0.8, 0.35, 0.65, 0.9, 0.55];
        for (i = 0; i < bars.length; i++) {
          g.fillStyle = ['#7ee787', '#79c0ff', '#ffa657', '#d2a8ff', '#7ee787', '#79c0ff'][i];
          g.fillRect(10 + i * 19, 112 - bars[i] * 80, 13, bars[i] * 80);
        }
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = 'bold 12px ' + FONT; g.fillText('12 · 3 · 0', 10, 26);
        break;
      }
      case 'logo': {
        g.fillStyle = '#2a2f3b'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#e6edf3'; g.beginPath(); g.arc(64, 64, 22, 0, 7); g.fill();
        g.fillStyle = '#2a2f3b'; g.beginPath(); g.arc(72, 58, 18, 0, 7); g.fill();
        break;
      }
      default:
        g.fillStyle = '#1b2030'; g.fillRect(0, 0, W, H);
    }
    return o.c;
  };

  /* ---------- Gesicht (256x128, Vorderansicht in der Mitte; oben links ein weisses Feld für Haare) ---------- */
  T.face = function (skin, mood) {
    var o = mk(256, 128), g = o.g, c = K.col(skin);
    g.fillStyle = rgb(c[0], c[1], c[2]); g.fillRect(0, 0, 256, 128);
    // Backen
    g.fillStyle = 'rgba(225,110,110,0.22)';
    g.beginPath(); g.arc(128 - 62, 78, 11, 0, 7); g.fill(); g.beginPath(); g.arc(128 + 62, 78, 11, 0, 7); g.fill();
    // Nase
    g.fillStyle = 'rgba(120,60,30,0.22)'; g.beginPath(); g.ellipse(128, 74, 6, 8, 0, 0, 7); g.fill();
    var ink = '#26201c';
    g.lineCap = 'round'; g.lineJoin = 'round';
    function eyes(ry, rx, hi) {
      [-40, 40].forEach(function (dx) {
        g.fillStyle = ink; g.beginPath(); g.ellipse(128 + dx, 60, rx, ry, 0, 0, 7); g.fill();
        if (hi) { g.fillStyle = '#fff'; g.beginPath(); g.arc(128 + dx - 2, 57, 2.2, 0, 7); g.fill(); }
      });
    }
    if (mood === 'sleep') {
      g.strokeStyle = ink; g.lineWidth = 3.5;
      [-40, 40].forEach(function (dx) { g.beginPath(); g.moveTo(128 + dx - 10, 60); g.quadraticCurveTo(128 + dx, 69, 128 + dx + 10, 60); g.stroke(); });
      g.beginPath(); g.moveTo(118, 96); g.lineTo(138, 96); g.stroke();
    } else if (mood === 'shout') {
      eyes(11, 8, true);
      g.strokeStyle = ink; g.lineWidth = 3.5;
      [-40, 40].forEach(function (dx) { g.beginPath(); g.moveTo(128 + dx - 11, 42 - (dx < 0 ? 2 : 0)); g.lineTo(128 + dx + 11, 42 - (dx > 0 ? 2 : 0)); g.stroke(); });
      g.fillStyle = '#7a2d2d'; g.beginPath(); g.ellipse(128, 97, 11, 13, 0, 0, 7); g.fill();
      g.fillStyle = '#e88'; g.beginPath(); g.ellipse(128, 104, 7, 5, 0, 0, 7); g.fill();
    } else if (mood === 'worried') {
      eyes(8, 6, true);
      g.strokeStyle = ink; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(128 - 52, 46); g.lineTo(128 - 30, 38); g.moveTo(128 + 52, 46); g.lineTo(128 + 30, 38); g.stroke();
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(112, 98); g.quadraticCurveTo(120, 91, 128, 98); g.quadraticCurveTo(136, 105, 144, 98); g.stroke();
    } else {
      eyes(9, 6.5, true);
      g.strokeStyle = ink; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(128 - 52, 42); g.quadraticCurveTo(128 - 40, 36, 128 - 28, 40); g.moveTo(128 + 52, 42); g.quadraticCurveTo(128 + 40, 36, 128 + 28, 40); g.stroke();
      g.strokeStyle = '#7a3b2e'; g.lineWidth = 3.5;
      g.beginPath(); g.moveTo(128 - (mood === 'calm' ? 14 : 20), 94); g.quadraticCurveTo(128, mood === 'calm' ? 101 : 108, 128 + (mood === 'calm' ? 14 : 20), 94); g.stroke();
    }
    // weisses Feld für Haare und Zubehör
    g.fillStyle = '#fff'; g.fillRect(0, 0, 20, 20);
    return o.c;
  };

  /* ---------- Bildchen (Sprechblasen, Dampf, Tropfen, Schimmer), 64x64, ohne Mip-Map ---------- */
  T.glyph = function (kind, color) {
    var o = mk(64, 64), g = o.g;
    g.fillStyle = 'rgba(255,255,255,0.004)'; g.fillRect(0, 0, 64, 64);
    g.lineCap = 'round'; g.lineJoin = 'round';
    function bubble(stroke) {
      g.fillStyle = '#fff'; g.strokeStyle = stroke || '#6b7280'; g.lineWidth = 3;
      rr(g, 6, 8, 52, 36, 14); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(20, 42); g.lineTo(14, 58); g.lineTo(32, 44); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(20, 43); g.lineTo(14, 58); g.lineTo(32, 43); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(19, 40, 12, 5);
    }
    if (kind === 'dots') {
      bubble('#6b7280'); g.fillStyle = '#374151';
      [20, 32, 44].forEach(function (x) { g.beginPath(); g.arc(x, 26, 4, 0, 7); g.fill(); });
    } else if (kind === 'q') {
      bubble('#b7791f'); g.fillStyle = '#b7791f'; g.font = 'bold 30px ' + FONT; g.textAlign = 'center'; g.fillText('?', 32, 36);
    } else if (kind === 'ex') {
      bubble('#c53030'); g.fillStyle = '#c53030'; g.font = 'bold 30px ' + FONT; g.textAlign = 'center'; g.fillText('!', 32, 36);
    } else if (kind === 'z') {
      g.fillStyle = color || '#6b7280'; g.font = 'italic bold 44px ' + FONT; g.textAlign = 'center'; g.fillText('Z', 32, 46);
    } else if (kind === 'puff') {
      var gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    } else if (kind === 'glow') {
      var g2 = g.createRadialGradient(32, 32, 1, 32, 32, 31); g2.addColorStop(0, 'rgba(255,90,80,0.95)'); g2.addColorStop(0.4, 'rgba(255,70,60,0.35)'); g2.addColorStop(1, 'rgba(255,60,50,0)');
      g.fillStyle = g2; g.fillRect(0, 0, 64, 64);
    } else if (kind === 'drop') {
      g.fillStyle = '#6aaed6'; g.strokeStyle = '#3d7fa8'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(32, 8); g.quadraticCurveTo(50, 34, 32, 52); g.quadraticCurveTo(14, 34, 32, 8); g.closePath(); g.fill(); g.stroke();
    } else if (kind === 'spark') {
      var g3 = g.createRadialGradient(32, 32, 1, 32, 32, 30); g3.addColorStop(0, 'rgba(255,240,180,0.95)'); g3.addColorStop(1, 'rgba(255,220,120,0)');
      g.fillStyle = g3; g.fillRect(0, 0, 64, 64);
    }
    return o.c;
  };

  /* Arbeitsort-Schild am Schreibtisch: Symbol links, Kürzel rechts (256x128). */
  T.ortSchild = function (art, text) {
    var o = mk(256, 128), g = o.g;
    var P = { cloud: ['#2f6fb0', '#d4e8ff'], claude: ['#b85c32', '#ffe6d6'], pc: ['#3d4655', '#e8edf4'], shop: ['#2f7d4f', '#d9f3e4'], du: ['#5a4bc0', '#e8e4ff'] }[art] || ['#5a4bc0', '#e8e4ff'];
    g.fillStyle = P[0]; rr(g, 2, 2, 252, 124, 20); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 4; rr(g, 8, 8, 240, 112, 15); g.stroke();
    g.fillStyle = P[1]; g.beginPath(); g.arc(60, 64, 42, 0, 7); g.fill();
    g.save(); g.translate(60, 64); g.scale(1.25, 1.25);
    g.fillStyle = P[0]; g.strokeStyle = P[0]; g.lineWidth = 4; g.lineJoin = 'round'; g.lineCap = 'round';
    if (art === 'cloud') {
      g.translate(0, 4); g.beginPath(); g.moveTo(-14, 10); g.arc(-12, 2, 8, PI * 0.5, PI * 1.5); g.arc(-1, -8, 10, PI, PI * 2); g.arc(12, 2, 8, PI * 1.5, PI * 0.5); g.closePath(); g.fill();
    } else if (art === 'claude') {
      rr(g, -16, -14, 32, 22, 7); g.fill();
      g.beginPath(); g.moveTo(-8, 8); g.lineTo(-10, 17); g.lineTo(2, 8); g.closePath(); g.fill();
      g.fillStyle = P[1]; [-8, 0, 8].forEach(function (x) { g.beginPath(); g.arc(x, -3, 2.6, 0, 7); g.fill(); });
    } else if (art === 'pc') {
      rr(g, -18, -16, 36, 24, 4); g.fill();
      g.fillStyle = P[1]; g.fillRect(-14, -12, 28, 16);
      g.fillStyle = P[0]; g.fillRect(-4, 8, 8, 6); g.fillRect(-10, 14, 20, 3);
    } else if (art === 'shop') {
      g.beginPath(); g.moveTo(-14, -6); g.lineTo(14, -6); g.lineTo(17, 17); g.lineTo(-17, 17); g.closePath(); g.fill();
      g.beginPath(); g.arc(0, -6, 8, PI, 0); g.stroke();
    } else {
      g.beginPath(); g.arc(0, -8, 8, 0, 7); g.fill();
      g.beginPath(); g.ellipse(0, 14, 17, 13, 0, PI, 0); g.fill();
    }
    g.restore();
    var fs = 40;
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = 'bold ' + fs + 'px ' + FONT;
    while (g.measureText(text).width > 132 && fs > 16) { fs -= 2; g.font = 'bold ' + fs + 'px ' + FONT; }
    g.fillText(String(text || ''), 112, 66);
    return o.c;
  };

  /* ---------- Schilder ---------- */
  T.sign = function (text, fg, bg, edge, sub) {
    var o = mk(256, 64), g = o.g;
    g.fillStyle = bg; g.fillRect(0, 0, 256, 64);
    g.strokeStyle = edge || fg; g.lineWidth = 4; g.strokeRect(5, 5, 246, 54);
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold ' + (sub ? 30 : 36) + 'px ' + FONT;
    g.fillText(text, 128, sub ? 26 : 34);
    if (sub) { g.font = '600 15px ' + FONT; g.fillStyle = edge || fg; g.fillText(sub, 128, 49); }
    return o.c;
  };
  T.poster = function (v) {
    var o = mk(128, 128), g = o.g, r = rng(40 + v), pal = [['#f2d8c8', '#d9748f', '#4f6fa5'], ['#d8e8f2', '#e48a3f', '#2f6a8c'], ['#e9e2f4', '#8a6fb0', '#e8bd45'], ['#e3efe1', '#58a56b', '#d95555']][v % 4];
    g.fillStyle = pal[0]; g.fillRect(0, 0, 128, 128);
    g.fillStyle = pal[1]; g.beginPath(); g.arc(44 + r() * 20, 52, 30 + r() * 10, 0, 7); g.fill();
    g.fillStyle = pal[2]; g.fillRect(14 + r() * 20, 70 + r() * 10, 60 + r() * 30, 40);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(14, 14, 50, 6); g.fillRect(14, 24, 30, 4);
    return o.c;
  };
  T.clock = function () {
    var o = mk(128, 128), g = o.g;
    g.fillStyle = '#f7f5f0'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
    g.strokeStyle = '#2b2f38'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#2b2f38'; g.font = 'bold 15px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (var i = 1; i <= 12; i++) { var a = i / 12 * PI * 2 - PI / 2; g.fillText(String(i), 64 + Math.cos(a) * 46, 64 + Math.sin(a) * 46); }
    return o.c;
  };
  T.belt = function () {
    var o = mk(64, 64), g = o.g;
    g.fillStyle = '#2f343d'; g.fillRect(0, 0, 64, 64);
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 4; g.lineJoin = 'round';
    for (var i = 0; i < 2; i++) { g.beginPath(); g.moveTo(8 + i * 32, 8); g.lineTo(24 + i * 32, 32); g.lineTo(8 + i * 32, 56); g.stroke(); }
    return o.c;
  };
  T.shadow = function () {
    var o = mk(128, 128), g = o.g;
    var gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, 'rgba(15,20,40,0.55)'); gr.addColorStop(1, 'rgba(15,20,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return o.c;
  };
  T.wallpaper = function (base, stripe) {
    var o = mk(64, 64), g = o.g, b = K.col(base);
    g.fillStyle = rgb(b[0], b[1], b[2]); g.fillRect(0, 0, 64, 64);
    g.fillStyle = stripe || 'rgba(0,0,0,0.035)';
    g.fillRect(0, 0, 8, 64); g.fillRect(32, 0, 8, 64);
    return o.c;
  };

  /* Himmel hinter dem Fenster, abhängig von der Stunde (0..24). */
  T.skyline = function (hour) {
    var o = mk(256, 128), g = o.g, r = rng(77);
    var day = Math.max(0, Math.min(1, (Math.cos((hour - 13) / 24 * PI * 2) + 0.35) / 1.35));
    var top = K.mix(K.col('#0d1330'), K.col('#6fb4ee'), day), bot = K.mix(K.col('#2a2347'), K.col('#d8ecfa'), day);
    var dusk = Math.max(0, 1 - Math.abs(day - 0.45) / 0.3);
    var gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, rgb(top[0], top[1], top[2]));
    var mid = K.mix(bot, K.col('#f2a86b'), dusk * 0.7);
    gr.addColorStop(1, rgb(mid[0], mid[1], mid[2]));
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    var i;
    if (day < 0.5) {
      g.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - day * 2)) + ')';
      for (i = 0; i < 40; i++) g.fillRect(r() * 256, r() * 70, 1.5, 1.5);
      g.fillStyle = 'rgba(245,240,215,' + (1 - day * 1.6) + ')'; g.beginPath(); g.arc(200, 26, 9, 0, 7); g.fill();
    } else {
      g.fillStyle = 'rgba(255,245,200,0.95)'; g.beginPath(); g.arc(46, 30, 11, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      for (i = 0; i < 4; i++) { var cx = 60 + i * 55 + r() * 20, cy = 24 + r() * 26; g.beginPath(); g.ellipse(cx, cy, 22, 7, 0, 0, 7); g.ellipse(cx + 12, cy - 4, 14, 7, 0, 0, 7); g.fill(); }
    }
    var cityCol = K.mix(K.col('#1a2038'), K.col('#8fa4bd'), day * 0.8);
    var x = 0;
    while (x < 256) {
      var w = 14 + r() * 22, h = 24 + r() * 56;
      g.fillStyle = rgb(cityCol[0] * (0.85 + r() * 0.2), cityCol[1] * (0.85 + r() * 0.2), cityCol[2] * (0.85 + r() * 0.2));
      g.fillRect(x, 128 - h, w, h);
      if (day < 0.55) {
        g.fillStyle = 'rgba(255,214,120,' + (0.9 - day) + ')';
        for (var wy = 128 - h + 5; wy < 124; wy += 8) for (var wx = x + 3; wx < x + w - 4; wx += 6) if (r() < 0.55) g.fillRect(wx, wy, 3, 4);
      }
      x += w + 2 + r() * 4;
    }
    return o.c;
  };

  /* Tafel: grosse Zahl und Beschriftung (aus den Daten). */
  T.board = function (zahl, label, accent) {
    var o = mk(256, 128), g = o.g;
    g.fillStyle = '#f6f6f1'; g.fillRect(0, 0, 256, 128);
    g.strokeStyle = '#b6bcc4'; g.lineWidth = 6; g.strokeRect(3, 3, 250, 122);
    g.fillStyle = '#4a5160'; g.font = '600 15px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(String(label || ''), 128, 26, 232);
    g.fillStyle = accent || '#2f6aa8'; g.font = 'bold 76px ' + FONT; g.fillText(String(zahl == null ? '' : zahl), 128, 100);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(24, 110, 208, 2);
    return o.c;
  };
  /* Kärtchen an der Pinnwand. */
  T.card = function (text, shape, accent, paper) {
    var o = mk(128, 128), g = o.g;
    g.fillStyle = paper || '#fbf7e8'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 118, 128, 10);
    g.fillStyle = accent || '#3b6fd8';
    var cx = 22, cy = 28;
    g.beginPath();
    if (shape === 'du') { g.moveTo(cx, cy - 13); g.lineTo(cx + 13, cy); g.lineTo(cx, cy + 13); g.lineTo(cx - 13, cy); g.closePath(); g.fill(); }
    else { g.arc(cx, cy, 11, 0, 7); g.fill(); }
    g.fillStyle = '#c53030'; g.beginPath(); g.arc(98, 16, 7, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(96, 14, 2.5, 0, 7); g.fill();
    g.fillStyle = '#2a2f3b'; g.font = 'bold 17px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    var words = String(text || '').split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (g.measureText(t).width > 108 && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    lines.slice(0, 4).forEach(function (l, i) { g.fillText(l, 10, 64 + i * 20, 110); });
    return o.c;
  };

  K.tex = T;
})(window.KB3D);
