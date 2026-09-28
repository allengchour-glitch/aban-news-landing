/**
 * tiktok_video_lesen.mjs — ein fremdes TikTok-Video lesen: Caption, Kanal, Untertitel (ASR) und Standbilder.
 *
 * Anlass 28.09.2026: Betreiber schickte vm.tiktok.com/ZN8rqu5yB («Claude 5 besten Plugins»). Cloud-Proxy und WebFetch
 * blocken tiktok.com; der Seitentext-Auftrag lieferte nur die Caption, die fünf Plugins stehen im Video (Folien) und
 * vermutlich im gesprochenen Text. TikTok legt die ASR-Untertitel als WebVTT in den Seitendaten ab
 * (itemStruct.video.subtitleInfos, Skill «recherchieren»).
 *
 * ⛔ REIN LESEND: kein Klick, keine Anmeldung, kein Folgen/Liken. Nur Seite öffnen, Datenblock lesen, das <video>
 *    per currentTime auf Zeitpunkte setzen (keine Seiteninteraktion) und das Element fotografieren.
 *
 * auftrag: { id, typ:"skript", skript:"tiktok_video_lesen.mjs", url:"https://vm.tiktok.com/…", bilder_alle_s: 6 }
 * → Rückgabe {kanal, caption, dauer_s, untertitel:[{sprache, text}], bilder:[…]}, Standbilder als
 *   auftraege/ergebnis/<id>-tNN.png
 */
export default async function ({ ctx, auftrag, ERGEBNIS }) {
  const path = await import('node:path');
  if (!/^https:\/\/(vm\.|www\.)?tiktok\.com\//.test(auftrag.url || '')) throw new Error('auftrag.url (tiktok.com) fehlt');
  const seite = await ctx.newPage();
  await seite.setViewportSize({ width: 1280, height: 900 });
  await seite.goto(auftrag.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await seite.waitForTimeout(6000);
  const daten = await seite.evaluate(() => {
    const el = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
    if (!el) return null;
    try {
      const j = JSON.parse(el.textContent);
      const it = j?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;
      if (!it) return { fehlt: 'itemStruct' };
      return {
        kanal: it.author?.uniqueId, name: it.author?.nickname, caption: it.desc, dauer_s: it.video?.duration,
        erstellt: it.createTime, stats: it.stats,
        subs: (it.video?.subtitleInfos || []).map(s => ({ sprache: s.LanguageCodeName || s.LanguageID, url: s.Url, format: s.Format })),
      };
    } catch (e) { return { fehler: String(e).slice(0, 200) }; }
  });
  const untertitel = [];
  for (const s of (daten?.subs || []).slice(0, 4)) {
    try {
      const txt = await seite.evaluate(async u => (await fetch(u)).text(), s.url);
      const rein = txt.split('\n').filter(z => z.trim() && !/-->|^WEBVTT|^\d+$/.test(z.trim())).join(' ');
      untertitel.push({ sprache: s.sprache, text: rein.slice(0, 8000) });
    } catch (e) { untertitel.push({ sprache: s.sprache, fehler: String(e).slice(0, 120) }); }
  }
  const bilder = [];
  const schritt = Math.max(2, Number(auftrag.bilder_alle_s || 6));
  const dauer = Number(daten?.dauer_s || 60);
  const video = seite.locator('video').first();
  if (await video.count()) {
    for (let t = 1; t < dauer && bilder.length < 15; t += schritt) {
      try {
        await video.evaluate((v, t) => new Promise(ok => { v.pause(); v.muted = true; const f = () => { v.removeEventListener('seeked', f); ok(); };
          v.addEventListener('seeked', f); v.currentTime = t; setTimeout(ok, 4000); }), t);
        const datei = path.join(ERGEBNIS, `${auftrag.id}-t${String(Math.round(t)).padStart(2, '0')}.png`);
        await video.screenshot({ path: datei, timeout: 10000 });
        bilder.push(path.basename(datei));
      } catch (e) { bilder.push(`t${t}: ${String(e.message).slice(0, 80)}`); }
    }
  }
  delete daten?.subs;
  return { ziel: seite.url(), ...daten, untertitel, bilder };
}
