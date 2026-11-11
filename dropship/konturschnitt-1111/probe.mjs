// Misst, ob Printful bei Die-Cut-Magnet 656 die Form aus der Transparenz ableitet: zwei Mockup-Aufgaben (nur lesend, kein Auftrag).
const K = process.env.PRINTFUL_API_KEY, S = process.env.PRINTFUL_STORE_ID;
const H = { Authorization: `Bearer ${K}`, 'Content-Type': 'application/json', 'X-PF-Store-Id': S };
const BILDER = {
  transparent: 'https://res.cloudinary.com/dwyi6kkrl/image/upload/v1793976626/xy1jxggytwmgpyvh4m1v.png',
  deckend: 'https://cdn.shopify.com/s/files/1/0943/6856/3585/files/magnet.jpg?v=1781356272',
};
const pf = async (m, p, b) => { const r = await fetch('https://api.printful.com' + p, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }); return [r.status, await r.json()]; };
const pfiles = await pf('GET', '/mockup-generator/printfiles/' + (process.env.MODELL||'656') + '');
const pfv = pfiles[1].result.variant_printfiles.find((v) => v.variant_id === Number(process.env.VARIANTE||16367));
const datei = pfiles[1].result.printfiles.find((f) => f.printfile_id === pfv.placements.default);
console.log('Druckdatei', datei.width, datei.height, datei.dpi);
const out = {};
for (const [name, url] of Object.entries(BILDER)) {
  const [st, j] = await pf('POST', '/mockup-generator/create-task/' + (process.env.MODELL||'656') + '', { variant_ids: [Number(process.env.VARIANTE||16367)], format: 'png', files: [{ placement: 'default', image_url: url, position: name === 'transparent' ? { area_width: datei.width, area_height: datei.height, width: datei.width, height: 507, top: 346, left: 0 } : { area_width: datei.width, area_height: datei.height, width: datei.width, height: datei.height, top: 0, left: 0 } }] });
  console.log(name, st, j.result?.task_key || JSON.stringify(j).slice(0, 200));
  out[name] = j.result?.task_key;
  await new Promise((r) => setTimeout(r, 7000));
}
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 6000));
  let fertig = true;
  for (const [name, key] of Object.entries(out)) {
    if (!key || typeof key !== 'string') continue;
    const [st, j] = await pf('GET', `/mockup-generator/task?task_key=${key}`);
    if (j.result?.status === 'completed') { console.log('FERTIG', name, j.result.mockups.map((m) => m.mockup_url).join(' ')); out[name] = { url: j.result.mockups[0].mockup_url }; }
    else if (j.result?.status === 'failed') { console.log('FEHLER', name, JSON.stringify(j.result).slice(0, 200)); out[name] = { fehler: 1 }; }
    else fertig = false;
  }
  if (fertig) break;
}
console.log(JSON.stringify(out));
