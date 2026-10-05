// mobil_tempo_messen.mjs — Mobil-/Tempo-Messung einer Seite in 390 px (Plan-Tag 11, 05.10.2026).
// Misst: Überbreite (scrollWidth + Elemente über den Rand), Sticky/Fixed-Elemente und ihre Überlappung,
// Bilder im ersten Bildschirm (loading/fetchpriority/currentSrc), LCP-Element (+ loading-Attribut), CLS,
// übertragene KB nach Typ, grosse Ressourcen, Skript-Hosts und App-Skripte.
// Aufruf: /opt/node22/bin/node automation/mobil_tempo_messen.mjs <url> [screenshot.png]  → JSON
// ⚠️ Unsere IP kann eine alte Cache-Kopie bekommen — Live-Stand vorher per Admin-API bestätigen (CLAUDE.md 19.08.).
// Gemessen 05.10.: Startseite LCP 5232 → 2812 ms, 6818 → 3014 KB (siehe dropship/MOBIL-TEMPO-2026-10-04.md).
import { starte } from '/home/user/aban-news-landing/tools/browser.mjs';
const URL = process.argv[2]; const SHOT = process.argv[3] || null;
const browser = await starte();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__lcp = []; window.__cls = 0;
    try {
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), size: e.size, url: e.url || '', tag: e.element ? e.element.tagName : '', id: e.element ? (e.element.id || '') : '', cls: e.element ? (e.element.className || '').toString().slice(0, 80) : '', loading: e.element ? e.element.getAttribute('loading') : null, fp: e.element ? e.element.getAttribute('fetchpriority') : null, cur: e.element && e.element.currentSrc ? e.element.currentSrc : '' }); }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    } catch (e) {}
  });
  const t0 = Date.now();
  const resp = await p.goto(URL, { waitUntil: 'load', timeout: 120000 });
  const tLoad = Date.now() - t0;
  await p.waitForTimeout(4000);
  const r = await p.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const o = { W, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, title: document.title.slice(0, 70) };
    // Überbreite: Elemente, die rechts über den Viewport ragen
    const wide = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const rc = el.getBoundingClientRect(); if (rc.width === 0) continue;
      if (rc.right > W + 2 && rc.left < W) { let c = el; let hidden = false; while (c && c !== document.body) { const s = getComputedStyle(c); if (/hidden|clip|auto|scroll/.test(s.overflowX) && c !== el) { hidden = true; break; } c = c.parentElement; } if (!hidden) wide.push({ tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 60), right: Math.round(rc.right), top: Math.round(rc.top) }); }
      if (wide.length > 12) break;
    }
    o.ueberbreit = wide;
    // Sticky/Fixed-Elemente
    const sticky = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el); if (cs.position !== 'sticky' && cs.position !== 'fixed') continue; if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const rc = el.getBoundingClientRect(); if (rc.width < 20 || rc.height < 10) continue; if (rc.bottom < 0 || rc.top > 844) continue;
      sticky.push({ tag: el.tagName, id: el.id, cls: (el.className || '').toString().slice(0, 50), pos: cs.position, z: cs.zIndex, top: Math.round(rc.top), bottom: Math.round(rc.bottom), left: Math.round(rc.left), right: Math.round(rc.right) });
    }
    o.sticky = sticky.slice(0, 20);
    // Überlappungen zwischen sticky Elementen (ohne Eltern-Kind)
    const ov = []; const els = [...document.querySelectorAll('body *')].filter(el => { const cs = getComputedStyle(el); return (cs.position === 'sticky' || cs.position === 'fixed') && cs.display !== 'none'; });
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) { if (els[i].contains(els[j]) || els[j].contains(els[i])) continue; const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect(); if (a.width < 20 || b.width < 20 || a.height < 10 || b.height < 10) continue; const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (x > 8 && y > 8) ov.push({ a: (els[i].id || els[i].className.toString().slice(0, 30)), b: (els[j].id || els[j].className.toString().slice(0, 30)), x: Math.round(x), y: Math.round(y) }); }
    o.stickyUeberlappung = ov.slice(0, 10);
    // Bilder im ersten Bildschirm und ihre loading-Attribute
    const first = [];
    for (const im of document.images) { const rc = im.getBoundingClientRect(); if (rc.bottom > 0 && rc.top < 844 && rc.width > 40) first.push({ w: Math.round(rc.width), h: Math.round(rc.height), top: Math.round(rc.top), loading: im.getAttribute('loading'), fp: im.getAttribute('fetchpriority'), cur: (im.currentSrc || im.src).slice(-120), natural: im.naturalWidth + 'x' + im.naturalHeight, cls: (im.className || '').toString().slice(0, 40) }); }
    o.bilderErsterBildschirm = first.slice(0, 12);
    o.lcp = window.__lcp.slice(-1)[0] || null; o.lcpAlle = window.__lcp.length; o.cls = Math.round(window.__cls * 1000) / 1000;
    // Ressourcen
    const res = performance.getEntriesByType('resource');
    const byType = {}; let total = 0; let imgBytes = 0; let jsBytes = 0; let cssBytes = 0;
    const big = [];
    for (const e of res) { const t = e.initiatorType; byType[t] = (byType[t] || 0) + 1; total += e.transferSize || 0; if (t === 'img' || /\.(jpg|jpeg|png|webp|gif|avif)/i.test(e.name)) imgBytes += e.transferSize || 0; if (t === 'script') jsBytes += e.transferSize || 0; if (t === 'link' || t === 'css') cssBytes += e.transferSize || 0; if ((e.transferSize || 0) > 100000) big.push({ kb: Math.round(e.transferSize / 1024), url: e.name.replace(/^https?:\/\//, '').slice(0, 110), t }); }
    const nav = performance.getEntriesByType('navigation')[0];
    o.ressourcen = { anzahl: res.length, byType, totalKB: Math.round(total / 1024), imgKB: Math.round(imgBytes / 1024), jsKB: Math.round(jsBytes / 1024), cssKB: Math.round(cssBytes / 1024), htmlKB: nav ? Math.round(nav.transferSize / 1024) : null, htmlDecodedKB: nav ? Math.round(nav.decodedBodySize / 1024) : null, domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd) : null, load: nav ? Math.round(nav.loadEventEnd) : null };
    o.gross = big.sort((a, b) => b.kb - a.kb).slice(0, 12);
    // Skripte/Hosts
    const hosts = {}; for (const s of document.scripts) { if (!s.src) { hosts['(inline)'] = (hosts['(inline)'] || 0) + 1; continue; } let h = ''; try { h = new URL(s.src).host; } catch {} hosts[h] = (hosts[h] || 0) + 1; }
    o.skripte = { gesamt: document.scripts.length, hosts };
    // Apps: Shopify-App-Skripte
    o.appSkripte = [...document.scripts].map(s => s.src).filter(s => /\/extensions\/|shopifycloud|apps|judge|klaviyo|metricool|pinterest|tiktok|facebook|gtag|googletagmanager/i.test(s)).map(s => s.replace(/^https?:\/\//, '').slice(0, 120)).slice(0, 30);
    o.domNodes = document.getElementsByTagName('*').length;
    o.styleTags = document.querySelectorAll('style').length;
    return o;
  });
  r.http = resp ? resp.status() : null; r.ladezeitMs = tLoad; r.url = URL;
  if (SHOT) await p.screenshot({ path: SHOT, fullPage: false });
  console.log(JSON.stringify(r, null, 1));
} finally { await browser.close(); }
