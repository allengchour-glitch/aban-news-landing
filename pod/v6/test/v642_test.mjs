/**
 * Browser-Tests (Playwright, Chromium) für das Delta von Editor 6.4.2 gegenüber 6.4.1 (10.11.2026, Funde der Fehlersuche vom 10.11.):
 *   E1 leere Textebene neben anderem Inhalt sperrt den Kauf nicht mehr (OFF-01)
 *   E2 Löschkreuz und Skalieren-Griff im sichtbaren Bereich und treffbar: flache Bühne, «Druckversion», Produktbühne, auch bei sehr kleinen Ebenen (OFF-03, F5, OFF-07)
 *   E3 Schieber «Grösse» bis 0,06, Drehwinkel in −180 … 180 (OFF-02-Rest, OFF-04)
 *   E4 Fehlertexte ohne Rohtext, kaputte Bilddatei legt keine leere Ebene an (F1, F2)
 *   E5 ausverkaufte Ausführung und fehlende Kombination sperren den Kaufknopf sichtbar und vor jedem Upload (SW-06)
 *   E6 Esc und Fokus in den Dialogen (OFF-05)
 *   E7 kein Layoutsprung, wenn die Vorschaudaten rechtzeitig eintreffen (OFF-11)
 *   «kaufvergleich»: Druckdatei (PNG-Bytes), Warenkorb-Eigenschaften, _pod_karte und _vorschau (JPEG-Bytes) sind in allen Abläufen BYTEGLEICH zu 6.4.1 (der Referenz, über editor=ref auf derselben
 *   Attrappenseite); die bewusst abweichenden Abläufe stehen einzeln darin, jeder mit seiner Begründung.
 * Aufruf: node v642_test.mjs [Teil]   (Teil: Name oder Anfang eines Szenarios; ohne Angabe alle; «kern» = alle)
 * Umgebung: V6_DATEI (Vorgabe 6.4.2; gegen 6.4.1 (V6_DATEI=../lspod-designer-v6-6.4.1.js) laufen die Prüfungen des Deltas ROT, das ist der Beleg, dass sie etwas messen), V6_REF_DATEI (Referenz des Kaufvergleichs, hier fest 6.4.1).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const v6 = join(dirname(fileURLToPath(import.meta.url)), '..');
process.env.V6_REF_DATEI = process.env.V6_REF_DATEI || join(v6, 'lspod-designer-v6-6.4.1.js');   // vor dem Import von lib.mjs: dort wird die Umgebung gelesen
const { playwright, starteServer, seiteOeffnen, editorBereit, geisterPng, pngAusKoerper, V6_DATEI } = await import('./lib.mjs');
const { chromium } = playwright();
let n = 0; const fehler = [];
function pruefe(name, ok, detail = '') { n++; if (!ok) { fehler.push(`${name} ${detail}`); console.log(`  ✗ ${name} ${detail}`); if (process.env.V6_ABBRUCH) process.exit(1); } }
const nur = process.argv[2] || '';
const szenarien = [];
function szenario(name, kern, fn) { szenarien.push({ name, kern, fn }); }
const quelle = readFileSync(V6_DATEI, 'utf8');

const PC = { breite: 1440, hoehe: 900 };
const MOBIL = { breite: 390, hoehe: 844, mobil: true };
const GEISTER = { printfulBild: (u) => (/\/m\//.test(u) ? { typ: 'image/png', body: geisterPng() } : null) };
const T71 = 'karte=71&shop=1001:4012,1002:4020,1003:4045&vorschau=71&bearbeiten=1&themeregel=1&varianten=1001:Weiss,1002:Schwarz,1003:Pink';
const T19 = 'karte=19&shop=1001:1320,1002:4830,1003:16586&vorschau=19&bearbeiten=1&themeregel=1';
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function oeffnen(b, srv, query, opt = {}) {
  const s = await seiteOeffnen(b, srv.url, { ...PC, ...GEISTER, ...opt, query });
  await editorBereit(s.page);
  return s;
}
const sichtWarten = (p) => p.waitForSelector('[data-feld="sicht"]:not([hidden])', { timeout: 10000 });
const ed = (p, f, ...a) => p.evaluate(new Function('a', `const ed = window.LSPOD6.editors[0]; return (${f})(ed, ...a);`), a);
const textHinzufuegen = async (p, text) => { await p.getByRole('button', { name: '➕ Text' }).click(); await p.locator('.lsp6-text').fill(text); };
const feldEingabe = (p, name) => p.locator('.lsp6-field', { hasText: name }).locator('input');
async function feldSetzen(p, name, wert) { const f = feldEingabe(p, name); await f.fill(String(wert)); await f.press('Tab'); }
const status = (p) => p.locator('[data-feld="status"]');
const statusText = async (p) => (await status(p).innerText()).trim();
const ebenenAnzahl = (p) => ed(p, '(ed) => Object.values(ed.st.ebenen).reduce((a, l) => a + l.length, 0)');
const ebenenInfo = (p) => ed(p, '(ed) => Object.keys(ed.st.ebenen).map((id) => ({ p: id, e: ed.st.ebenen[id].map((e) => ({ id: e.id, type: e.type, text: e.text, rot: e.rot, scale: e.scale, cx: e.cx, cy: e.cy })) })).filter((x) => x.e.length)');
const motivHinzu = (p, farbe = '#2040c0', gemeldet = 4000) => p.evaluate(([f, g]) => {   // einfarbiges Quadrat als Bild; gemeldet: die Originalgrösse für das Qualitätstor
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 200;
  const c = cv.getContext('2d'); c.fillStyle = f; c.fillRect(0, 0, 200, 200);
  return window.LSPOD6.editors[0].neuesBild(cv.toDataURL('image/png'), g, g).id;
}, [farbe, gemeldet]);
const bilderGeladen = (p) => p.waitForFunction(() => [...document.querySelectorAll('.lsp6-layer img, .lsp6-tpl, .lsp6-bg')].every((i) => i.hidden || (i.complete && i.naturalWidth > 0)), null, { timeout: 15000 });
const kein = (s) => s.fehler.length === 0;
const dialogOffen = (p) => p.locator('[data-lsp6-review="1"]').count().then((c) => c > 0);
async function reviewBestaetigen(p) {
  const dialog = p.locator('[data-lsp6-review="1"]');
  await dialog.waitFor({ state: 'visible', timeout: 30000 });
  await dialog.locator('.lsp6-review-accept').check();
  await dialog.locator('.lsp6-review-confirm').click();
}
/** Den Kaufknopf auslösen, auch wenn er aria-disabled trägt (Playwright klickt ihn sonst nicht): für Kundinnen ist er klickbar, der Klick erklärt, was fehlt. */
const ctaKlick = (p) => p.locator('.lsp6-cta').click({ force: true });
const buehneZeigen = (p) => p.evaluate(() => document.querySelector('.lsp6-stage').scrollIntoView({ block: 'center' }));

// ── E1 leere Textebene ──────────────────────────────────────────────────────────────────────────
async function e1Fall(b, srv, name, query, opt, vorbereiten) {
  const s = await oeffnen(b, srv, query, opt);
  const p = s.page;
  await sichtWarten(p);
  await vorbereiten(p);
  await ctaKlick(p);
  const offen = await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 6000 }).then(() => true, () => false);
  const info = await ebenenInfo(p);
  const st = await statusText(p);
  return { s, p, offen, info, st };
}
szenario('leere-textebene', true, async (b, srv) => {
  // Fall 1: Foto plus leere Textebene (Shirt, Produktbühne, PC und Handy): der Dialog öffnet sich, die leere Ebene ist weg, der Hinweis steht da
  for (const [vp, opt] of [['PC', PC], ['Handy', MOBIL]]) {
    const r = await e1Fall(b, srv, 'Shirt', T71, opt, async (p) => { await motivHinzu(p); await bilderGeladen(p); await p.getByRole('button', { name: '➕ Text' }).click(); });
    pruefe(`Shirt ${vp}: Foto plus leere Textebene: der Prüfdialog öffnet sich`, r.offen, r.st);
    pruefe(`Shirt ${vp}: die leere Textebene ist entfernt, das Foto bleibt`, r.info.length === 1 && r.info[0].e.length === 1 && r.info[0].e[0].type === 'image', JSON.stringify(r.info));
    pruefe(`Shirt ${vp}: Hinweis «Leere Textebene entfernt.» in der Statuszeile`, /Leere Textebene entfernt\./.test(r.st), r.st);
    pruefe(`Shirt ${vp}: auch der Knoten in der Bühne ist weg (eine gezeichnete Ebene, nicht zwei)`, (await r.p.locator('.lsp6-layer').count()) === 1, String(await r.p.locator('.lsp6-layer').count()));
    pruefe(`Shirt ${vp}: keine Seitenfehler`, kein(r.s), r.s.fehler.join(' | '));
    await r.s.schliessen();
  }
  // Fall 2: nur Leerzeichen zählt als leer; Foto plus Text mit Inhalt plus zweite leere Ebene: Dialog, zwei Ebenen bleiben
  {
    const r = await e1Fall(b, srv, 'Shirt', T71, PC, async (p) => {
      await motivHinzu(p); await bilderGeladen(p);
      await textHinzufuegen(p, 'Hallo');
      await p.getByRole('button', { name: '➕ Text' }).click(); await p.locator('.lsp6-text').fill('   ');
      await p.getByRole('button', { name: '➕ Text' }).click();
    });
    pruefe('Foto + Text «Hallo» + zwei leere Ebenen (leer, nur Leerzeichen): der Dialog öffnet sich', r.offen, r.st);
    pruefe('es bleiben Foto und Text «Hallo»', r.info.length === 1 && r.info[0].e.length === 2 && r.info[0].e.some((e) => e.text === 'Hallo') && r.info[0].e.some((e) => e.type === 'image'), JSON.stringify(r.info));
    pruefe('Mehrzahl des Hinweises: «Leere Textebenen entfernt.»', /Leere Textebenen entfernt\./.test(r.st), r.st);
    await r.s.schliessen();
  }
  // Fall 3: NUR eine leere Ebene: wie bisher abgelehnt, die Ebene bleibt, kein Dialog, kein Upload
  {
    const r = await e1Fall(b, srv, 'Shirt', T71, PC, async (p) => { await p.getByRole('button', { name: '➕ Text' }).click(); });
    pruefe('nur eine leere Textebene: abgelehnt, kein Dialog', !r.offen && /Füge zuerst/.test(r.st) && r.s.uploads.length === 0 && r.s.warenkorb.length === 0, r.st);
    pruefe('nur eine leere Textebene: die Ebene bleibt (wie bisher)', r.info.length === 1 && r.info[0].e.length === 1 && r.info[0].e[0].type === 'text', JSON.stringify(r.info));
    await r.s.schliessen();
  }
  // Fall 4: Tasse (flache Bühne)
  {
    const r = await e1Fall(b, srv, 'Tasse', T19, PC, async (p) => { await textHinzufuegen(p, 'Tasse'); await p.getByRole('button', { name: '➕ Text' }).click(); });
    pruefe('Tasse: Text plus leere Textebene: der Dialog öffnet sich, nur der Text bleibt', r.offen && r.info.length === 1 && r.info[0].e.length === 1 && r.info[0].e[0].text === 'Tasse', JSON.stringify([r.offen, r.info, r.st]));
    await r.s.schliessen();
  }
  // Fall 5: Englisch
  {
    const r = await e1Fall(b, srv, 'Shirt', T71 + '&lang=en', PC, async (p) => { await textHinzufuegen(p, 'Hi'); await p.getByRole('button', { name: '➕ Text' }).click(); });
    pruefe('Englisch: Dialog offen, Hinweis «Empty text layer removed.»', r.offen && /Empty text layer removed\./.test(r.st), r.st);
    await r.s.schliessen();
  }
  // Fall 6: die leere Ebene liegt auf einer ANDEREN Platzierung als der aktiven (Rückseite leer, Vorderseite mit Foto): sie wird dort entfernt, die Rückseite zählt nicht mehr als verwendet
  {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await motivHinzu(p); await bilderGeladen(p);
    await p.locator('.lsp6-tab', { hasText: 'Rückseite' }).click();
    await p.getByRole('button', { name: '➕ Text' }).click();
    await p.locator('.lsp6-tab', { hasText: 'Vorderseite' }).first().click();
    pruefe('Vorbereitung: Rückseite trägt eine leere Textebene, die Vorderseite das Foto', JSON.stringify((await ebenenInfo(p)).map((x) => [x.p, x.e.map((e) => e.type)])) === '[["front",["image"]],["back",["text"]]]', JSON.stringify(await ebenenInfo(p)));
    const punktVorher = await p.locator('.lsp6-tab', { hasText: 'Rückseite' }).locator('.dot').count();
    await ctaKlick(p);
    await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 8000 });
    pruefe('Reiter «Rückseite»: vorher mit Punkt (trägt eine Ebene), nach dem Entfernen ohne Punkt', punktVorher === 1 && (await p.locator('.lsp6-tab', { hasText: 'Rückseite' }).locator('.dot').count()) === 0, `${punktVorher} → ${await p.locator('.lsp6-tab', { hasText: 'Rückseite' }).locator('.dot').count()}`);
    pruefe('Dialog offen; nur die Vorderseite im Dialog', (await p.locator('[data-review-placement]').count()) === 1 && (await p.locator('[data-review-placement="front"]').count()) === 1);
    pruefe('die leere Ebene der Rückseite ist weg', JSON.stringify((await ebenenInfo(p)).map((x) => x.p)) === '["front"]', JSON.stringify(await ebenenInfo(p)));
    await reviewBestaetigen(p);
    await p.waitForURL('**/cart', { timeout: 30000 });
    const pod = JSON.parse(s.warenkorb[0].properties._pod_karte);
    pruefe('Warenkorb: _pod_karte.pl nennt nur die Vorderseite (kein Aufpreis für eine leere Rückseite)', JSON.stringify(pod.pl) === '["front"]' && s.uploads.filter((u) => u.typ === 'png').length >= 1, JSON.stringify(pod));
    pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // Fall 7: die Druckdatei des Kaufs mit der leeren Ebene ist byte-gleich zu der OHNE sie (6.4.2 räumt nur auf); die Gegenprobe gegen 6.4.1 steht im «kaufvergleich»
});

// ── E3 Schieber und Drehung ─────────────────────────────────────────────────────────────────────
szenario('zahlen-schieber-drehung', true, async (b, srv) => {
  const s = await oeffnen(b, srv, T71);
  const p = s.page;
  await sichtWarten(p);
  await motivHinzu(p, '#2040c0', 4000); await bilderGeladen(p);
  const min = await p.evaluate(() => { const r = document.querySelector('.lsp6 input[type=range]'); return [...document.querySelectorAll('.lsp6 input[type=range]')].map((x) => x.min + '/' + x.max + '/' + x.step); });
  pruefe('Schieber «Grösse» beginnt bei 0,06 (wie die Ebene), geht bis 3', min.some((m) => m === '0.06/3/0.02'), JSON.stringify(min));
  // sehr kleine Ebene über das Feld: der Schieber zeigt den richtigen Wert (±1 Schritt), ein Pfeil lässt die Ebene nicht um das Zweieinhalbfache springen
  await feldSetzen(p, 'Breite (cm)', 1.1);
  const klein = (await ebenenInfo(p))[0].e[0].scale;
  const reg = () => p.evaluate(() => { const r = [...document.querySelectorAll('.lsp6 input[type=range]')].find((x) => x.max === '3'); return Number(r.value); });
  pruefe(`Ebene bei Breite 1,1 cm: Skala ${klein.toFixed(3)} < 0,15`, klein < 0.15 && klein > 0.06, String(klein));
  pruefe('der Schieber steht bei dieser Ebene auf dem richtigen Wert (±0,011)', Math.abs((await reg()) - klein) <= 0.011, `${await reg()} gegen ${klein}`);
  await p.evaluate(() => { const r = [...document.querySelectorAll('.lsp6 input[type=range]')].find((x) => x.max === '3'); r.focus(); });
  await p.keyboard.press('ArrowRight');
  const nach = (await ebenenInfo(p))[0].e[0].scale;
  pruefe(`ein Pfeil nach rechts verändert die Skala um einen Schritt (0,02) plus das Einrasten des Schiebers (höchstens 0,01), nicht um das Zweieinhalbfache (vorher ${klein.toFixed(3)}, nachher ${nach.toFixed(3)})`, nach > klein && nach - klein <= 0.0311, `${klein} → ${nach}`);
  // Griff: 160° im Uhrzeigersinn drehen (Winkel ausserhalb von ±180 entstand bis 6.4.1), danach ein anderes Feld bestätigen: keine Drehung, kein Sprung
  await feldSetzen(p, 'Breite (cm)', 8); await feldSetzen(p, 'X (cm)', 15); await feldSetzen(p, 'Y (cm)', 20); await feldSetzen(p, 'Drehung °', 0);
  await buehneZeigen(p);
  async function griffDrehen(grad, schritt = 10) {
    const g = await p.evaluate(() => { const r = (q) => { const x = document.querySelector(q).getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2 }; }; return { c: r('.lsp6-layer.sel'), h: r('.lsp6-handle') }; });
    const r0 = Math.hypot(g.h.x - g.c.x, g.h.y - g.c.y), w0 = Math.atan2(g.h.y - g.c.y, g.h.x - g.c.x);
    await p.mouse.move(g.h.x, g.h.y); await p.mouse.down();
    const nSchritte = Math.ceil(Math.abs(grad) / schritt);
    for (let i = 1; i <= nSchritte; i++) { const w = w0 + (grad * i / nSchritte) * Math.PI / 180; await p.mouse.move(g.c.x + r0 * Math.cos(w), g.c.y + r0 * Math.sin(w)); }
    await p.mouse.up();
  }
  for (const grad of [160, -200]) {
    await feldSetzen(p, 'Drehung °', 0);
    await griffDrehen(grad);
    const e = (await ebenenInfo(p))[0].e[0];
    pruefe(`Griff um ${grad}° gedreht: der Winkel liegt in −180 … 180 (${e.rot.toFixed(1)})`, e.rot >= -180 && e.rot <= 180, String(e.rot));
    const feld = Number(await feldEingabe(p, 'Drehung °').inputValue());
    pruefe(`das Zahlenfeld «Drehung» zeigt einen gültigen Wert (${feld})`, feld >= -180 && feld <= 180, String(feld));
    const sichtbar = e.rot;
    await feldSetzen(p, 'Deckkraft %', 90);
    const e2 = (await ebenenInfo(p))[0].e[0];
    pruefe(`danach ein anderes Feld bestätigt: die Ebene dreht sich nicht nach (${sichtbar.toFixed(1)} → ${e2.rot.toFixed(1)})`, Math.abs(e2.rot - sichtbar) < 0.51, `${sichtbar} → ${e2.rot}`);
    await feldSetzen(p, 'Deckkraft %', 100);
  }
  // Zwei-Finger-Geste (synthetische Zeigerereignisse): 60° und 20° ergeben 60 und 20, nicht −300 und −340
  for (const grad of [60, 20, -75]) {
    await feldSetzen(p, 'Drehung °', 0);
    const rot = await p.evaluate(async (grad) => {
      const root = document.querySelector('.lsp6-layer.sel');
      const r = root.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = 60;
      const ev = (typ, id, x, y) => root.dispatchEvent(new PointerEvent(typ, { pointerId: id, bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: id === 1 }));
      ev('pointerdown', 1, cx + R, cy); ev('pointerdown', 2, cx - R, cy);   // Verbindungslinie waagerecht, Finger 1 rechts
      const w = (grad * Math.PI) / 180;
      for (let i = 1; i <= 6; i++) { const a = (w * i) / 6; ev('pointermove', 1, cx + R * Math.cos(a), cy + R * Math.sin(a)); ev('pointermove', 2, cx - R * Math.cos(a), cy - R * Math.sin(a)); }
      ev('pointerup', 1, 0, 0); ev('pointerup', 2, 0, 0);
      return window.LSPOD6.editors[0].st.ebenen.front[0].rot;
    }, grad);
    pruefe(`Zwei-Finger-Drehung um ${grad}° ergibt rot = ${grad} (ist ${rot.toFixed(1)}), nicht ${(grad - 360).toFixed(0)}`, Math.abs(rot - grad) < 0.6 && rot >= -180 && rot <= 180, String(rot));
  }
  // Entwurf: ein gespeicherter Winkel ausserhalb von ±180 (6.4.0/6.4.1) kommt zurückgerechnet zurück (Unit-Test prüft die Funktion; hier der Weg über localStorage)
  await ed(p, '(ed) => { ed.entfernen(ed.st.ebenen.front[0].id); }');
  await textHinzufuegen(p, 'Entwurf');
  await ed(p, '(ed) => { ed.st.ebenen.front[0].rot = -200; ed.speichern(); ed.entwurfSofort(); }');
  await s.page.reload({ waitUntil: 'domcontentloaded' });
  await editorBereit(s.page);
  const rot = await s.page.evaluate(() => { const l = window.LSPOD6.editors[0].st.ebenen.front; return l.length ? l[0].rot : null; });
  pruefe('Entwurf mit Winkel −200 kommt als 160 zurück', rot === 160, String(rot));
  pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
  await s.schliessen();
});

// ── E4 Fehlertexte, kaputte Bilddatei ───────────────────────────────────────────────────────────
const ROH = /Failed to fetch|Unexpected token|Unexpected end|JSON|Invalid image|\bimg\b|\bfailed\b|NetworkError|Load failed|<\/?[a-z]/i;
async function kaufenBisFehler(p) {
  await ctaKlick(p);
  await reviewBestaetigen(p);
  await p.waitForFunction(() => /Konnte nicht hinzufügen|Could not add/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 20000 });
}
szenario('fehlertexte', true, async (b, srv) => {
  // Warenkorb-Antworten: Netz weg, HTML-Fehlerseite, leere 429, Text des Shops (kurz, lang, mit HTML)
  const faelle = [
    ['Netz weg (Anfrage abgebrochen)', (r) => r.abort('failed'), /Verbindung unterbrochen/],
    ['HTML-Fehlerseite 502', (r) => r.fulfill({ status: 502, contentType: 'text/html', body: '<html><body>Bad gateway</body></html>' }), /Das hat nicht geklappt/],
    ['leere Antwort 429', (r) => r.fulfill({ status: 429, contentType: 'application/json', body: '' }), /Das hat nicht geklappt/],
    ['422 ohne Text des Shops', (r) => r.fulfill({ status: 422, contentType: 'application/json', body: '{"status":422}' }), /Das hat nicht geklappt/],
    ['422 mit Text des Shops', (r) => r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ description: 'Alle 2 Stück von «Shirt» sind im Warenkorb.' }) }), /Alle 2 Stück von «Shirt» sind im Warenkorb\./],
    ['422 mit HTML im Text', (r) => r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ description: '<b>Nur noch 2</b> Stück <a href="/x">hier</a>' }) }), /Nur noch 2 Stück hier/],
    ['422 mit langem Text', (r) => r.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ description: 'Z'.repeat(400) }) }), /^Konnte nicht hinzufügen: Z{119}…$/],
  ];
  for (const [name, antwort, soll] of faelle) {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await p.route('**/cart/add.js', antwort);
    await textHinzufuegen(p, 'Test');
    await kaufenBisFehler(p);
    const st = await statusText(p);
    pruefe(`${name}: Statuszeile «${st.slice(0, 70)}»`, soll.test(st), st);
    pruefe(`${name}: kein Rohtext (Failed to fetch, JSON, img, failed, HTML-Tags)`, !ROH.test(st) || /Z{119}/.test(st), st);
    pruefe(`${name}: der Kauf bleibt möglich (Knopf frei, Dialog zu)`, !(await dialogOffen(p)) && (await p.locator('.lsp6-cta').evaluate((e) => !e.disabled)), '');
    pruefe(`${name}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // Englisch
  {
    const s = await oeffnen(b, srv, T71 + '&lang=en');
    const p = s.page;
    await sichtWarten(p);
    await p.route('**/cart/add.js', (r) => r.abort('failed'));
    await textHinzufuegen(p, 'Test');
    await kaufenBisFehler(p);
    const st = await statusText(p);
    pruefe('Englisch: Netz weg → «Connection lost. Please try again.»', /Connection lost\. Please try again\./.test(st) && !/Failed to fetch/.test(st), st);
    await s.schliessen();
  }
  // Der Aufbau der Druckprüfung scheitert (ein Bild lässt sich nicht zeichnen, Kürzel «img»): deutscher Satz, kein Rohtext, der Dialog öffnet sich nicht
  {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await ed(p, '(ed) => { const e = ed.neuesBild("data:image/png;base64,AAAA", 4000, 4000); e.printUrl = "https://res.cloudinary.com/x/kaputt.png"; }');
    await ed(p, '(ed) => ed.waehlen(null)');
    // die Druckdatei zeichnet das Bild von seiner Cloudinary-Adresse: sie ist weg (404), das Zeichnen scheitert mit dem Kürzel «img»
    await p.route('https://res.cloudinary.com/**', (r) => r.fulfill({ status: 404, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'nicht da' }));
    await ctaKlick(p);
    await p.waitForFunction(() => /Konnte nicht hinzufügen/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 20000 });
    const st = await statusText(p);
    pruefe('Aufbau der Druckprüfung scheitert: «Konnte nicht hinzufügen: Das hat nicht geklappt. Bitte erneut versuchen.», kein Rohtext', /^Konnte nicht hinzufügen: Das hat nicht geklappt\. Bitte erneut versuchen\.$/.test(st) && !ROH.test(st), st);
    pruefe('Aufbau der Druckprüfung scheitert: kein Dialog, Knopf frei', !(await dialogOffen(p)) && (await p.locator('.lsp6-cta').evaluate((e) => !e.disabled)));
    pruefe('Aufbau der Druckprüfung scheitert: keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // Foto-Upload: Cloudinary lehnt ein lesbares Bild mit englischem Text ab → deutscher Satz
  {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await p.route('https://api.cloudinary.com/**', (r) => r.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { message: 'Invalid image file' } }) }));
    await p.locator('input[type=file]').setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: Buffer.from(geisterPng()) });
    await p.waitForFunction(() => /Upload-Fehler/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 15000 });
    const st = await statusText(p);
    pruefe('Upload abgelehnt (400, englischer Servertext): deutscher Satz, kein Rohtext', /Upload-Fehler: Das Foto konnte nicht hochgeladen werden/.test(st) && !/Invalid/.test(st), st);
    await s.schliessen();
  }
  // Kaputte Bilddatei (Text mit Endung .png): keine Ebene bleibt, deutsche Meldung, der Kauf mit einem Text danach geht
  for (const [vp, opt] of [['PC', PC], ['Handy', MOBIL]]) {
    const s = await oeffnen(b, srv, T71, opt);
    const p = s.page;
    await sichtWarten(p);
    await p.route('https://api.cloudinary.com/**', (r) => r.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { message: 'Invalid image file' } }) }));
    await textHinzufuegen(p, 'Dabei');
    await p.locator('input[type=file]').setInputFiles({ name: 'kaputt.png', mimeType: 'image/png', buffer: Buffer.from('das ist kein Bild, nur Text') });
    await p.waitForFunction(() => /nicht öffnen/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 15000 });
    await p.waitForTimeout(500);   // auch der (abgelehnte) Upload ist inzwischen durch: seine Meldung darf die richtige nicht überschreiben
    const st = await statusText(p);
    const info = await ebenenInfo(p);
    pruefe(`kaputte Datei (${vp}): Meldung «Diese Datei lässt sich nicht öffnen …», kein englischer Rohtext`, /Diese Datei lässt sich nicht öffnen\. Bitte wähle ein anderes Bild \(PNG, JPG oder WebP\)\./.test(st) && !/Invalid|Upload-Fehler/.test(st), st);
    pruefe(`kaputte Datei (${vp}): keine leere Bild-Ebene bleibt, der Text bleibt`, info.length === 1 && info[0].e.length === 1 && info[0].e[0].type === 'text', JSON.stringify(info));
    pruefe(`kaputte Datei (${vp}): kein Chip «Bild» in der Ebenenleiste`, (await p.locator('.lsp6-chip', { hasText: 'Bild' }).count()) === 0);
    await p.evaluate(() => window.LSPOD6.editors[0].waehlen(null));
    await ctaKlick(p);
    pruefe(`kaputte Datei (${vp}): danach öffnet sich der Prüfdialog (kein «img»)`, await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false), await statusText(p));
    pruefe(`kaputte Datei (${vp}): keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
});

// ── E2 Griffe: sichtbar, treffbar, bei sehr kleinen Ebenen nicht unter der Ebenenmitte ───────────────
const griffInfo = (p) => p.evaluate(() => {
  const sb = document.querySelector('.lsp6-stage').getBoundingClientRect();
  const m = (q) => { const e = document.querySelector(q); if (!e || e.hidden) return null; const x = e.getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2 }; };
  const L = document.querySelector('.lsp6-layer.sel'), lr = L && L.getBoundingClientRect();
  let sicht = null;
  if (lr) { const l = Math.max(lr.left, sb.left), r = Math.min(lr.right, sb.right), t = Math.max(lr.top, sb.top), b = Math.min(lr.bottom, sb.bottom); if (r > l && b > t) sicht = { x: (l + r) / 2, y: (t + b) / 2, w: r - l, h: b - t }; }
  return { st: { l: sb.left, t: sb.top, r: sb.right, b: sb.bottom }, h: m('.lsp6-handle'), d: m('.lsp6-del'), L: lr && { x: lr.left + lr.width / 2, y: lr.top + lr.height / 2, w: lr.width, h: lr.height }, sicht };
});
const imStueck = (g, k, eps = 0.6) => !!g[k] && g[k].x - 15 >= g.st.l - eps && g[k].y - 15 >= g.st.t - eps && g[k].x + 15 <= g.st.r + eps && g[k].y + 15 <= g.st.b + eps;
/** Trifft jeder Punkt der Mitte und vier Punkte im Abstand 9 px (Kreis mit Radius 15) den Knopf? */
const knopfTrifft = (p, pt, sel) => p.evaluate(([x, y, sel]) => [[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9]].every(([dx, dy]) => { const e = document.elementFromPoint(x + dx, y + dy); return !!e && !!e.closest(sel); }), [pt.x, pt.y, sel]);
const unterKnopf = (p, pt) => p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!e && !!e.closest('.lsp6-handle, .lsp6-del'); }, [pt.x, pt.y]);

const E2_ARTEN = [
  ['Produktbühne «Bearbeiten» (Shirt)', T71, async () => {}],
  ['«Druckversion» (Shirt)', T71, async (p) => { await ed(p, '(ed) => ed.sichtSetzen("druck")'); }],
  ['flache Bühne (Tasse)', T19, async () => {}],
];
const E2_GROESSEN = ['A', 'Mama', '😀', 'Bild'];
const E2_LAGEN = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.5, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]];
szenario('griffe-klein-rand', true, async (b, srv) => {
  for (const [vpName, vp] of [['PC', PC], ['Handy', MOBIL]]) {
    for (const [artName, query, vorbereiten] of E2_ARTEN) {
      const s = await oeffnen(b, srv, query, vp);
      const p = s.page;
      await sichtWarten(p);
      await vorbereiten(p);
      const masse = await ed(p, '(ed) => ed.geo().masse');
      let ungueltig = [];
      for (const groesse of E2_GROESSEN) {
        await ed(p, '(ed) => { Object.keys(ed.st.ebenen).forEach((id) => ed.st.ebenen[id].slice().forEach((e) => ed.entfernen(e.id))); }');
        if (groesse === 'Bild') { await motivHinzu(p, '#2040c0', 4000); await bilderGeladen(p); await feldSetzen(p, 'Breite (cm)', 0.9); }
        else { await ed(p, '(ed, t) => ed.neuerText(t)', groesse); }
        for (const [cx, cy] of E2_LAGEN) {
          for (const rot of (cx === 1 && cy === 1) || (cx === 0 && cy === 0) ? [0, 35] : [0]) {
            await feldSetzen(p, 'X (cm)', (cx * masse.breite).toFixed(2)); await feldSetzen(p, 'Y (cm)', (cy * masse.hoehe).toFixed(2)); await feldSetzen(p, 'Drehung °', rot);
            await buehneZeigen(p);
            await p.waitForTimeout(30);
            const g = await griffInfo(p);
            const was = `${groesse} an (${cx}|${cy}) Drehung ${rot}°`;
            const probleme = [];
            if (!imStueck(g, 'h')) probleme.push('Skalieren-Griff nicht ganz in der Bühne');
            if (!imStueck(g, 'd')) probleme.push('Löschknopf nicht ganz in der Bühne');
            if (g.h && !(await knopfTrifft(p, g.h, '.lsp6-handle'))) probleme.push('Skalieren-Griff nicht trefferbar');
            if (g.d && !(await knopfTrifft(p, g.d, '.lsp6-del'))) probleme.push('Löschknopf nicht trefferbar');
            const randMitte = (cx === 0.5 || cx === 0 || cx === 1) && (cy === 0.5 || cy === 0 || cy === 1) && !((cx === 0 || cx === 1) && (cy === 0 || cy === 1));   // Mitte und Kantenmitten; die vier Ecken nur für die Knöpfe
            if (randMitte && g.sicht && (await unterKnopf(p, g.sicht))) probleme.push('Mitte der Ebene liegt unter einem Griff');
            if (probleme.length) ungueltig.push(`${was}: ${probleme.join(', ')}`);
          }
        }
      }
      pruefe(`${vpName}, ${artName}: ${E2_GROESSEN.length} Grössen × 9 Lagen: Griffe in der Bühne, trefferbar, Ebenenmitte frei`, ungueltig.length === 0, ungueltig.slice(0, 4).join(' | ') + (ungueltig.length > 4 ? ` … (${ungueltig.length} Fälle)` : ''));
      // Bedienung: Tippen/Klicken auf die Mitte einer kleinen Ebene löscht sie nie; Ziehen aus der Mitte verschiebt; das Löschkreuz löscht weiter
      await ed(p, '(ed) => { Object.keys(ed.st.ebenen).forEach((id) => ed.st.ebenen[id].slice().forEach((e) => ed.entfernen(e.id))); }');
      await ed(p, '(ed, t) => ed.neuerText(t)', 'Mama');
      await feldSetzen(p, 'X (cm)', (0.5 * masse.breite).toFixed(2)); await feldSetzen(p, 'Y (cm)', (0.5 * masse.hoehe).toFixed(2)); await feldSetzen(p, 'Drehung °', 0);
      await buehneZeigen(p);
      let g = await griffInfo(p);
      // Soll-Lage der Griffe bei einer ungedrehten Ebene mitten in der Bühne (nichts wird an die Kante geschoben): Mitte des Griffs 6 px ausserhalb der Ecke der Mindestschicht max(64, Breite) × max(64, Höhe)
      {
        const bw = Math.max(64, g.L.w), bh = Math.max(64, g.L.h);
        const abw = [g.h.x - (g.L.x + bw / 2 + 6), g.h.y - (g.L.y + bh / 2 + 6), g.d.x - (g.L.x - bw / 2 - 6), g.d.y - (g.L.y - bh / 2 - 6)].map((v) => Math.round(v * 10) / 10);
        pruefe(`${vpName}, ${artName}: "Mama" (${Math.round(g.L.w)} × ${Math.round(g.L.h)} px) mitten in der Bühne: Skalieren-Griff und Löschkreuz sitzen 6 px ausserhalb der Ecken der Mindestschicht ${bw} × ${bh} (Abweichung höchstens 1,5 px)`, abw.every((v) => Math.abs(v) <= 1.5), JSON.stringify(abw));
      }
      if (vp.mobil) await p.touchscreen.tap(g.L.x, g.L.y); else await p.mouse.click(g.L.x, g.L.y);
      pruefe(`${vpName}, ${artName}: ein Tipp auf die Mitte einer kleinen Ebene ("Mama") löscht sie nicht`, (await ebenenAnzahl(p)) === 1, String(await ebenenAnzahl(p)));
      g = await griffInfo(p);
      const vorher = (await ebenenInfo(p))[0].e[0];
      await p.mouse.move(g.L.x, g.L.y); await p.mouse.down(); await p.mouse.move(g.L.x + 24, g.L.y + 18, { steps: 5 }); await p.mouse.up();
      const nachher = (await ebenenInfo(p))[0].e[0];
      pruefe(`${vpName}, ${artName}: Ziehen aus der Mitte verschiebt die kleine Ebene (cx ${vorher.cx.toFixed(3)} → ${nachher.cx.toFixed(3)})`, nachher.cx > vorher.cx + 0.005 && nachher.cy > vorher.cy + 0.005, JSON.stringify([vorher, nachher]));
      g = await griffInfo(p);
      await p.mouse.click(g.d.x, g.d.y);
      pruefe(`${vpName}, ${artName}: ein Klick auf das Löschkreuz löscht die Ebene weiterhin`, (await ebenenAnzahl(p)) === 0);
      pruefe(`${vpName}, ${artName}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
      await s.schliessen();
    }
  }
});

// ── E5 ausverkaufte Ausführung ──────────────────────────────────────────────────────────────────
async function warteBis(fn, ms = 6000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 50)); } return false; }
const PRODUKT = (verf, extra = {}) => ({ body: { id: 1, title: 'Test-Shirt', handle: 'test-shirt', variants: [1001, 1002, 1003].map((id) => ({ id, available: verf[id] !== false })) }, ...extra });
const E5_SEITE = { seitenPfad: '/products/test-shirt' };
const ctaGesperrt = (p) => p.locator('.lsp6-cta').getAttribute('aria-disabled').then((a) => a === 'true');
const hinweisText = async (p) => ((await p.locator('[data-feld="modellhinweis"]').innerText().catch(() => '')) || '').trim();
const hinweisSichtbar = async (p) => !(await p.locator('[data-feld="modellhinweis"]').isHidden());
const zweiteZuerst = (lang) => T71.replace(/varianten=[^&]*/, lang === 'en' ? 'varianten=1002:Black,1001:White,1003:Pink' : 'varianten=1002:Schwarz,1001:Weiss,1003:Pink');
szenario('ausverkauft', true, async (b, srv) => {
  // 1. 1002 ist ausverkauft (available:false), 1001 und 1003 sind frei
  {
    const s = await oeffnen(b, srv, T71, { ...E5_SEITE, produktJs: () => PRODUKT({ 1002: false }) });
    const p = s.page;
    await sichtWarten(p);
    await warteBis(() => s.produktAnfragen.length >= 1);
    await p.waitForTimeout(350);   // die Antwort ist da und verarbeitet
    pruefe('genau eine Anfrage an /products/test-shirt.js beim Start', s.produktAnfragen.length === 1 && s.produktAnfragen[0] === 'test-shirt', JSON.stringify(s.produktAnfragen));
    await textHinzufuegen(p, 'Test');
    pruefe('freie Ausführung (1001): Kaufknopf nicht gesperrt, kein Hinweis', !(await ctaGesperrt(p)) && !(await hinweisSichtbar(p)), await hinweisText(p));
    await p.locator('input[name="id"][value="1002"]').check();
    await warteBis(() => ctaGesperrt(p));
    pruefe('ausverkaufte Ausführung (1002): Kaufknopf trägt aria-disabled', await ctaGesperrt(p));
    const hin = await hinweisText(p);
    pruefe('ausverkaufte Ausführung: Hinweis «Diese Ausführung ist ausverkauft. Bitte wähle eine andere.»', /Diese Ausführung ist ausverkauft\. Bitte wähle eine andere\./.test(hin), hin);
    await ctaKlick(p);
    await p.waitForTimeout(400);
    pruefe('Klick auf den gesperrten Knopf: Meldung, KEIN Dialog, KEIN Upload, KEIN Warenkorb', !(await dialogOffen(p)) && s.uploads.length === 0 && s.warenkorb.length === 0 && /ausverkauft/.test(await statusText(p)), `${await statusText(p)} | uploads ${s.uploads.length}`);
    if (await dialogOffen(p)) await p.locator('.lsp6-review-back').click();   // gegen eine Fassung ohne die Sperre öffnet sich hier der Dialog: schliessen, damit der Rest weiterläuft
    await p.locator('input[name="id"][value="1003"]').check();
    await warteBis(async () => !(await ctaGesperrt(p)));
    pruefe('zurück auf eine freie Ausführung (1003): Sperre und Hinweis weg', !(await ctaGesperrt(p)) && !(await hinweisSichtbar(p)), await hinweisText(p));
    await ctaKlick(p);
    pruefe('freie Ausführung: der Prüfdialog öffnet sich', await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false), await statusText(p));
    pruefe('der Wechsel zwischen den Ausführungen löste keine weitere Anfrage aus (höchstens alle zwei Minuten)', s.produktAnfragen.length === 1, JSON.stringify(s.produktAnfragen));
    pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // 2. nicht erreichbar oder unbrauchbar: unbekannt heisst erlauben
  const unbekannt = [
    ['404 (nichts ausgeliefert)', () => null],
    ['HTTP 500', () => ({ status: 500, body: 'Fehler' })],
    ['HTTP 429', () => ({ status: 429, body: '' })],
    ['kein JSON', () => ({ typ: 'text/html', body: '<html>gesperrt</html>' })],
    ['JSON ohne Varianten', () => ({ body: { id: 1 } })],
    ['Varianten ohne available', () => ({ body: { variants: [{ id: 1002 }] } })],
    ['nur eine andere Variante (1003) ausverkauft', () => PRODUKT({ 1003: false })],
  ];
  for (const [name, antwort] of unbekannt) {
    const s = await oeffnen(b, srv, T71, { ...E5_SEITE, produktJs: antwort });
    const p = s.page;
    await sichtWarten(p);
    await warteBis(() => s.produktAnfragen.length >= 1);
    await p.waitForTimeout(300);
    await p.locator('input[name="id"][value="1003"]').check();
    await p.waitForTimeout(300);
    await p.locator('input[name="id"][value="1002"]').check();
    await p.waitForTimeout(300);
    await textHinzufuegen(p, 'Test');
    pruefe(`${name}: Ausführung 1002 bleibt kaufbar (Knopf frei, kein Hinweis)`, !(await ctaGesperrt(p)) && !(await hinweisSichtbar(p)), await hinweisText(p));
    pruefe(`${name}: auch nach dem Wechsel zwischen drei Ausführungen bleibt es bei einer Anfrage (nach einem Fehler oder einer Antwort fragt der Editor höchstens alle zwei Minuten neu)`, s.produktAnfragen.length === 1, JSON.stringify(s.produktAnfragen));
    await ctaKlick(p);
    pruefe(`${name}: der Prüfdialog öffnet sich`, await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false), await statusText(p));
    pruefe(`${name}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // 3. die Antwort kommt spät (1,2 s): bis dahin kaufbar, danach ist die gewählte Ausführung (1002, im Formular die erste) gesperrt
  {
    const s = await oeffnen(b, srv, zweiteZuerst(), { ...E5_SEITE, produktJs: () => PRODUKT({ 1002: false }, { verzoegerung: 1200 }) });
    const p = s.page;
    await sichtWarten(p);
    pruefe('späte Antwort: zuerst «unbekannt» (nicht gesperrt)', !(await ctaGesperrt(p)));
    await warteBis(() => ctaGesperrt(p), 8000);
    pruefe('späte Antwort: danach gesperrt, Hinweis «ausverkauft»', (await ctaGesperrt(p)) && /ausverkauft/.test(await hinweisText(p)), await hinweisText(p));
    await s.schliessen();
  }
  // 4. keine Produktseite (kein /products/<handle> in der Adresse): keine Anfrage, nichts gesperrt
  {
    const s = await oeffnen(b, srv, T71, { produktJs: () => PRODUKT({ 1001: false }) });
    await sichtWarten(s.page);
    await s.page.waitForTimeout(400);
    pruefe('Adresse ohne /products/<handle>: keine Anfrage, nichts gesperrt', s.produktAnfragen.length === 0 && !(await ctaGesperrt(s.page)), JSON.stringify(s.produktAnfragen));
    await s.schliessen();
  }
  // 5. eine Kombination, die es nicht gibt (gewählte Ausführung nicht wählbar): Kaufknopf gesperrt, Hinweis, Klick ohne Upload
  {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await textHinzufuegen(p, 'Test');
    await p.evaluate(() => { document.querySelectorAll('input[name="id"]').forEach((i) => { i.disabled = true; }); document.dispatchEvent(new Event('change')); });
    await warteBis(() => ctaGesperrt(p));
    pruefe('Kombination fehlt: Kaufknopf trägt aria-disabled', await ctaGesperrt(p));
    pruefe('Kombination fehlt: Hinweis «Diese Kombination gibt es nicht»', /Diese Kombination gibt es nicht/.test(await hinweisText(p)), await hinweisText(p));
    await ctaKlick(p);
    await p.waitForTimeout(300);
    pruefe('Kombination fehlt: Klick zeigt eine Meldung, kein Dialog, kein Upload', !(await dialogOffen(p)) && s.uploads.length === 0 && s.warenkorb.length === 0 && (await statusText(p)).length > 0, await statusText(p));
    await p.evaluate(() => { document.querySelectorAll('input[name="id"]').forEach((i) => { i.disabled = false; }); document.dispatchEvent(new Event('change')); });
    await warteBis(async () => !(await ctaGesperrt(p)));
    pruefe('Kombination wieder da: Sperre weg', !(await ctaGesperrt(p)));
    pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // 6. Englisch
  {
    const s = await oeffnen(b, srv, zweiteZuerst('en') + '&lang=en', { ...E5_SEITE, produktJs: () => PRODUKT({ 1002: false }) });
    const p = s.page;
    await sichtWarten(p);
    await warteBis(() => ctaGesperrt(p), 8000);
    pruefe('Englisch: «This option is sold out. Please pick another one.»', /This option is sold out\. Please pick another one\./.test(await hinweisText(p)), await hinweisText(p));
    await s.schliessen();
  }
  // 7. der Lagerstand ändert sich: nach mehr als zwei Minuten liest der Editor ihn beim nächsten Wechsel der Ausführung neu (Uhr der Seite um 130 s vorgestellt)
  {
    let nr = 0;
    const ZEIT = '(function () { var alt = Date.now; window.__dt = 0; Date.now = function () { return alt.call(Date) + window.__dt; }; })();';
    const s = await oeffnen(b, srv, T71, { ...E5_SEITE, initSkript: ZEIT, produktJs: () => PRODUKT(nr++ === 0 ? {} : { 1003: false }) });
    const p = s.page;
    await sichtWarten(p);
    await warteBis(() => s.produktAnfragen.length >= 1);
    await p.waitForTimeout(300);
    await p.locator('input[name="id"][value="1003"]').check();
    await p.waitForTimeout(400);
    pruefe('erste Antwort: alles lieferbar, 1003 ist kaufbar', !(await ctaGesperrt(p)) && s.produktAnfragen.length === 1, JSON.stringify(s.produktAnfragen));
    await p.evaluate(() => { window.__dt = 130000; });   // 2 Minuten 10 Sekunden später
    await p.locator('input[name="id"][value="1001"]').check();
    await warteBis(() => s.produktAnfragen.length >= 2);
    await p.waitForTimeout(400);
    pruefe('nach über zwei Minuten und einem Wechsel: der Lagerstand wird neu gelesen (zweite Anfrage)', s.produktAnfragen.length === 2, JSON.stringify(s.produktAnfragen));
    pruefe('1001 ist weiter lieferbar (Knopf frei)', !(await ctaGesperrt(p)));
    await p.locator('input[name="id"][value="1003"]').check();
    await warteBis(() => ctaGesperrt(p));
    pruefe('die neue Antwort gilt: 1003 ist jetzt ausverkauft, Knopf gesperrt, Hinweis da', (await ctaGesperrt(p)) && /ausverkauft/.test(await hinweisText(p)), await hinweisText(p));
    pruefe('danach keine weitere Anfrage (der Stand ist frisch)', s.produktAnfragen.length === 2, JSON.stringify(s.produktAnfragen));
    pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
});

// ── E6 Esc und Fokus in den Dialogen ────────────────────────────────────────────────────────────
async function pruefDialogOeffnen(p) {
  await ctaKlick(p);
  await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 20000 });
}
const fokusInDialog = (p) => p.evaluate(() => { const d = document.querySelector('[data-lsp6-review="1"]'); return !!d && d.contains(document.activeElement); });
szenario('esc-fokus', true, async (b, srv) => {
  const ziele = [
    ['Überschrift', '.lsp6-review h2', 6],
    ['Einleitung', '.lsp6-review .lsp6-modal-s', 6],
    ['Zusammenfassung', '.lsp6-review-summary', 6],
    ['Druckdatei-Bild', '[data-review-print]', 6],
    ['Meta-Zeile', '.lsp6-review-meta', 6],
    ['Rand des Panels', '.lsp6-review-panel', 3],
  ];
  for (const [vpName, vp, query] of [['Shirt PC', PC, T71], ['Shirt Handy', MOBIL, T71], ['Tasse PC', PC, T19], ['Tasse Handy', MOBIL, T19]]) {
    const s = await oeffnen(b, srv, query, vp);
    const p = s.page;
    await sichtWarten(p);
    await textHinzufuegen(p, 'Esc');
    const offenGeblieben = [];
    for (const [name, sel, y] of ziele) {
      await pruefDialogOeffnen(p);
      const ziel = p.locator(sel).first();
      const box = await ziel.boundingBox();
      await ziel.click({ position: { x: sel === '.lsp6-review-panel' ? Math.max(4, box.width / 2) : Math.min(6, box.width / 2), y: Math.min(y, box.height / 2) } });
      const fokusDanach = await p.evaluate(() => { const a = document.activeElement; return a === document.body ? 'BODY' : (a && a.getAttribute('data-lsp6-review') ? 'DIALOG' : (a ? a.tagName : 'nichts')); });
      if (!(await dialogOffen(p))) continue;   // der Klick hat selbst geschlossen (Hintergrund getroffen): hier nichts zu messen
      await p.keyboard.press('Escape');
      await p.waitForTimeout(80);
      if (await dialogOffen(p)) { offenGeblieben.push(`${name} (Fokus ${fokusDanach})`); await p.locator('.lsp6-review-back').click(); }
      await p.waitForTimeout(40);
    }
    pruefe(`${vpName}: Esc schliesst den Prüfdialog nach einem Klick auf ${ziele.map((z) => z[0]).join(', ')}`, offenGeblieben.length === 0, 'bleibt offen nach: ' + offenGeblieben.join(', '));
    // Der Fokus liegt nach dem Klick auf Text im Dialog (nicht auf BODY), ohne sichtbaren Rahmen am Dialog
    await pruefDialogOeffnen(p);
    await p.locator('.lsp6-review h2').click();
    const fok = await p.evaluate(() => { const d = document.querySelector('[data-lsp6-review="1"]'); const a = document.activeElement; return { imDialog: !!a && d.contains(a), outline: getComputedStyle(d).outlineStyle, tab: d.getAttribute('tabindex') }; });
    pruefe(`${vpName}: nach einem Klick auf Text liegt der Fokus im Dialog (nicht auf BODY), ohne sichtbaren Rahmen`, fok.imDialog && fok.outline === 'none', JSON.stringify(fok));
    const aktiv = (klasse) => p.evaluate((k) => !!document.activeElement && document.activeElement.classList.contains(k), klasse);
    await p.keyboard.press('Shift+Tab');
    pruefe(`${vpName}: Umschalt+Tab nach einem Klick auf Text bleibt im Dialog, auf dem letzten bedienbaren Element («Weiter gestalten»)`, (await fokusInDialog(p)) && (await aktiv('lsp6-review-back')));
    await p.locator('.lsp6-review h2').click();
    await p.keyboard.press('Tab');
    pruefe(`${vpName}: Tab nach einem Klick auf Text bleibt im Dialog, auf dem ersten Element (Häkchen der Bestätigung)`, (await fokusInDialog(p)) && (await aktiv('lsp6-review-accept')));
    // Tab im Dialog geht Schritt für Schritt weiter (der Handler am Dokument greift nicht in Tasten ein, die im Dialog liegen): Häkchen → «Weiter gestalten»
    await p.keyboard.press('Tab');
    pruefe(`${vpName}: Tab vom Häkchen führt zum nächsten Element («Weiter gestalten»), nicht zurück zum ersten`, await aktiv('lsp6-review-back'));
    // Der Fokus liegt auf BODY: Tab, Umschalt+Tab und Esc gelten trotzdem für den Dialog
    await p.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    pruefe(`${vpName}: Vorbereitung: Fokus auf BODY`, await p.evaluate(() => document.activeElement === document.body));
    await p.keyboard.press('Shift+Tab');
    pruefe(`${vpName}: Umschalt+Tab von BODY aus führt in den Dialog (nicht in Kopf- oder Fusszeile der Seite), auf das letzte Element`, (await fokusInDialog(p)) && (await aktiv('lsp6-review-back')));
    await p.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await p.keyboard.press('Tab');
    pruefe(`${vpName}: Tab von BODY aus führt in den Dialog, auf das erste Element`, (await fokusInDialog(p)) && (await aktiv('lsp6-review-accept')));
    await p.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(80);
    pruefe(`${vpName}: Esc mit dem Fokus auf BODY schliesst den Dialog`, !(await dialogOffen(p)));
    pruefe(`${vpName}: nach dem Schliessen liegt der Fokus auf dem Kaufknopf, die Seite ist nicht mehr inert`, (await p.waitForFunction(() => document.activeElement && document.activeElement.classList.contains('lsp6-cta'), null, { timeout: 3000 }).then(() => true, () => false)) && !(await p.evaluate(() => !!document.querySelector('[inert]'))));
    // Das Bestehende bleibt: Klick auf den Hintergrund (wo es ihn gibt) und «Weiter gestalten» schliessen
    await pruefDialogOeffnen(p);
    const hintergrund = await p.evaluate(() => { const d = document.querySelector('[data-lsp6-review="1"]'); const w = window.innerWidth, h = window.innerHeight; return [[3, 3], [w - 3, 3], [3, h - 3], [w - 3, h - 3]].find(([x, y]) => document.elementFromPoint(x, y) === d) || null; });
    if (hintergrund) {
      await p.mouse.click(hintergrund[0], hintergrund[1]);
      pruefe(`${vpName}: Klick auf den Hintergrund schliesst weiterhin`, !(await dialogOffen(p)));
      await pruefDialogOeffnen(p);
    }
    await p.locator('.lsp6-review-back').click();
    pruefe(`${vpName}: «Weiter gestalten» schliesst weiterhin`, !(await dialogOffen(p)));
    pruefe(`${vpName}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // Zuschneiden-Dialog und «Druck-Vorschau anzeigen»: Esc nach einem Klick auf die Überschrift
  {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await motivHinzu(p, '#2040c0', 4000); await bilderGeladen(p);
    await p.getByRole('button', { name: /Zuschneiden/ }).click();
    await p.locator('.lsp6-modal[aria-label]').waitFor({ state: 'visible', timeout: 8000 });
    await p.locator('.lsp6-modal-t').click();
    await p.keyboard.press('Escape');
    await p.waitForTimeout(80);
    pruefe('Zuschneiden-Dialog: Esc nach einem Klick auf die Überschrift schliesst ihn', (await p.locator('.lsp6-modal').count()) === 0);
    await p.locator('.lsp6-preview').click();
    await p.locator('.lsp6-modal[aria-label]').waitFor({ state: 'visible', timeout: 20000 });
    await p.locator('.lsp6-modal-t').click();
    await p.keyboard.press('Escape');
    await p.waitForTimeout(80);
    pruefe('«Druck-Vorschau anzeigen»: Esc nach einem Klick auf die Überschrift schliesst den Dialog', (await p.locator('.lsp6-modal').count()) === 0);
    pruefe('keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
});

// ── E7 kein Layoutsprung, wenn die Vorschaudaten rechtzeitig eintreffen ─────────────────────────────
// Gemessen wird in jedem Bild (requestAnimationFrame) ab dem ersten Erscheinen der Bühne: Lage und Grösse der Bühne, ob die Reiterleiste da ist, welche Ansicht gilt; dazu die Layoutverschiebung des Browsers (layout-shift).
const E7_INIT = `
window.__proben = []; window.__cls = 0; window.__wartet500 = 0;
(function () { var alt = window.setTimeout; window.setTimeout = function (f, ms) { if (ms === 500) window.__wartet500++; return alt.apply(window, arguments); }; })();
try { new PerformanceObserver(function (l) { l.getEntries().forEach(function (e) { if (!e.hadRecentInput) window.__cls += e.value; }); }).observe({ type: 'layout-shift', buffered: true }); } catch (x) { /* egal */ }
(function tick() {
  var st = document.querySelector('.lsp6-stage');
  if (st) {
    var r = st.getBoundingClientRect(), s = document.querySelector('[data-feld="sicht"]'), rd = function (v) { return Math.round(v * 10) / 10; };
    window.__proben.push({ t: Math.round(performance.now()), x: rd(r.left), y: rd(r.top), w: rd(r.width), h: rd(r.height), a: st.getAttribute('data-ansicht'), s: !!s && !s.hidden });
  }
  if (performance.now() < 2600) requestAnimationFrame(tick);
})();`;
async function e7Messen(b, srv, query, vp, vverz, ref = false) {
  const q = query.replace('&vorschau=', `&vverz=${vverz}&vorschau=`) + (ref ? '&editor=ref' : '');
  const s = await oeffnen(b, srv, q, { ...vp, initSkript: E7_INIT });
  const p = s.page;
  await p.waitForFunction(() => performance.now() > 2700, null, { timeout: 15000 });
  const r = await p.evaluate(() => ({ proben: window.__proben, cls: window.__cls, wartet500: window.__wartet500 }));
  r.fehler = s.fehler.slice();
  await s.schliessen();
  return r;
}
const e7Zusammen = (r) => { const e = r.proben[0]; return e ? `erstes Bild ${e.t} ms: ${e.a}, Reiter ${e.s ? 'da' : 'fehlen'}, Bühne ${e.x}|${e.y}|${e.w}x${e.h}; Bilder ${r.proben.length}; verschiedene Lagen ${new Set(r.proben.map((x) => [x.x, x.y, x.w, x.h, x.a, x.s].join('|'))).size}; CLS ${r.cls.toFixed(3)}` : 'keine Probe'; };
szenario('layoutsprung', true, async (b, srv) => {
  const klein = [];
  const verschieden = (r) => new Set(r.proben.map((x) => [x.x, x.y, x.w, x.h, x.a, x.s].join('|'))).size;
  for (const [vpName, vp] of [['PC', PC], ['Handy', MOBIL]]) {
    for (const [artName, query, ansicht] of [['Shirt (Produktbühne)', T71, 'bearbeiten'], ['Tasse (flache Bühne)', T19, null]]) {
      for (const vverz of [0, 150, 400]) {
        const r = await e7Messen(b, srv, query, vp, vverz);
        const e = r.proben[0];
        const stabil = r.proben.length > 5 && r.proben.every((x) => x.x === e.x && x.y === e.y && x.w === e.w && x.h === e.h && x.a === e.a && x.s === e.s);
        const was = `${vpName}, ${artName}, Vorschaudaten nach ${vverz} ms`;
        pruefe(`${was}: schon im ersten Bild sind die Reiter da${ansicht ? ' und die Ansicht ist «Bearbeiten»' : ''}`, !!e && e.s === true && (!ansicht || e.a === ansicht), e7Zusammen(r));
        if (vverz === 150) pruefe(`${was}: der Bau wartet nicht länger als nötig (erstes Bild nach den Daten, vor Ablauf der Wartezeit von 500 ms plus Ladezeit: unter 540 ms)`, !!e && e.t < 540, e7Zusammen(r));
        pruefe(`${was}: die Bühne bewegt sich danach nie (Lage, Grösse, Ansicht, Reiter in jedem Bild gleich)`, stabil, e7Zusammen(r));
        pruefe(`${was}: die Layoutverschiebung des Browsers bleibt unter 0,1 (Grenze «gut» der Web Vitals)`, r.cls < 0.1, e7Zusammen(r));
        pruefe(`${was}: keine Seitenfehler`, r.fehler.length === 0, r.fehler.join(' | '));
        klein.push(`6.4.2 ${was}: ${e7Zusammen(r)}`);
        if (vverz === 150) {
          // Bezug: die Fassung 6.4.1 (editor=ref) auf derselben Seite springt (zwei verschiedene Lagen: erst ohne, dann mit Reitern); das beweist, dass die Messung den Sprung sieht
          const a = await e7Messen(b, srv, query, vp, vverz, true);
          pruefe(`${was}: Bezug: die Referenz 6.4.1 springt auf derselben Seite (Reiter fehlen im ersten Bild, mindestens zwei Lagen), die geprüfte Fassung nicht (eine Lage)`, a.proben.length > 0 && a.proben[0].s === false && verschieden(a) >= 2 && verschieden(r) === 1, `6.4.1: ${e7Zusammen(a)} | geprüft: ${e7Zusammen(r)}`);
          klein.push(`6.4.1 ${was}: ${e7Zusammen(a)}`);
        }
      }
    }
  }
  console.log('    Layoutsprung (Messung je Bild, CLS = Layoutverschiebung des Browsers):\n    ' + klein.join('\n    '));
  // Kommen die Daten zu spät (1,5 s, mehr als die Wartezeit): der Editor steht nach höchstens der Wartezeit da, wie bisher; die Reiter folgen beim Eintreffen
  {
    const r = await e7Messen(b, srv, T71, PC, 1500);
    const e = r.proben[0];
    pruefe('späte Daten (1,5 s): der Editor steht lange vor den Daten da (nicht blockiert)', !!e && e.t < 1300, e7Zusammen(r));
    pruefe('späte Daten: im ersten Bild noch ohne Reiter (alter Weg), danach erscheinen sie von selbst', !!e && e.s === false && r.proben.some((x) => x.s === true) && r.proben[r.proben.length - 1].a === 'bearbeiten', e7Zusammen(r));
    pruefe('späte Daten: keine Seitenfehler', r.fehler.length === 0, r.fehler.join(' | '));
  }
  // Ohne Quelle für Vorschaudaten wartet der Bau nie (kein Timer der Wartezeit), der Editor läuft wie bisher
  {
    const q = 'karte=71&shop=1001:4012,1002:4020,1003:4045&bearbeiten=1&themeregel=1&varianten=1001:Weiss,1002:Schwarz,1003:Pink';
    const s = await oeffnen(b, srv, q, { ...PC, initSkript: E7_INIT });
    await s.page.waitForTimeout(800);
    const r = await s.page.evaluate(() => ({ wartet500: window.__wartet500, s: !!document.querySelector('[data-feld="sicht"]:not([hidden])'), init: document.querySelector('.lspod-designer-v6').getAttribute('data-init-v6') }));
    pruefe('ohne Vorschaudaten-Quelle: kein Wartetimer, Editor gebaut, keine Reiter', r.wartet500 === 0 && r.init === '1' && r.s === false, JSON.stringify(r));
    pruefe('ohne Vorschaudaten-Quelle: keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // Mit Quelle und langsamen Daten läuft der Wartetimer genau einmal (Gegenprobe zum vorigen)
  {
    const s = await oeffnen(b, srv, T71.replace('&vorschau=', '&vverz=300&vorschau='), { ...PC, initSkript: E7_INIT });
    await sichtWarten(s.page);
    const w = await s.page.evaluate(() => window.__wartet500);
    pruefe('mit Quelle und Daten nach 300 ms: der Bau hat genau einmal auf die Daten gewartet', w === 1, String(w));
    await s.schliessen();
  }
});

// ── Kaufvergleich: byteglich zu 6.4.1 in allen bisher erfolgreichen Abläufen ───────────────────
async function variante(p, wert) {   // Auswahl im Formular der Attrappe wie im Theme (Radio mit name="id"); wartet, bis der Editor die Ausführung übernommen hat
  await p.locator(`input[name="id"][value="${wert}"]`).check();
  const pv = { 1001: 4012, 1002: 4020, 1003: 4045 }[wert];
  if (pv) await p.waitForFunction((x) => window.LSPOD6.editors[0].st.pfVariante === x, pv, { timeout: 5000 });
  await p.waitForTimeout(80);
}
/** Eine Bestellung durchspielen (Druckprüfung bestätigen, Warenkorb-Anfrage abfangen); gibt die Eigenschaften zurück, jede Cloudinary-Adresse durch den SHA-256 der hochgeladenen Bytes ersetzt. */
async function kauf(b, srv, ref, query, aktion, opt = {}) {
  const s = await oeffnen(b, srv, query + (ref ? '&editor=ref' : ''), opt);
  const p = s.page;
  const hashes = {}; let zaehler = 0;
  await p.route('https://api.cloudinary.com/**', async (route) => {
    const buf = route.request().postDataBuffer() || Buffer.alloc(0);
    const idx = ++zaehler;
    const png = pngAusKoerper(buf);
    if (png) hashes[idx] = 'png:' + sha256(png.png);
    else { const a = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff])), e = buf.lastIndexOf(Buffer.from([0xff, 0xd9])); hashes[idx] = a >= 0 && e > a ? 'jpg:' + sha256(buf.subarray(a, e + 2)) : 'roh:' + sha256(buf); }
    await route.fallback();
  });
  await sichtWarten(p);
  await aktion(p);
  const version = await p.evaluate(() => window.LSPOD6.version);   // vor dem Kauf: danach steht die Warenkorb-Seite da
  const rots = await p.evaluate(() => Object.values(window.LSPOD6.editors[0].st.ebenen).flat().map((e) => e.rot));   // die gespeicherten Drehwinkel aller Ebenen (E3: 6.4.2 rechnet auf −180 … 180 zurück)
  await p.locator('.lsp6-cta').click({ force: true });
  await reviewBestaetigen(p);
  await p.waitForURL('**/cart', { timeout: 30000 });
  const wk = s.warenkorb[0];
  const props = {};
  for (const [k, w] of Object.entries((wk && wk.properties) || {})) {
    const m = /\/mock\/(\d+)\.png$/.exec(String(w));
    props[k] = m ? (hashes[Number(m[1])] || 'unbekannt:' + m[1]) : w;
  }
  const r = { props, rest: { ...wk, properties: undefined }, uploads: Object.values(hashes), fehler: s.fehler.slice(), version, warenkorbAnzahl: s.warenkorb.length, rots };
  await s.schliessen();
  return r;
}
const unterschiede = (a, c) => [...new Set([...Object.keys(a), ...Object.keys(c)])].filter((k) => a[k] !== c[k]);
const aktionMotiv = (v, farbe, opt = {}) => async (p) => {
  if (v !== 1001) await variante(p, v);
  if (!opt.nurBild) {
    await textHinzufuegen(p, 'Hallo Welt');
    await feldSetzen(p, 'Schrifthöhe (mm)', 22); await feldSetzen(p, 'X (cm)', 8); await feldSetzen(p, 'Y (cm)', 12);
    if (farbe) await p.locator(`.lsp6-sw[data-c="${farbe}"]`).click();
  }
  if (opt.bild !== false) {
    await motivHinzu(p, '#2040c0', 4000); await bilderGeladen(p);   // gemeldete Originalgrösse 4000 px: das Qualitätstor sperrt den Kauf nicht
    await feldSetzen(p, 'X (cm)', 18); await feldSetzen(p, 'Y (cm)', 25); await feldSetzen(p, 'Breite (cm)', 7); await feldSetzen(p, 'Drehung °', opt.rot != null ? opt.rot : 20);
  }
  if (opt.leereEbene) await p.getByRole('button', { name: '➕ Text' }).click();   // E1: eine leere Textebene neben dem Foto
  if (opt.ansicht) await ed(p, '(ed, a) => ed.sichtSetzen(a)', opt.ansicht);
  if (opt.ansicht === 'produkt') await p.waitForTimeout(500);
  if (!opt.leereEbene) await ed(p, '(ed) => ed.waehlen(null)');
};
const aktionText = (rot, v = 1001) => async (p) => {
  if (v !== 1001) await variante(p, v);
  await textHinzufuegen(p, 'Drehung');
  await feldSetzen(p, 'Schrifthöhe (mm)', 22); await feldSetzen(p, 'X (cm)', 10); await feldSetzen(p, 'Y (cm)', 14); await feldSetzen(p, 'Drehung °', rot);
  await ed(p, '(ed) => ed.waehlen(null)');
};
const aktionTasse = (mitBild) => async (p) => {
  await textHinzufuegen(p, 'Tasse');
  if (mitBild) { await motivHinzu(p, '#c03020', 4000); await bilderGeladen(p); await feldSetzen(p, 'Drehung °', 15); }
  await ed(p, '(ed) => ed.waehlen(null)');
};
const LAGER_ALLES_DA = { seitenPfad: '/products/test-shirt', produktJs: () => PRODUKT({}) };
szenario('kaufvergleich', true, async (b, srv) => {
  const REF = (/var VERSION = '([\d.]+)'/.exec(readFileSync(process.env.V6_REF_DATEI, 'utf8')) || [])[1];
  const NEU = (/var VERSION = '([\d.]+)'/.exec(quelle) || [])[1];
  const prog = [];
  // gleich: alle Eigenschaften, alle Upload-Bytes (Druckdateien und Vorschau-JPEG) und der Rest der Warenkorb-Anfrage
  const gleich = [
    ['weisser Stoff, Standardfarbe, Text und Bild', T71, {}, aktionMotiv(1001, null)],
    ['schwarzer Stoff, gewählte dunkle Farbe (#111111)', T71, {}, aktionMotiv(1002, '#111111')],
    ['schwarzer Stoff, gewähltes Rot', T71, {}, aktionMotiv(1002, '#b3122b')],
    ['pinker Stoff, gewählte dunkle Farbe', T71, {}, aktionMotiv(1003, '#111111')],
    ['pinker Stoff, gewähltes Blau', T71, {}, aktionMotiv(1003, '#1e4fd6')],
    ['schwarzer Stoff, nur ein Bild (kein Text)', T71, {}, aktionMotiv(1002, null, { nurBild: true })],
    ['schwarzer Stoff, Standardfarbe (weiss seit 6.4.1), Text und Bild', T71, {}, aktionMotiv(1002, null)],
    ['schwarzer Stoff, Kauf aus «Druckversion»', T71, {}, aktionMotiv(1002, '#111111', { ansicht: 'druck' })],
    ['schwarzer Stoff, Kauf aus «Vorschau»', T71, {}, aktionMotiv(1002, '#111111', { ansicht: 'produkt' })],
    ['weisser Stoff, Kauf aus «Vorschau»', T71, {}, aktionMotiv(1001, null, { ansicht: 'produkt' })],
    ['Drehung 179° (Bild)', T71, {}, aktionMotiv(1001, null, { rot: 179 })],
    ['Drehung -179° (Bild)', T71, {}, aktionMotiv(1001, null, { rot: -179 })],
    ['Drehung 180° (Bild)', T71, {}, aktionMotiv(1001, null, { rot: 180 })],
    ['Drehung -180° (Bild)', T71, {}, aktionMotiv(1001, null, { rot: -180 })],
    ['Drehung 0° (Bild)', T71, {}, aktionMotiv(1001, null, { rot: 0 })],
    ['Drehung 90° (Text)', T71, {}, aktionText(90)],
    ['Drehung -45° (Text)', T71, {}, aktionText(-45)],
    ['Tasse, Text', T19, {}, aktionTasse(false)],
    ['Tasse, Text und Bild gedreht um 15°', T19, {}, aktionTasse(true)],
    ['Shirt auf einer Produktseite mit Lagerangabe (alles lieferbar)', T71, LAGER_ALLES_DA, aktionMotiv(1001, null)],
    ['Shirt, Lagerabruf scheitert (HTTP 500): Kauf bleibt erlaubt', T71, { seitenPfad: '/products/test-shirt', produktJs: () => ({ status: 500, body: 'x' }) }, aktionMotiv(1001, null)],
  ];
  for (const [name, query, opt, aktion] of gleich) {
    const alt = await kauf(b, srv, true, query, aktion, opt);
    const neu = await kauf(b, srv, false, query, aktion, opt);
    const d = unterschiede(alt.props, neu.props);
    pruefe(`${name}: verglichen werden die Referenz ${REF} und die geprüfte Fassung (${neu.version})`, alt.version === REF && REF === '6.4.1' && neu.version === NEU, `${alt.version} gegen ${neu.version}`);
    pruefe(`${name}: Druckdatei, _pod_karte, _vorschau und alle Eigenschaften byte-gleich zu ${REF}`, d.length === 0 && Object.keys(alt.props).length >= 3, `Unterschiede: ${d.join(', ')} | ${JSON.stringify(Object.keys(alt.props))}`);
    pruefe(`${name}: Uploads (Anzahl und SHA-256 jedes hochgeladenen Bytestroms) und die übrige Warenkorb-Anfrage gleich`, JSON.stringify(alt.uploads) === JSON.stringify(neu.uploads) && JSON.stringify(alt.rest) === JSON.stringify(neu.rest), JSON.stringify([alt.uploads, neu.uploads]));
    pruefe(`${name}: Eigenschaften vollständig: Druckdatei, Design, _pod_karte, _vorschau`, ['_pod_karte', '_vorschau'].every((k) => !!neu.props[k]) && Object.keys(neu.props).some((k) => /Druckdatei/.test(k)), JSON.stringify(Object.keys(neu.props)));
    pruefe(`${name}: genau eine Warenkorb-Anfrage, keine Seitenfehler`, alt.warenkorbAnzahl === 1 && neu.warenkorbAnzahl === 1 && alt.fehler.length === 0 && neu.fehler.length === 0, JSON.stringify([alt.fehler, neu.fehler]));
    prog.push(`${name}: ${d.length === 0 ? 'gleich' : 'ANDERS ' + d.join(',')}`);
  }
  // E1: Foto plus leere Textebene. 6.4.1 sperrte diesen Kauf (kein bisher erfolgreicher Ablauf); der Vergleich ist das Foto allein in 6.4.1 gegen Foto plus leere Ebene in 6.4.2 (die leere Ebene wird entfernt, bevor irgendetwas gebaut wird)
  {
    const alt = await kauf(b, srv, true, T71, aktionMotiv(1002, null, { nurBild: true }));
    const neu = await kauf(b, srv, false, T71, aktionMotiv(1002, null, { nurBild: true, leereEbene: true }));
    const d = unterschiede(alt.props, neu.props);
    pruefe('E1: Foto + leere Textebene (6.4.2) gegen Foto allein (6.4.1): Druckdatei, _pod_karte, _vorschau und alle Eigenschaften byte-gleich', d.length === 0 && Object.keys(neu.props).length >= 3, `Unterschiede: ${d.join(', ')}`);
    pruefe('E1: Uploads und die übrige Warenkorb-Anfrage gleich', JSON.stringify(alt.uploads) === JSON.stringify(neu.uploads) && JSON.stringify(alt.rest) === JSON.stringify(neu.rest), JSON.stringify([alt.uploads, neu.uploads]));
    pruefe('E1: keine Seitenfehler', alt.fehler.length === 0 && neu.fehler.length === 0, JSON.stringify([alt.fehler, neu.fehler]));
    prog.push(`E1 Foto+leere Textebene gegen Foto allein: ${d.length === 0 ? 'gleich' : 'ANDERS ' + d.join(',')}`);
  }
  // E3: Drehwinkel jenseits von ±180. Das Zahlenfeld «Drehung» begrenzte schon in 6.4.1 auf −180 … 180 (gemessen: Eingabe 200 ergibt 180); jenseits davon kam ein Winkel nur durch den Drehgriff, die
  // Zwei-Finger-Geste oder einen gespeicherten Entwurf zustande. 6.4.2 rechnet ihn auf −180 … 180 zurück (gleiche Drehung, kleinerer Wert). Gemessen wird der Weg über einen gespeicherten Entwurf (Textebene mit dem Winkel,
  // Entwurf sichern, Seite neu laden, kaufen): ändert sich dadurch ÜBERHAUPT ein Byte der Druckdatei oder des Vorschaubilds? Jede Abweichung würde benannt und begründet.
  const rotFaelle = [200, -200, 270, -270, 360, 540, -540, 725];
  const rotErgebnis = [];
  const rotErwartet = (r) => ((r + 180) % 360 + 360) % 360 - 180;   // handgerechnet: 200 → −160, −200 → 160, 270 → −90, −270 → 90, 360 → 0, 540 → −180, −540 → −180, 725 → 5
  const aktionEntwurfRot = (rot) => async (p) => {
    await textHinzufuegen(p, 'Drehung');
    await feldSetzen(p, 'Schrifthöhe (mm)', 22); await feldSetzen(p, 'X (cm)', 10); await feldSetzen(p, 'Y (cm)', 14);
    await ed(p, '(ed, r) => { ed.st.ebenen.front[0].rot = r; ed.speichern(); ed.entwurfSofort(); }', rot);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await editorBereit(p);
    await sichtWarten(p);
    await ed(p, '(ed) => ed.waehlen(null)');
  };
  for (const rot of rotFaelle) {
    const alt = await kauf(b, srv, true, T71, aktionEntwurfRot(rot));
    const neu = await kauf(b, srv, false, T71, aktionEntwurfRot(rot));
    const d = unterschiede(alt.props, neu.props);
    pruefe(`E3 Entwurf mit Winkel ${rot}°: Bezug: 6.4.2 hat ${rotErwartet(rot)}° geladen (gleiche Drehung, Wert im Bereich)`, neu.rots.length === 1 && neu.rots[0] === rotErwartet(rot), `6.4.1 ${JSON.stringify(alt.rots)}, 6.4.2 ${JSON.stringify(neu.rots)}`);
    prog.push(`E3 Entwurf mit Winkel ${rot}°: geladener Winkel 6.4.1 ${JSON.stringify(alt.rots)}, 6.4.2 ${JSON.stringify(neu.rots)}`);
    pruefe(`E3 Entwurf mit Winkel ${rot}°: Druckdatei, _pod_karte, _vorschau und alle Eigenschaften byte-gleich zu 6.4.1`, d.length === 0 && Object.keys(neu.props).length >= 3, `Unterschiede: ${d.join(', ')}`);
    pruefe(`E3 Entwurf mit Winkel ${rot}°: Uploads und die übrige Warenkorb-Anfrage gleich, keine Seitenfehler`, JSON.stringify(alt.uploads) === JSON.stringify(neu.uploads) && JSON.stringify(alt.rest) === JSON.stringify(neu.rest) && alt.fehler.length === 0 && neu.fehler.length === 0, JSON.stringify([alt.uploads, neu.uploads, alt.fehler, neu.fehler]));
    rotErgebnis.push(`${rot}° → ${neu.rots[0]}°: ${d.length === 0 ? 'byte-gleich zu 6.4.1' : 'ANDERS in ' + d.join(', ')}`);
    prog.push(`E3 ${rotErgebnis[rotErgebnis.length - 1]}`);
  }
  console.log('    Kaufvergleich E3 (gespeicherter Entwurf mit Winkel jenseits von ±180): ' + rotErgebnis.join(' | '));
  // E3 (Zeichnung, Bild UND Text): derselbe Winkel als −200 und als 160 gezeichnet ergibt dieselbe Druckdatei. Gemessen in der Fassung selbst (Zustand direkt gesetzt, Druckdatei aus dem Zustand gebaut, 25 %).
  {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await motivHinzu(p, '#2040c0', 4000); await bilderGeladen(p);
    await feldSetzen(p, 'X (cm)', 18); await feldSetzen(p, 'Y (cm)', 25); await feldSetzen(p, 'Breite (cm)', 7);
    await textHinzufuegen(p, 'Drehung'); await feldSetzen(p, 'Schrifthöhe (mm)', 22); await feldSetzen(p, 'X (cm)', 10); await feldSetzen(p, 'Y (cm)', 14);
    const hash = (rot) => p.evaluate(async (r) => {
      const e = window.LSPOD6.editors[0];
      e.st.ebenen.front.forEach((l) => { l.rot = r; });
      const blob = await e.druckdateiErzeugen(e.st.aktiv, { skala: 0.25 });
      const h = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
      return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, '0')).join('');
    }, rot);
    const zeichnung = [];
    for (const [a, c] of [[-200, 160], [200, -160], [270, -90], [-270, 90], [360, 0], [540, -180], [725, 5], [-725, -5]]) {
      const h1 = await hash(a), h2 = await hash(c);
      pruefe(`E3 Zeichnung: Bild und Text mit ${a}° und mit ${c}° ergeben dieselbe Druckdatei (SHA-256)`, h1 === h2 && h1.length === 64, `${h1.slice(0, 12)} gegen ${h2.slice(0, 12)}`);
      zeichnung.push(`${a}° gegen ${c}°: ${h1 === h2 ? 'gleich' : 'ANDERS'}`);
    }
    prog.push('E3 Zeichnung (Bild + Text): ' + zeichnung.join(' | '));
    console.log('    Kaufvergleich E3 (Zeichnung, Bild und Text, derselbe Winkel in zwei Schreibweisen): ' + zeichnung.join(' | '));
    pruefe('E3 Zeichnung: keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  if (process.env.V6_VOLL) console.log('    ' + prog.join('\n    '));
});

// ── Runner ──────────────────────────────────────────────────────────────────────────────────────
const srv = await starteServer();
const browser = await chromium.launch();
const auswahl = szenarien.filter((x) => (nur === 'kern' ? x.kern : !nur || x.name.startsWith(nur)));
for (const sz of auswahl) {
  const t0 = Date.now();
  const vorher = fehler.length;
  try { await sz.fn(browser, srv); } catch (e) { n++; fehler.push(`${sz.name}: Ausnahme ${e.message.split('\n')[0]}`); console.log(`  ✗ ${sz.name}: Ausnahme ${e.message.split('\n').slice(0, process.env.V6_VOLL ? 40 : 3).join(' / ')}`); if (process.env.V6_VOLL) console.log('    ' + (e.stack || '').split('\n').filter((l) => /_test.mjs/.test(l)).slice(0, 3).join(' | ')); if (process.env.V6_ABBRUCH) process.exit(1); }
  console.log(`${fehler.length === vorher ? '✓' : '✗'} ${sz.name} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
await browser.close(); await srv.stop();
console.log(fehler.length ? `\n${fehler.length} von ${n} Prüfungen FEHLGESCHLAGEN` : `\n${n} Prüfungen bestanden`);
process.exit(fehler.length ? 1 : 0);
