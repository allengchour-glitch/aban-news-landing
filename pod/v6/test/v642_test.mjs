/**
 * Browser-Tests (Playwright, Chromium) für das Delta von Editor 6.4.2 gegenüber 6.4.1 (10.11.2026, Funde der Fehlersuche vom 10.11.):
 *   E1 leere Textebene neben anderem Inhalt sperrt den Kauf nicht mehr (OFF-01)
 *   E2 Löschkreuz und Skalieren-Griff im sichtbaren Bereich und treffbar: flache Bühne, «Druckversion», Produktbühne, auch bei sehr kleinen Ebenen (OFF-03, F5, OFF-07)
 *   E3 Schieber «Grösse» bis 0,06, Drehwinkel in −180 … 180 (OFF-02-Rest, OFF-04)
 *   E4 Fehlertexte ohne Rohtext, kaputte Bilddatei legt keine leere Ebene an (F1, F2)
 *   E5 ausverkaufte Ausführung und fehlende Kombination sperren den Kaufknopf sichtbar und vor jedem Upload (SW-06)
 *   E6 Esc und Fokus in den Dialogen (OFF-05)
 *   E7 kein Layoutsprung, wenn die Vorschaudaten rechtzeitig eintreffen (OFF-11)
 *   Korrekturrunde 11.11.2026 (Abnahme): «eckzone» (BE-1, BE-4: geklemmte Knöpfe über der Ebenenmitte, Beschriftung über dem Kreuz, echte Bedienung), «ausverkauft-adresse» (KA-07),
 *   «vorschau-fehlergrenze» (KA-05, BE-2, BE-6), dazu neue Fälle in «leere-textebene» (KA-03, RO-5), «zahlen» (BE-3), «fehlertexte» (KA-04, RO-1 bis RO-4, RO-6), «ausverkauft» (KA-01, KA-02), «kaufvergleich» (KA-06).
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
const { playwright, starteServer, seiteOeffnen, editorBereit, geisterPng, pngAusKoerper, pngErzeugen, pngRauschen, V6_DATEI } = await import('./lib.mjs');
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
  // Fall 8 (KA-03, RO-5, Korrekturrunde 11.11.): die Prüfung bricht NACH dem Aufräumen ab. Die Statuszeile nennt den Grund UND die entfernte Ebene (vorher verschwand sie ohne Erklärung); Rückgängig holt sie zurück
  const abbruchFall = async (query, opt, vorbereiten) => {
    const s = await oeffnen(b, srv, query, opt);
    const p = s.page;
    await sichtWarten(p);
    await vorbereiten(p);
    await ctaKlick(p);
    await p.waitForTimeout(500);
    return { s, p, offen: await dialogOffen(p), info: await ebenenInfo(p), st: await statusText(p) };
  };
  {
    const r = await abbruchFall(T71, PC, async (p) => {
      await textHinzufuegen(p, 'Hallo');
      await motivHinzu(p); await ed(p, '(ed) => { ed.st.ebenen.front.find((e) => e.type === "image").uploading = true; }');
      await p.getByRole('button', { name: '➕ Text' }).click();
    });
    pruefe('Fall 8a: Abbruch «Bild lädt noch» nach dem Aufräumen: kein Dialog, Grund und «Leere Textebene entfernt.»', !r.offen && /^Bild lädt noch hoch, bitte kurz warten … Leere Textebene entfernt\.$/.test(r.st), r.st);
    pruefe('Fall 8a: Text und Foto bleiben, die leere Ebene ist weg', JSON.stringify(r.info.map((x) => x.e.map((e) => e.type + ':' + (e.text || '')))) === '[["text:Hallo","image:"]]', JSON.stringify(r.info));
    await r.p.getByRole('button', { name: '↶ Rückgängig' }).click();
    pruefe('Fall 8a: Rückgängig holt die leere Ebene zurück', (await ebenenAnzahl(r.p)) === 3, String(await ebenenAnzahl(r.p)));
    pruefe('Fall 8a: keine Seitenfehler', kein(r.s), r.s.fehler.join(' | '));
    await r.s.schliessen();
  }
  {
    const r = await abbruchFall(T71, PC, async (p) => { await motivHinzu(p, '#2040c0', 300); await bilderGeladen(p); await p.getByRole('button', { name: '➕ Text' }).click(); await p.getByRole('button', { name: '➕ Text' }).click(); });
    pruefe('Fall 8b: Abbruch Qualitätssperre nach dem Aufräumen zweier leerer Ebenen: Grund und «Leere Textebenen entfernt.», kein Upload', !r.offen && /^Kauf gesperrt: .* Leere Textebenen entfernt\.$/.test(r.st) && r.s.uploads.length === 0, r.st);
    await r.s.schliessen();
  }
  {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await ed(p, '(ed) => { const e = ed.neuesBild("data:image/png;base64,AAAA", 4000, 4000); e.printUrl = "https://res.cloudinary.com/x/kaputt.png"; }');
    await p.getByRole('button', { name: '➕ Text' }).click();
    await ed(p, '(ed) => ed.waehlen(null)');
    await p.route('https://res.cloudinary.com/**', (rt) => rt.fulfill({ status: 404, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'nicht da' }));
    await ctaKlick(p);
    await p.waitForFunction(() => /Konnte nicht hinzufügen/.test(document.querySelector('[data-feld="status"]').innerText), null, { timeout: 20000 });
    const st = await statusText(p);
    pruefe('Fall 8c: Aufbau der Prüfung scheitert nach dem Aufräumen: Fehlersatz und «Leere Textebene entfernt.»', /^Konnte nicht hinzufügen: Das hat nicht geklappt\. Bitte erneut versuchen\. Leere Textebene entfernt\.$/.test(st), st);
    pruefe('Fall 8c: keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // Fall 8d: Englisch, Mehrzahl (RO-6: der englische Satz für mehrere Ebenen war ungetestet)
  {
    const r = await e1Fall(b, srv, 'Shirt', T71 + '&lang=en', PC, async (p) => { await textHinzufuegen(p, 'Hi'); await p.getByRole('button', { name: '➕ Text' }).click(); await p.getByRole('button', { name: '➕ Text' }).click(); });
    pruefe('Fall 8d: Englisch: Dialog offen, Hinweis «Empty text layers removed.»', r.offen && /^Empty text layers removed\.$/.test(r.st), r.st);
    await r.s.schliessen();
  }
  // Fall 9 (KA-03): die leere Ebene liegt auf der Rückseite, die Vorderseite trägt ein Foto, das noch hochlädt: der Klick bricht ab. Die versteckten Formularfelder des Warenkorbs nennen danach
  // die Rückseite nicht mehr (vorher blieben «🎨 Design (back)» und _pod_karte mit pl front+back und ap 6.1 bis zur nächsten Änderung stehen)
  {
    const s = await oeffnen(b, srv, T71, { cloudinaryVerzoegerung: (nr) => (nr === 1 ? 8000 : 0) });
    const p = s.page;
    await sichtWarten(p);
    const felder = () => p.evaluate(() => [...document.querySelectorAll('#produkt-form input[data-lspod6="1"]')].map((x) => [x.name, x.value]));
    const podKarte = (f) => { const z = f.find(([k]) => k === 'properties[_pod_karte]'); try { return z ? JSON.parse(z[1]) : null; } catch { return null; } };
    await p.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: pngErzeugen(1200, 900, [60, 120, 200]) });
    await p.waitForFunction(() => { const l = window.LSPOD6.editors[0].st.ebenen.front; return l.length === 1 && l[0].uploading; }, null, { timeout: 8000 });
    await p.locator('.lsp6-tab', { hasText: 'Rückseite' }).click();
    await p.getByRole('button', { name: '➕ Text' }).click();
    await p.locator('.lsp6-tab', { hasText: 'Vorderseite' }).first().click();
    await p.waitForTimeout(300);
    const vorher = await felder();
    pruefe('Fall 9: Vorbereitung: die versteckten Felder nennen die leere Rückseite (Design der Rückseite, pl front und back)', vorher.some(([k]) => /Design \(back\)/.test(k)) && JSON.stringify((podKarte(vorher) || {}).pl) === '["front","back"]', JSON.stringify(vorher.map(([k]) => k)));
    await ctaKlick(p);
    await p.waitForTimeout(500);
    const st = await statusText(p), nachher = await felder(), pk = podKarte(nachher) || {};
    pruefe('Fall 9: Abbruch «Bild lädt noch», mit Hinweis auf die entfernte Ebene', /^Bild lädt noch hoch, bitte kurz warten … Leere Textebene entfernt\.$/.test(st) && !(await dialogOffen(p)), st);
    pruefe('Fall 9: nur die Vorderseite trägt noch eine Ebene', JSON.stringify((await ebenenInfo(p)).map((x) => x.p)) === '["front"]', JSON.stringify(await ebenenInfo(p)));
    pruefe('Fall 9: die versteckten Felder nennen die Rückseite nicht mehr (kein Design der Rückseite, pl nur front, ap 0)', !nachher.some(([k]) => /\(back\)/.test(k)) && JSON.stringify(pk.pl) === '["front"]' && Number(pk.ap || 0) === 0, JSON.stringify([nachher.map(([k]) => k), pk.pl, pk.ap]));
    pruefe('Fall 9: keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // Fall 10 (KA-03): Foto plus zwei leere Ebenen auf einer ausverkauften Ausführung: Grund und Hinweis, kein Upload, nur das Foto bleibt
  {
    const s = await oeffnen(b, srv, T71, { ...E5_SEITE, produktJs: () => PRODUKT({ 1001: false }) });
    const p = s.page;
    await sichtWarten(p);
    await warteBis(() => s.produktAnfragen.length >= 1); await p.waitForTimeout(350);
    await motivHinzu(p); await bilderGeladen(p);
    await p.getByRole('button', { name: '➕ Text' }).click(); await p.getByRole('button', { name: '➕ Text' }).click();
    await ctaKlick(p);
    await p.waitForTimeout(400);
    const st = await statusText(p), info = await ebenenInfo(p);
    pruefe('Fall 10: ausverkauft nach dem Aufräumen: «… ausverkauft … Leere Textebenen entfernt.», kein Dialog, kein Upload', /^Diese Ausführung ist ausverkauft\. Bitte wähle eine andere\. Leere Textebenen entfernt\.$/.test(st) && !(await dialogOffen(p)) && s.uploads.length === 0, st);
    pruefe('Fall 10: nur das Foto bleibt', info.length === 1 && info[0].e.length === 1 && info[0].e[0].type === 'image', JSON.stringify(info));
    pruefe('Fall 10: keine Seitenfehler', kein(s), s.fehler.join(' | '));
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
  pruefe('Schieber «Grösse» beginnt bei 0,06 (wie die Ebene), geht bis 3, Schritt 0,01 (BE-3)', min.some((m) => m === '0.06/3/0.01'), JSON.stringify(min));
  // BE-3: die Startgrösse eines neuen Textes (Shirt 0,55, Tasse 0,35) und die Knöpfe «Klein/Mittel/Gross/Füllend» (0,6/1/1,5/2) liegen im Raster des Schiebers: der Schieber zeigt genau den Wert der Ebene,
  // und ein Pfeil hin und zurück führt auf den Startwert zurück (mit Schritt 0,02 zeigte er 0,56 und kam auf 0,56 zurück)
  const rasterFall = async (p2, soll, art) => {
    await textHinzufuegen(p2, 'Raster');
    const lies = () => p2.evaluate(() => { const ed = window.LSPOD6.editors[0], e = Object.values(ed.st.ebenen).flat().find((x) => x.id === ed.st.sel); const r = [...document.querySelectorAll('.lsp6 input[type=range]')].find((x) => x.max === '3'); return { e: e.scale, s: Number(r.value) }; });
    const v0 = await lies();
    pruefe(`${art}: neuer Text startet bei ${soll} und der Schieber zeigt genau diesen Wert`, Math.abs(v0.e - soll) < 1e-9 && Math.abs(v0.s - soll) < 1e-9, JSON.stringify(v0));
    await p2.evaluate(() => [...document.querySelectorAll('.lsp6 input[type=range]')].find((x) => x.max === '3').focus());
    await p2.keyboard.press('ArrowRight'); await p2.keyboard.press('ArrowLeft');
    const v1 = await lies();
    pruefe(`${art}: Pfeil rechts, dann links führt auf die Startgrösse ${soll} zurück`, Math.abs(v1.e - soll) < 1e-9, JSON.stringify(v1));
    for (const [knopfName, w] of [['Klein', 0.6], ['Mittel', 1], ['Gross', 1.5], ['Füllend', 2]]) {
      await p2.getByRole('button', { name: knopfName, exact: true }).click();
      const v = await lies();
      pruefe(`${art}: Knopf «${knopfName}» (${w}): Schieber zeigt genau den Wert der Ebene`, Math.abs(v.e - w) < 1e-9 && Math.abs(v.s - w) < 1e-9, JSON.stringify(v));
    }
  };
  for (const [art, q, soll] of [['Shirt', T71, 0.55], ['Tasse', T19, 0.35]]) { const s2 = await oeffnen(b, srv, q); await sichtWarten(s2.page).catch(() => {}); await rasterFall(s2.page, soll, art); pruefe(`${art}: keine Seitenfehler`, kein(s2), s2.fehler.join(' | ')); await s2.schliessen(); }
  // sehr kleine Ebene über das Feld: der Schieber zeigt den richtigen Wert (±1 Schritt), ein Pfeil lässt die Ebene nicht um das Zweieinhalbfache springen
  await feldSetzen(p, 'Breite (cm)', 1.1);
  const klein = (await ebenenInfo(p))[0].e[0].scale;
  const reg = () => p.evaluate(() => { const r = [...document.querySelectorAll('.lsp6 input[type=range]')].find((x) => x.max === '3'); return Number(r.value); });
  pruefe(`Ebene bei Breite 1,1 cm: Skala ${klein.toFixed(3)} < 0,15`, klein < 0.15 && klein > 0.06, String(klein));
  pruefe('der Schieber steht bei dieser Ebene auf dem richtigen Wert (höchstens ein halber Schritt, 0,005)', Math.abs((await reg()) - klein) <= 0.0051, `${await reg()} gegen ${klein}`);
  await p.evaluate(() => { const r = [...document.querySelectorAll('.lsp6 input[type=range]')].find((x) => x.max === '3'); r.focus(); });
  await p.keyboard.press('ArrowRight');
  const nach = (await ebenenInfo(p))[0].e[0].scale;
  pruefe(`ein Pfeil nach rechts verändert die Skala um einen Schritt (0,01) plus das Einrasten des Schiebers (höchstens 0,005), nicht um das Zweieinhalbfache (vorher ${klein.toFixed(3)}, nachher ${nach.toFixed(3)})`, nach > klein && nach - klein <= 0.0151, `${klein} → ${nach}`);
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
  // ── Korrekturrunde 11.11. ──
  const NEIN400 = (r) => r.fulfill({ status: 400, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ error: { message: 'Invalid image file' } }) });
  const statusWarten = (p, muster, ms = 15000) => p.waitForFunction((m) => new RegExp(m).test(document.querySelector('[data-feld="status"]').innerText), muster, { timeout: ms });
  // KA-04: ein GÜLTIGES Foto, bei dessen Einpassen eine Ausnahme auftritt (künstlich: die Grösse der Bühne lässt sich einmal nicht lesen), bleibt stehen wie bis 6.4.1; nur ein Foto, das sich nicht öffnen lässt, wird entfernt
  {
    const s = await oeffnen(b, srv, T71);
    const p = s.page;
    await sichtWarten(p);
    await p.evaluate(() => {
      const ed = window.LSPOD6.editors[0], host = document.querySelector('.lsp6-host'), alt = host.getBoundingClientRect.bind(host);
      host.getBoundingClientRect = function () { if (!window.__einmal && Object.values(ed.st.ebenen).some((l) => l.some((e) => e.type === 'image' && e._origW))) { window.__einmal = 1; throw new Error('test'); } return alt(); };
    });
    await p.locator('input[type=file]').setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: Buffer.from(geisterPng()) });
    await p.waitForFunction(() => window.__einmal === 1 && !/lädt|Wird hochgeladen/.test(document.querySelector('[data-feld="status"]').innerText) && Object.values(window.LSPOD6.editors[0].st.ebenen).flat().every((e) => !e.uploading), null, { timeout: 10000 }).catch(() => {});
    const bilder = await ed(p, '(ed) => Object.values(ed.st.ebenen).flat().filter((e) => e.type === "image").map((e) => ({ kaputt: !!e.kaputt, url: !!e.printUrl }))');
    const st = await statusText(p);
    pruefe('KA-04: der Wurf beim Einpassen ist wirklich aufgetreten (Vorbereitung)', await p.evaluate(() => window.__einmal === 1));
    pruefe('KA-04: gültiges Foto, Einpassen wirft einmal: die Bild-Ebene bleibt (nicht «kaputt», mit Adresse)', bilder.length === 1 && !bilder[0].kaputt && bilder[0].url, JSON.stringify(bilder));
    pruefe('KA-04: keine Meldung «lässt sich nicht öffnen»', !/nicht öffnen/.test(st), st);
    pruefe('KA-04: Chip «Bild» in der Ebenenleiste', (await p.locator('.lsp6-chip', { hasText: 'Bild' }).count()) === 1);
    await ed(p, '(ed) => ed.waehlen(null)');
    await ctaKlick(p);
    pruefe('KA-04: danach öffnet sich der Prüfdialog', await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false), await statusText(p));
    pruefe('KA-04: keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // RO-1: kaputte Bilddatei, danach «Rückgängig» und «Wiederholen»: die entfernte Ebene kommt nie zurück, kein leerer Schritt, der Kauf öffnet den Prüfdialog
  for (const [vp, opt] of [['PC', PC], ['Handy', MOBIL]]) {
    const s = await oeffnen(b, srv, T71, opt);
    const p = s.page;
    await sichtWarten(p);
    await p.route('https://api.cloudinary.com/**', NEIN400);
    await textHinzufuegen(p, 'Dabei');
    await p.waitForTimeout(900);   // der verzögerte Verlaufseintrag des Textes (700 ms) ist geschrieben
    await p.locator('input[type=file]').setInputFiles({ name: 'kaputt.png', mimeType: 'image/png', buffer: Buffer.from('das ist kein Bild, nur Text') });
    await statusWarten(p, 'nicht öffnen');
    await p.waitForTimeout(500);
    const bilder = () => ed(p, '(ed) => Object.values(ed.st.ebenen).reduce((a, l) => a + l.filter((e) => e.type === "image").length, 0)');
    const texte = () => ed(p, '(ed) => Object.values(ed.st.ebenen).reduce((a, l) => a.concat(l.filter((e) => e.type === "text").map((e) => e.text)), []).join("|")');
    const folge = [], textFolge = [];
    for (let i = 0; i < 3; i++) { await ed(p, '(ed) => ed.zurueck()'); folge.push(await bilder()); textFolge.push(await texte()); }
    for (let i = 0; i < 4; i++) { await ed(p, '(ed) => ed.wiederholen()'); folge.push(await bilder()); textFolge.push(await texte()); }
    pruefe(`RO-1 kaputte Datei, Rückgängig/Wiederholen (${vp}): die Bild-Ebene kommt nie zurück`, folge.every((x) => x === 0), JSON.stringify(folge));
    pruefe(`RO-1 kaputte Datei, Rückgängig (${vp}): der erste Schritt nimmt den Text zurück (kein leerer Schritt)`, textFolge[0] === '', JSON.stringify(textFolge));
    const info = await ebenenInfo(p);
    pruefe(`RO-1 kaputte Datei, Rückgängig/Wiederholen (${vp}): am Ende steht wieder nur der Text «Dabei», kein Chip «Bild»`, info.length === 1 && info[0].e.length === 1 && info[0].e[0].text === 'Dabei' && (await p.locator('.lsp6-chip', { hasText: 'Bild' }).count()) === 0, JSON.stringify(info));
    await ed(p, '(ed) => ed.waehlen(null)');
    await ctaKlick(p);
    pruefe(`RO-1 kaputte Datei, Rückgängig/Wiederholen (${vp}): der Kauf öffnet den Prüfdialog`, await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false), await statusText(p));
    pruefe(`RO-1 (${vp}): keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // RO-2, RO-6: Cloudinary lehnt das Foto ab, weil es zu viele Pixel oder zu viele Bytes hat, oder antwortet mit 413 ohne Text: je die passende Meldung, kein englischer Servertext
  for (const [name, opt, datei, soll, nicht, grund] of [
    ['Pixel', { cloudinaryMaxPixel: 500000 }, pngErzeugen(1000, 1000), /^Upload-Fehler: Das Foto hat zu viele Pixel für den Upload\. Bitte nimm eine kleinere Fassung\.$/, /10 MB|Image dimensions/, 'pixel'],
    ['Pixel, Englisch', { cloudinaryMaxPixel: 500000, lang: 'en' }, pngErzeugen(1000, 1000), /^Upload error: The photo has too many pixels to upload\. Please use a smaller version\.$/, /10 MB|Image dimensions/, 'pixel'],
    ['Bytes', { cloudinaryMaxBytes: 100000 }, pngRauschen(300, 300), /^Upload-Fehler: Datei zu gross \(max 10 MB\)\.$/, /File size|Pixel/, 'bytes'],
    ['413 ohne Text', { status413: true }, pngErzeugen(400, 400), /^Upload-Fehler: Datei zu gross \(max 10 MB\)\.$/, /failed/, null],
  ]) {
    const { lang, status413, ...seiteOpt } = opt;
    const s = await oeffnen(b, srv, T71 + (lang ? '&lang=' + lang : ''), seiteOpt);
    const p = s.page;
    await sichtWarten(p);
    if (status413) await p.route('https://api.cloudinary.com/**', (r) => r.fulfill({ status: 413, contentType: 'text/html', headers: { 'access-control-allow-origin': '*' }, body: '<html><body>Request Entity Too Large</body></html>' }));
    await p.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: datei });
    await statusWarten(p, 'Upload-Fehler|Upload error');
    const st = await statusText(p);
    pruefe(`RO-2 Foto-Upload ${name}: «${st}»`, soll.test(st) && !nicht.test(st), st);
    if (grund) pruefe(`RO-2 Foto-Upload ${name}: die Attrappe lehnte genau einmal ab, Grund ${grund}`, s.abgelehnt.length === 1 && s.abgelehnt[0].grund === grund, JSON.stringify(s.abgelehnt));
    pruefe(`RO-2 Foto-Upload ${name}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // RO-3 (a): ein gutes Foto lädt noch hoch, dann eine kaputte Datei: die Meldung zur kaputten Datei bleibt stehen, auch wenn der Upload des guten Fotos fertig wird
  {
    const s = await oeffnen(b, srv, T71, { cloudinaryVerzoegerung: (nr) => (nr === 1 ? 1500 : 0) });
    const p = s.page;
    await sichtWarten(p);
    await p.locator('input[type=file]').setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: Buffer.from(geisterPng()) });
    await p.waitForTimeout(100);
    await p.locator('input[type=file]').setInputFiles({ name: 'kaputt.png', mimeType: 'image/png', buffer: Buffer.from('das ist kein Bild, nur Text') });
    await statusWarten(p, 'nicht öffnen');
    await p.waitForFunction(() => { const l = window.LSPOD6.editors[0].st.ebenen.front; return l.length === 1 && !l[0].uploading && !!l[0].printUrl; }, null, { timeout: 15000 });
    await p.waitForTimeout(200);
    const st = await statusText(p);
    pruefe('RO-3 (a): gutes Foto, dann kaputte Datei: nach dem Upload des guten Fotos steht die Meldung «Diese Datei lässt sich nicht öffnen …» weiter da', /^Diese Datei lässt sich nicht öffnen\./.test(st), st);
    pruefe('RO-3 (a): keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // RO-3 (b) Gegenprobe gegen eine zu enge Korrektur: Kaufknopf während des Uploads («Bild lädt noch hoch»), danach ist der Upload fertig und die Statuszeile wieder leer
  {
    const s = await oeffnen(b, srv, T71, { cloudinaryVerzoegerung: (nr) => (nr === 1 ? 1500 : 0) });
    const p = s.page;
    await sichtWarten(p);
    await p.locator('input[type=file]').setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: Buffer.from(geisterPng()) });
    await p.waitForTimeout(300);
    await ed(p, '(ed) => ed.waehlen(null)');
    await ctaKlick(p);
    await statusWarten(p, 'lädt noch hoch');
    await p.waitForFunction(() => { const l = window.LSPOD6.editors[0].st.ebenen.front; return l.length === 1 && !l[0].uploading && !!l[0].printUrl; }, null, { timeout: 15000 });
    await p.waitForTimeout(200);
    pruefe('RO-3 (b): Kauf während des Uploads, danach: Statuszeile leer, kein Warenkorb', (await statusText(p)) === '' && s.warenkorb.length === 0, await statusText(p));
    await s.schliessen();
  }
  // RO-4: das Netz fällt beim Hochladen der Druckdatei aus (nach «Bestätigen»): Meldung zur Verbindung, die Ursache steht in der Konsole; deutsch und englisch
  for (const [sprache, soll] of [['', /^Konnte nicht hinzufügen: Verbindung unterbrochen\. Bitte erneut versuchen\.$/], ['&lang=en', /^Could not add: Connection lost\. Please try again\.$/]]) {
    const s = await oeffnen(b, srv, T71 + sprache);
    const p = s.page;
    const warn = [];
    p.on('console', (m) => { if (m.type() === 'warning') warn.push(m.text()); });
    await sichtWarten(p);
    await textHinzufuegen(p, 'Netz');
    await p.route('https://api.cloudinary.com/**', (r) => r.abort('failed'));
    await ctaKlick(p);
    await reviewBestaetigen(p);
    await statusWarten(p, 'Konnte nicht hinzufügen|Could not add', 20000);
    const st = await statusText(p);
    pruefe(`RO-4 Netz weg beim Upload der Druckdatei${sprache ? ' (englisch)' : ''}: «${st}»`, soll.test(st) && !ROH.test(st), st);
    pruefe(`RO-4${sprache ? ' (englisch)' : ''}: die Ursache steht in der Konsole («Failed to fetch» bei der eigenen Meldung)`, warn.some((w) => /\[lspod6\] Fehler: .*\| .*Failed to fetch/.test(w)), JSON.stringify(warn.slice(-3)));
    pruefe(`RO-4${sprache ? ' (englisch)' : ''}: kein Warenkorb, Dialog zu, Knopf frei, keine Seitenfehler`, s.warenkorb.length === 0 && !(await dialogOffen(p)) && (await p.locator('.lsp6-cta').evaluate((e) => !e.disabled)) && kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // RO-6: die englischen Sätze zur kaputten Datei, zum abgelehnten Foto und zum Aufbau der Prüfung (bisher nur deutsch geprüft)
  {
    const s = await oeffnen(b, srv, T71 + '&lang=en');
    const p = s.page;
    await sichtWarten(p);
    await p.route('https://api.cloudinary.com/**', NEIN400);
    await p.locator('input[type=file]').setInputFiles({ name: 'kaputt.png', mimeType: 'image/png', buffer: Buffer.from('das ist kein Bild, nur Text') });
    await statusWarten(p, 'cannot be opened');
    await p.waitForTimeout(400);
    let st = await statusText(p);
    pruefe('RO-6 Englisch: kaputte Datei: «This file cannot be opened. Please choose another image (PNG, JPG or WebP).»', st === 'This file cannot be opened. Please choose another image (PNG, JPG or WebP).', st);
    await p.locator('input[type=file]').setInputFiles({ name: 'ok.png', mimeType: 'image/png', buffer: Buffer.from(geisterPng()) });
    await statusWarten(p, 'Upload error');
    st = await statusText(p);
    pruefe('RO-6 Englisch: Upload abgelehnt (400): «Upload error: The photo could not be uploaded. Please try again.»', st === 'Upload error: The photo could not be uploaded. Please try again.', st);
    await ed(p, '(ed) => { Object.keys(ed.st.ebenen).forEach((id) => ed.st.ebenen[id].slice().forEach((e) => ed.entfernen(e.id))); const e = ed.neuesBild("data:image/png;base64,AAAA", 4000, 4000); e.printUrl = "https://res.cloudinary.com/x/kaputt.png"; ed.waehlen(null); }');
    await p.route('https://res.cloudinary.com/**', (r) => r.fulfill({ status: 404, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'nicht da' }));
    await ctaKlick(p);
    await statusWarten(p, 'Could not add', 20000);
    st = await statusText(p);
    pruefe('RO-6 Englisch: Aufbau der Prüfung scheitert: «Could not add: That did not work. Please try again.»', st === 'Could not add: That did not work. Please try again.', st);
    pruefe('RO-6 Englisch: keine Seitenfehler', kein(s), s.fehler.join(' | '));
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
          for (const rot of [0, 35]) {   // BE-6: beide Drehungen an allen neun Lagen (bis zur Korrektur 35° nur in zwei Ecken)
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
            if (g.sicht && (await unterKnopf(p, g.sicht))) probleme.push('Mitte der Ebene liegt unter einem Griff');   // BE-6: an allen Lagen, auch in den Ecken (bis zur Korrektur nur Mitte und Kantenmitten); die echte Bedienung prüft «eckzone»
            if (probleme.length) ungueltig.push(`${was}: ${probleme.join(', ')}`);
          }
        }
      }
      pruefe(`${vpName}, ${artName}: ${E2_GROESSEN.length} Grössen × 9 Lagen × 2 Drehungen: Griffe in der Bühne, trefferbar, Ebenenmitte frei`, ungueltig.length === 0, ungueltig.slice(0, 4).join(' | ') + (ungueltig.length > 4 ? ` … (${ungueltig.length} Fälle)` : ''));
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


// ── BE-1, BE-4 (Korrekturrunde 11.11.): Knöpfe an der Bühnenkante über der Ebenenmitte, Beschriftung über dem Löschkreuz ──────────────────────────────
// Echte Bedienung (Tipp am Handy, Klick am PC, Ziehen) an den Lagen, an denen 6.4.2 vor der Korrektur löschte oder skalierte: Ecken ganz innen (2 und 10 px), gedreht an Kantenmitten, Mitte auf der Bühnenecke,
// schräge Lagen. Die Prüfung «Mitte frei» per elementFromPoint genügt nicht: Chromium wählt bei einer Berührung Ziele bis rund 9 px neben dem Punkt (GEMESSEN in der Abnahme: die Mitte trifft die Ebene,
// der Tipp löscht trotzdem). Darum wird hier wirklich getippt, geklickt und gezogen.
const STOFFBEUTEL = (() => { const k = JSON.parse(readFileSync(join(v6, 'maps', 'lspod-15422950474113.karte.json'), 'utf8')); return `karte=live-15422950474113&karteurl=1&pflicht=1&bearbeiten=fehlt&themeregel=1&varianten=${Object.keys(k.shop.varianten).slice(0, 2).map((x, i) => x + ':V' + i).join(',')}`; })();
const KISSCUT = 'karte=live-15422942609793&karteurl=1&pflicht=1&bearbeiten=fehlt&themeregel=1&varianten=55778363441537:V0';
const ECK_SEITEN = [
  ['Stoffbeutel (flach, Druckfläche = Bühne)', STOFFBEUTEL, null],
  ['Tasse (flach)', T19, null],
  ['«Druckversion» (Shirt)', T71, 'druck'],
  ['Produktbühne, Zoom «Druckfläche» (Shirt)', T71, 'zoom'],
];
const ECK_FAELLE = [
  // [Name, Lage (Abstand der Hülle zur Bühnenkante in px: l, r, o, u; oder Mitte {x, y} in der Bühne), Drehung, Text, Bedienung]
  ['oben links ganz innen', { l: 2, o: 2 }, 0, 'Mama', 'tipp'],
  ['unten rechts ganz innen', { r: 2, u: 2 }, 0, 'Mama', 'zieh'],
  ['oben links ganz innen', { l: 2, o: 2 }, 0, '♥', 'tipp'],
  ['unten rechts ganz innen', { r: 2, u: 2 }, 0, '♥', 'zieh'],
  ['oben rechts 10 px innen', { r: 10, o: 10 }, 0, 'Mama', 'tipp'],
  ['unten links 10 px innen', { l: 10, u: 10 }, 0, '♥', 'tipp'],
  ['obere Kantenmitte, 45°', { o: 2 }, 45, 'Mama', 'tipp'],
  ['untere Kantenmitte, 45°', { u: 2 }, 45, 'Mama', 'zieh'],
  ['linke Kantenmitte, 135°', { l: 2 }, 135, 'Mama', 'tipp'],
  ['rechte Kantenmitte, 135°', { r: 2 }, 135, 'Mama', 'zieh'],
  ['linke Kantenmitte, −45°, ein Zeichen', { l: 2 }, -45, 'A', 'tipp'],   // BE-5 (1): in der alten 6.4.2 lag hier auf der Tasse das Löschkreuz unter der Mitte
  ['Mitte auf der Bühnenecke oben links', { x: 0, y: 0 }, 0, 'Mama', 'sichtbar'],
  ['Mitte schräg bei (37|45)', { x: 37, y: 45 }, 0, '♥', 'tipp'],
  ['Mitte bei (30|40)', { x: 30, y: 40 }, 0, '♥', 'tipp'],
];
const eckLage = (p) => p.evaluate(() => {
  const sb = document.querySelector('.lsp6-stage').getBoundingClientRect(), L = document.querySelector('.lsp6-layer.sel'), lr = L && L.getBoundingClientRect();
  const m = (q) => { const e = document.querySelector(q); if (!e || e.hidden) return null; const x = e.getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2 }; };
  // sichtbarer Teil der Ebene: in der Bühne, in «Bearbeiten» zusätzlich in der Druckfläche (dort beschneidet der Host das Motiv)
  const clip = document.querySelector('.lsp6-stage').getAttribute('data-ansicht') === 'bearbeiten' ? document.querySelector('.lsp6-host').getBoundingClientRect() : sb;
  let sicht = null, trifft = 'nichts';
  if (lr) {
    const l = Math.max(lr.left, sb.left, clip.left), r = Math.min(lr.right, sb.right, clip.right), t = Math.max(lr.top, sb.top, clip.top), b = Math.min(lr.bottom, sb.bottom, clip.bottom);
    if (r > l && b > t) sicht = { x: (l + r) / 2, y: (t + b) / 2 };
    const e = document.elementFromPoint(lr.left + lr.width / 2, lr.top + lr.height / 2);
    trifft = !e ? 'nichts' : e.closest('.lsp6-handle, .lsp6-del') ? 'knopf' : e.closest('.lsp6-layer.sel') ? 'ebene' : 'anderes';
  }
  return { st: { l: sb.left, t: sb.top, r: sb.right, b: sb.bottom }, c: lr && { x: lr.left + lr.width / 2, y: lr.top + lr.height / 2 }, w: lr && lr.width, h: lr && lr.height, h0: m('.lsp6-handle'), d0: m('.lsp6-del'), sicht, trifft };
});
/** Die Mitte der gewählten Ebene so legen, dass ihre Hülle die genannten Abstände zur Bühnenkante hat (über die Felder X/Y in cm; die Druckfläche begrenzt die Mitte auf 0 … 1). */
async function eckLegen(p, lage, rot) {
  await feldSetzen(p, 'Drehung °', rot);
  await buehneZeigen(p);
  const g = await p.evaluate(() => { const hb = document.querySelector('.lsp6-host').getBoundingClientRect(), sb = document.querySelector('.lsp6-stage').getBoundingClientRect(), lr = document.querySelector('.lsp6-layer.sel').getBoundingClientRect(); return { hb: { l: hb.left, t: hb.top, w: hb.width, h: hb.height }, sb: { l: sb.left, t: sb.top, r: sb.right, b: sb.bottom }, w: lr.width, h: lr.height }; });
  const masse = await ed(p, '(ed) => ed.geo().masse');
  let x = (g.sb.l + g.sb.r) / 2, y = (g.sb.t + g.sb.b) / 2;
  if (lage.x != null) x = g.sb.l + lage.x; if (lage.y != null) y = g.sb.t + lage.y;
  if (lage.l != null) x = g.sb.l + lage.l + g.w / 2; if (lage.r != null) x = g.sb.r - lage.r - g.w / 2;
  if (lage.o != null) y = g.sb.t + lage.o + g.h / 2; if (lage.u != null) y = g.sb.b - lage.u - g.h / 2;
  const cx = Math.max(0, Math.min(1, (x - g.hb.l) / g.hb.w)), cy = Math.max(0, Math.min(1, (y - g.hb.t) / g.hb.h));
  await feldSetzen(p, 'X (cm)', (cx * masse.breite).toFixed(2)); await feldSetzen(p, 'Y (cm)', (cy * masse.hoehe).toFixed(2));
  await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); document.querySelector('.lsp6-stage').scrollIntoView({ block: 'center' }); });
  await p.waitForTimeout(60);
  return eckLage(p);
}
const ersteEbene = (p) => ed(p, '(ed) => { const e = Object.values(ed.st.ebenen).flat()[0]; return e ? { cx: e.cx, cy: e.cy, scale: e.scale, rot: e.rot } : null; }');
async function eckNeu(p, text) {
  await ed(p, '(ed) => { Object.keys(ed.st.ebenen).forEach((id) => ed.st.ebenen[id].slice().forEach((e) => ed.entfernen(e.id))); }');
  await p.getByRole('button', { name: '➕ Text' }).click(); await p.locator('.lsp6-text').fill(text); await p.waitForTimeout(40);
}
/** Abstand eines Punktes zur Tippfläche (44 × 44 px) um die Mitte eines Knopfes. */
const tippLuft = (pt, k) => Math.hypot(Math.max(0, Math.abs(pt.x - k.x) - 22), Math.max(0, Math.abs(pt.y - k.y) - 22));
/** Anteil der Pixel in einem Kreis (Mitte, Radius) oder einem Rechteck (Mitte, halbe Breite rx, halbe Höhe ry), die sich ändern, wenn eine Klasse unsichtbar gemacht wird (Bildschirmfoto mit und ohne; Unterschied je Kanal über 24). */
async function anteilVerdeckt(p, mitte, radius, unsichtbar, ry = null) {
  const rx = radius, hy = ry == null ? radius : ry;
  const clip = { x: Math.round(mitte.x - rx), y: Math.round(mitte.y - hy), width: Math.round(2 * rx), height: Math.round(2 * hy) };
  const mit = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate((sel) => { const s = document.createElement('style'); s.id = '__unsichtbar'; s.textContent = sel + '{visibility:hidden!important}'; document.head.appendChild(s); }, unsichtbar);
  await p.waitForTimeout(40);
  const ohne = (await p.screenshot({ clip })).toString('base64');
  await p.evaluate(() => document.getElementById('__unsichtbar').remove());
  return p.evaluate(async ([a, c, r]) => {
    const lies = async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const x = cv.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height); };
    const A = await lies(a), B = await lies(c);
    let n = 0, anders = 0;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
      if (Math.hypot(x + 0.5 - A.width / 2, y + 0.5 - A.height / 2) > r) continue;
      n++; const o = (y * A.width + x) * 4;
      if (Math.abs(A.data[o] - B.data[o]) > 24 || Math.abs(A.data[o + 1] - B.data[o + 1]) > 24 || Math.abs(A.data[o + 2] - B.data[o + 2]) > 24) anders++;
    }
    return n ? anders / n : 1;
  }, [mit, ohne, ry == null ? radius : 1e9]);
}
szenario('eckzone', true, async (b, srv) => {
  for (const [sName, query, sicht] of ECK_SEITEN) for (const [vName, vp] of [['Handy', MOBIL], ['PC', PC]]) {
    const s = await oeffnen(b, srv, query, vp);
    const p = s.page;
    if (sicht) { await sichtWarten(p); if (sicht === 'zoom') await ed(p, '(ed) => ed.zoomSetzen("flaeche")'); else await ed(p, '(ed, v) => ed.sichtSetzen(v)', sicht); await p.waitForTimeout(200); }
    const probleme = [];
    for (const [fName, lage, rot, text, art] of ECK_FAELLE) {
      const was = `«${text}» ${fName}`;
      await eckNeu(p, text);
      const g = await eckLegen(p, lage, rot);
      if (!g.c || !g.h0 || !g.d0) { probleme.push(`${was}: Ebene oder Knopf fehlt`); continue; }
      const imSt = (k) => k.x - 15 >= g.st.l - 0.6 && k.y - 15 >= g.st.t - 0.6 && k.x + 15 <= g.st.r + 0.6 && k.y + 15 <= g.st.b + 0.6;
      if (!imSt(g.h0) || !imSt(g.d0)) probleme.push(`${was}: Knopf nicht ganz in der Bühne`);
      if (Math.max(Math.abs(g.h0.x - g.d0.x), Math.abs(g.h0.y - g.d0.y)) < 43.5) probleme.push(`${was}: die Tippflächen von Kreuz und Griff überlappen (${JSON.stringify([g.d0, g.h0])})`);
      const lH = tippLuft(g.c, g.h0), lD = tippLuft(g.c, g.d0);
      if (Math.min(lH, lD) < 21.5) probleme.push(`${was}: Ebenenmitte nur ${Math.min(lH, lD).toFixed(1)} px neben einer Tippfläche`);
      const vorher = await ersteEbene(p), n0 = await ebenenAnzahl(p);
      // Liegt die Mitte ausserhalb des sichtbaren Teils (Produktbühne: der Host beschneidet das Motiv an der Druckfläche, die Mitte liegt auf deren Kante), greift man die Ebene dort, wo man sie sieht
      const ziel = art === 'sichtbar' || g.trifft === 'anderes' || g.trifft === 'nichts' ? g.sicht : g.c;
      if (!ziel) { probleme.push(`${was}: kein sichtbarer Teil`); continue; }
      if (art === 'tipp' || art === 'sichtbar') {
        const pt = ziel;
        if (vp.mobil) await p.touchscreen.tap(pt.x, pt.y); else await p.mouse.click(pt.x, pt.y);
        await p.waitForTimeout(80);
        if ((await ebenenAnzahl(p)) < n0) { probleme.push(`${was}: ${vp.mobil ? 'Tipp' : 'Klick'} auf die ${art === 'tipp' ? 'Mitte' : 'sichtbare Ebene'} LÖSCHT`); await ed(p, '(ed) => ed.zurueck()'); }
      } else {
        await p.mouse.move(ziel.x, ziel.y); await p.mouse.down(); await p.mouse.move(ziel.x - 20, ziel.y - 14, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(60);
        const z = await ersteEbene(p);
        if (!z) probleme.push(`${was}: Ziehen aus der Mitte LÖSCHT`);
        else {
          const versch = Math.abs(z.cx - vorher.cx) > 0.004 || Math.abs(z.cy - vorher.cy) > 0.004, skal = Math.abs(z.scale - vorher.scale) > 0.004 || Math.abs(z.rot - vorher.rot) > 0.5;
          if (!versch || skal) probleme.push(`${was}: Ziehen aus der Mitte ${skal ? `SKALIERT/DREHT (${vorher.scale.toFixed(2)} → ${z.scale.toFixed(2)}, ${vorher.rot.toFixed(0)}° → ${z.rot.toFixed(0)}°)` : 'verschiebt nicht'}`);
        }
      }
    }
    pruefe(`${sName}, ${vName}: ${ECK_FAELLE.length} Lagen am Rand: Knöpfe in der Bühne, ohne Überlappung, Ebenenmitte frei; Tipp/Klick auf die Mitte löscht nie, Ziehen aus der Mitte verschiebt`, probleme.length === 0, probleme.slice(0, 5).join(' | ') + (probleme.length > 5 ? ` … (${probleme.length} Fälle)` : ''));
    // Das Kreuz bleibt bedienbar: Klick auf das Kreuz löscht weiterhin
    await eckNeu(p, 'Mama');
    const g = await eckLegen(p, { l: 2, o: 2 }, 0);
    await p.mouse.click(g.d0.x, g.d0.y);
    pruefe(`${sName}, ${vName}: ein Klick auf das Löschkreuz (oben links geklemmt) löscht die Ebene weiterhin`, (await ebenenAnzahl(p)) === 0);
    pruefe(`${sName}, ${vName}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // BE-4: an der oberen Kante liegt das Löschkreuz unter der Beschriftung «Druckfläche … cm». Es muss sichtbar sein (höchstens 5 % der Pixel im Kreis ändert die Beschriftung; vor der Korrektur 56 bis 74 %).
  for (const [sName, query] of [['Stoffbeutel', STOFFBEUTEL], ['Kiss-Cut 5,5″', KISSCUT]]) for (const [vName, vp] of [['Handy', MOBIL], ['PC', PC]]) {
    const s = await oeffnen(b, srv, query, vp);
    const p = s.page;
    await eckNeu(p, 'Mama');
    const g = await eckLegen(p, { l: 60, o: 2 }, 0);
    const tag = await p.evaluate(() => { const r = document.querySelector('.lsp6-tag').getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; });
    const ueber = Math.max(0, Math.min(tag.r, g.d0.x + 15) - Math.max(tag.l, g.d0.x - 15)) * Math.max(0, Math.min(tag.b, g.d0.y + 15) - Math.max(tag.t, g.d0.y - 15)) / 900;
    pruefe(`BE-4 ${sName}, ${vName}: Vorbereitung: das Löschkreuz liegt im Bereich der Beschriftung (Überdeckung der Rechtecke ${Math.round(ueber * 100)} %)`, ueber > 0.2, JSON.stringify([tag, g.d0]));
    const a = await anteilVerdeckt(p, g.d0, 15, '.lsp6-tag');
    pruefe(`BE-4 ${sName}, ${vName}: das Löschkreuz ist sichtbar (die Beschriftung ändert ${(a * 100).toFixed(1)} % seiner Pixel, höchstens 5 %)`, a <= 0.05, String(a));
    await p.mouse.click(g.d0.x, g.d0.y);
    pruefe(`BE-4 ${sName}, ${vName}: ein Klick auf das Kreuz löscht die Ebene`, (await ebenenAnzahl(p)) === 0);
    pruefe(`BE-4 ${sName}, ${vName}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // BE-4 Gegenprobe: der gestrichelte Rahmen der Druckfläche bleibt über der gewählten Ebene (eine Korrektur «gewählte Ebene über alles» liesse die Grenze unter dem Motiv verschwinden)
  for (const [vName, vp] of [['Handy', MOBIL], ['PC', PC]]) {
    const s = await oeffnen(b, srv, T19, vp);
    const p = s.page;
    await motivHinzu(p, '#2040c0', 4000); await bilderGeladen(p);
    const masse = await ed(p, '(ed) => ed.geo().masse');
    await feldSetzen(p, 'Breite (cm)', (masse.breite * 0.3).toFixed(2)); await feldSetzen(p, 'X (cm)', masse.breite.toFixed(2)); await feldSetzen(p, 'Y (cm)', (masse.hoehe * 0.5).toFixed(2));
    await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); document.querySelector('.lsp6-stage').scrollIntoView({ block: 'center' }); });
    await bilderGeladen(p); await p.waitForTimeout(80);
    const r = await p.evaluate(() => { const f = document.querySelector('.lsp6-frame').getBoundingClientRect(), l = document.querySelector('.lsp6-layer.sel').getBoundingClientRect(); return { x: f.right - 1, y: (Math.max(f.top, l.top) + Math.min(f.bottom, l.bottom)) / 2, ok: l.left < f.right - 6 && l.right > f.right + 6 && Math.min(f.bottom, l.bottom) - Math.max(f.top, l.top) > 64 }; });
    pruefe(`BE-4 Tasse ${vName}: Vorbereitung: das gewählte Bild liegt über dem rechten Rand der Druckfläche`, r.ok, JSON.stringify(r));
    const a = await anteilVerdeckt(p, r, 4, '.lsp6-frame', 30);   // Streifen 8 × 60 px entlang der Rahmenlinie
    pruefe(`BE-4 Tasse ${vName}: der Rahmen der Druckfläche ist über dem gewählten Bild zu sehen (${(a * 100).toFixed(1)} % der Pixel am Rand gehören zum Rahmen, mindestens 10 %)`, a >= 0.1, String(a));
    pruefe(`BE-4 Tasse ${vName}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // BE-1 Gegenprobe: ungeklemmte Knöpfe bleiben, wo sie in 6.4.1 waren (Mitte 6 px ausserhalb der Ecken der Mindestschicht, kein transform), auch wenn die Druckfläche die Ebene anschneidet und die Mitte
  // ihres sichtbaren Teils neben der Mitte der Ebene liegt (Produktbühne, Zoom «Produkt»: die Bühne ist grösser als die Druckfläche, die Knöpfe liegen frei in der Bühne)
  for (const [vName, vp] of [['Handy', MOBIL], ['PC', PC]]) {
    const s = await oeffnen(b, srv, T71, vp);
    const p = s.page;
    await sichtWarten(p); await ed(p, '(ed) => ed.zoomSetzen("produkt")'); await p.waitForTimeout(200);
    const probleme = []; let geklemmt = 0, angeschnitten = 0, n = 0;
    for (const [lName, cx, cy] of [['linke Kante', 0, 0.5], ['rechte Kante', 1, 0.5], ['obere Kante', 0.5, 0], ['untere Kante', 0.5, 1], ['Ecke oben links', 0, 0], ['Ecke unten rechts', 1, 1]]) for (const rot of [0, 35]) {
      await eckNeu(p, 'A');
      const masse = await ed(p, '(ed) => ed.geo().masse');
      await feldSetzen(p, 'Drehung °', rot); await feldSetzen(p, 'X (cm)', (cx * masse.breite).toFixed(2)); await feldSetzen(p, 'Y (cm)', (cy * masse.hoehe).toFixed(2));
      await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); document.querySelector('.lsp6-stage').scrollIntoView({ block: 'center' }); });
      await p.waitForTimeout(60);
      const r = await p.evaluate((w0) => {
        const L = document.querySelector('.lsp6-layer.sel'), lr = L.getBoundingClientRect(), st = document.querySelector('.lsp6-stage').getBoundingClientRect(), hb = document.querySelector('.lsp6-host').getBoundingClientRect();
        const bw = Math.max(64, L.offsetWidth), bh = Math.max(64, L.offsetHeight), mx = lr.left + lr.width / 2, my = lr.top + lr.height / 2, a = w0 * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
        const soll = (z) => { const lx = z * (bw / 2 + 6), ly = z * (bh / 2 + 6); return { x: mx + lx * co - ly * si, y: my + lx * si + ly * co }; };
        const knopf = (q) => { const e = document.querySelector(q), x = e.getBoundingClientRect(); return { x: x.left + x.width / 2, y: x.top + x.height / 2, t: e.style.transform || '' }; };
        const innen = (k) => k.x >= st.left + 17 && k.x <= st.right - 17 && k.y >= st.top + 17 && k.y <= st.bottom - 17;
        const sh = soll(1), sd = soll(-1);
        return { h: knopf('.lsp6-handle'), d: knopf('.lsp6-del'), sh, sd, frei: innen(sh) && innen(sd), angeschnitten: lr.left < hb.left - 0.5 || lr.right > hb.right + 0.5 || lr.top < hb.top - 0.5 || lr.bottom > hb.bottom + 0.5 };
      }, rot);
      n++;
      if (!r.frei) { geklemmt++; continue; }   // Vorbereitung: nur Lagen, an denen kein Knopf an die Bühnenkante muss
      if (r.angeschnitten) angeschnitten++;
      const abw = Math.max(Math.abs(r.h.x - r.sh.x), Math.abs(r.h.y - r.sh.y), Math.abs(r.d.x - r.sd.x), Math.abs(r.d.y - r.sd.y));
      if (abw > 1.5 || r.h.t || r.d.t) probleme.push(`«A» ${lName}, ${rot}°: Knöpfe verschoben (Abweichung ${abw.toFixed(1)} px, transform «${r.h.t}» / «${r.d.t}»)`);
    }
    pruefe(`BE-1 Produktbühne Zoom «Produkt», ${vName}: Vorbereitung: mindestens 8 von ${n} Lagen ohne Klemmen, davon mindestens 6 von der Druckfläche angeschnitten`, n - geklemmt >= 8 && angeschnitten >= 6, JSON.stringify({ n, geklemmt, angeschnitten }));
    pruefe(`BE-1 Produktbühne Zoom «Produkt», ${vName}: ungeklemmte Knöpfe bleiben an der Lage von 6.4.1 (kein transform, Abweichung höchstens 1,5 px), auch bei angeschnittener Ebene`, probleme.length === 0, probleme.slice(0, 4).join(' | '));
    pruefe(`BE-1 Produktbühne Zoom «Produkt», ${vName}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
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
    pruefe('zurück auf eine freie Ausführung (1003): die Meldung «ausverkauft» steht nicht mehr in der Statuszeile (KA-02)', (await statusText(p)) === '', await statusText(p));
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
  // ── Korrekturrunde 11.11. (KA-01, KA-02) ──
  const ZEIT_UHR = '(function () { var alt = Date.now; window.__dt = 0; Date.now = function () { return alt.call(Date) + window.__dt; }; })();';
  // 8. KA-01: die Antwort «ausverkauft» kommt erst, wenn der Prüfdialog schon offen ist: der Dialog schliesst sich von selbst, «Bestätigen» lädt nichts hoch, kein Warenkorb
  {
    let antworten; const tor = new Promise((r) => { antworten = r; });   // die Lagerantwort kommt genau dann, wenn der Test sie freigibt (fest unter Last, nicht nach einer Wartezeit)
    const s = await oeffnen(b, srv, zweiteZuerst(), { ...E5_SEITE, produktJs: () => PRODUKT({ 1002: false }, { warten: tor }) });
    const p = s.page;
    await sichtWarten(p);
    await textHinzufuegen(p, 'Test');
    await ctaKlick(p);
    const offen = await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
    pruefe('8 (KA-01): Vorbereitung: der Dialog ist offen, bevor die Lagerantwort da ist', offen && s.produktAnfragen.length === 1 && !(await ctaGesperrt(p)));
    antworten();
    await warteBis(() => ctaGesperrt(p), 8000);
    await p.waitForTimeout(200);
    pruefe('8 (KA-01): späte Antwort «ausverkauft» bei offenem Dialog: der Dialog schliesst sich von selbst, Meldung «ausverkauft», Fokus auf dem Kaufknopf', !(await dialogOffen(p)) && /ausverkauft/.test(await statusText(p)) && (await p.evaluate(() => !!document.activeElement && document.activeElement.classList.contains('lsp6-cta'))), await statusText(p));
    pruefe('8 (KA-01): kein Upload, kein Warenkorb', s.uploads.length === 0 && s.warenkorb.length === 0, `uploads ${s.uploads.length} | warenkorb ${s.warenkorb.length}`);
    pruefe('8 (KA-01): keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // 9. KA-01: die Antwort «ausverkauft» kommt, WÄHREND der Dialog gebaut wird (künstlich langsames Handy: toBlob 1,5 s): der Dialog öffnet sich gar nicht, kein Upload
  {
    const LANGSAM = '(function () { var alt = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function () { var t = this, a = arguments; setTimeout(function () { alt.apply(t, a); }, 2000); }; })();';
    let antworten; const tor = new Promise((r) => { antworten = r; });
    const s = await oeffnen(b, srv, zweiteZuerst(), { ...E5_SEITE, initSkript: LANGSAM, produktJs: () => PRODUKT({ 1002: false }, { warten: tor }) });
    const p = s.page;
    await sichtWarten(p);
    await textHinzufuegen(p, 'Test');
    const frei = !(await ctaGesperrt(p));
    await ctaKlick(p);
    await p.waitForTimeout(150);
    pruefe('9 (KA-01): Vorbereitung: beim Klick war die Antwort noch nicht da, der Dialog wird gebaut', frei && s.produktAnfragen.length === 1 && /erstellt|wird/.test(await statusText(p)), await statusText(p));
    antworten();   // während toBlob noch 2 s wartet
    const gesehen = await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 10000 }).then(() => true, () => false);
    pruefe('9 (KA-01): Antwort «ausverkauft» während des Dialogbaus: der Dialog öffnet sich nicht', !gesehen && (await ctaGesperrt(p)) && /ausverkauft/.test(await statusText(p)), await statusText(p));
    if (await dialogOffen(p)) { await p.locator('.lsp6-review-accept').check(); await p.locator('.lsp6-review-confirm').click(); await p.waitForTimeout(1500); }   // gegen eine Fassung ohne die Korrektur: zeigen, was «Bestätigen» täte
    pruefe('9 (KA-01): kein Upload, kein Warenkorb', s.uploads.length === 0 && s.warenkorb.length === 0, `uploads ${s.uploads.length} | warenkorb ${s.warenkorb.length}`);
    pruefe('9 (KA-01): keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // 10. KA-02: beim Laden ausverkauft, später aufgefüllt: der Klick auf die Sperre liest neu (höchstens alle 15 s), danach ist die Ausführung kaufbar
  {
    let nr = 0;
    const s = await oeffnen(b, srv, zweiteZuerst(), { ...E5_SEITE, initSkript: ZEIT_UHR, produktJs: () => PRODUKT(nr++ === 0 ? { 1002: false } : {}) });
    const p = s.page;
    await sichtWarten(p);
    await textHinzufuegen(p, 'Test');
    await warteBis(() => ctaGesperrt(p), 8000);
    await ctaKlick(p); await p.waitForTimeout(400);
    pruefe('10 (KA-02): Klick gleich nach der Antwort: keine neue Anfrage (Drossel 15 s), kein Dialog, Knopf gesperrt', s.produktAnfragen.length === 1 && !(await dialogOffen(p)) && (await ctaGesperrt(p)), JSON.stringify(s.produktAnfragen));
    await p.evaluate(() => { window.__dt = 600000; });   // zehn Minuten später
    await ctaKlick(p);
    await warteBis(() => s.produktAnfragen.length >= 2);
    await warteBis(async () => !(await ctaGesperrt(p)));
    await p.waitForTimeout(200);
    pruefe('10 (KA-02): zehn Minuten später: der Klick auf die Sperre liest den Lagerstand neu (zweite Anfrage), noch kein Upload', s.produktAnfragen.length === 2 && s.uploads.length === 0 && !(await dialogOffen(p)), JSON.stringify(s.produktAnfragen));
    pruefe('10 (KA-02): die neue Antwort gilt: Knopf frei, kein Hinweis, Statuszeile leer', !(await ctaGesperrt(p)) && !(await hinweisSichtbar(p)) && (await statusText(p)) === '', `${await hinweisText(p)} | ${await statusText(p)}`);
    await ctaKlick(p);
    pruefe('10 (KA-02): der nächste Klick öffnet den Prüfdialog', await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false), await statusText(p));
    pruefe('10 (KA-02): keine Seitenfehler', kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // 11. KA-02: nach einem bekannten «ausverkauft» scheitert das Neu-Lesen (500, 429, kein JSON, Netzfehler): das gilt als «unbekannt», die Ausführung ist wieder kaufbar (wie beim ersten Lesen)
  for (const [name, zweite] of [['HTTP 500', { status: 500, body: 'Fehler' }], ['HTTP 429', { status: 429, body: '' }], ['kein JSON', { typ: 'text/html', body: '<html>gesperrt</html>' }], ['Netzfehler', { abbruch: true }]]) {
    let nr = 0;
    const s = await oeffnen(b, srv, T71, { ...E5_SEITE, initSkript: ZEIT_UHR, produktJs: () => (nr++ === 0 ? PRODUKT({ 1002: false }) : zweite) });
    const p = s.page;
    await sichtWarten(p);
    await textHinzufuegen(p, 'Test');
    await warteBis(() => s.produktAnfragen.length >= 1); await p.waitForTimeout(300);
    await p.locator('input[name="id"][value="1002"]').check();
    await warteBis(() => ctaGesperrt(p));
    pruefe(`11 (KA-02) ${name}: Vorbereitung: 1002 ist gesperrt`, await ctaGesperrt(p));
    await p.locator('input[name="id"][value="1001"]').check(); await p.waitForTimeout(200);
    await p.evaluate(() => { window.__dt = 130000; });
    await p.locator('input[name="id"][value="1003"]').check();
    await warteBis(() => s.produktAnfragen.length >= 2); await p.waitForTimeout(400);
    await p.locator('input[name="id"][value="1002"]').check(); await p.waitForTimeout(300);
    pruefe(`11 (KA-02) ${name}: das Neu-Lesen scheitert: 1002 ist danach frei (Knopf frei, kein Hinweis)`, s.produktAnfragen.length === 2 && !(await ctaGesperrt(p)) && !(await hinweisSichtbar(p)), `${JSON.stringify(s.produktAnfragen)} | ${await hinweisText(p)}`);
    await ctaKlick(p);
    pruefe(`11 (KA-02) ${name}: der Klick öffnet den Prüfdialog`, await p.locator('[data-lsp6-review="1"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => true, () => false), await statusText(p));
    pruefe(`11 (KA-02) ${name}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
});

// KA-07: Adressbildung der Lagerabfrage: Handle mit ® (zwei Live-Seiten), Sprachpräfix aus Shopify.routes.root (/fr/), Produkt im Sammlungspfad. Die Attrappe antwortet NUR auf die richtige Adresse,
// sonst 404 (= «unbekannt», nichts gesperrt): eine falsch gebildete Adresse fällt so an der Sperre UND am mitgeschriebenen Pfad auf.
const R_HANDLE = 'hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten';
szenario('ausverkauft-adresse', true, async (b, srv) => {
  const faelle = [
    ['Handle mit ®', '/products/' + R_HANDLE, '', R_HANDLE, '/products/' + encodeURIComponent(R_HANDLE) + '.js'],
    ['Seite unter /fr/ mit Shopify.routes.root', '/fr/products/test-shirt', '&wurzel=/fr/', 'test-shirt', '/fr/products/test-shirt.js'],
    ['Seite unter /fr/ ohne Shopify.routes (Rückfall auf /)', '/fr/products/test-shirt', '', 'test-shirt', '/products/test-shirt.js'],
    ['Produkt im Sammlungspfad', '/collections/selbst-gestalten/products/test-shirt', '', 'test-shirt', '/products/test-shirt.js'],
  ];
  for (const [name, pfad, zusatz, handle, soll] of faelle) {
    const s = await oeffnen(b, srv, zweiteZuerst() + zusatz, { seitenPfad: pfad, produktJs: (h, pp) => (h === handle && pp === soll ? PRODUKT({ 1002: false }) : null) });
    const p = s.page;
    await sichtWarten(p);
    await warteBis(() => s.produktAnfragen.length >= 1);
    await warteBis(() => ctaGesperrt(p), 4000);
    pruefe(`${name}: genau eine Anfrage an ${soll}`, s.produktPfade.length === 1 && s.produktPfade[0] === soll && s.produktAnfragen[0] === handle, JSON.stringify(s.produktPfade));
    pruefe(`${name}: die ausverkaufte Ausführung (1002) ist gesperrt, Hinweis «ausverkauft»`, (await ctaGesperrt(p)) && /ausverkauft/.test(await hinweisText(p)), await hinweisText(p));
    pruefe(`${name}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
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

// ── KA-05, BE-2, BE-6 (Korrekturrunde 11.11.): ein Fehler in den OPTIONALEN Vorschaudaten sperrt nie Editor und Warenkorb ───────────────────────────────────────
// Seit 6.4.2 (E7) werden rechtzeitige Vorschaudaten im try von mounten gesetzt; eine Ausnahme dort sperrte auf Seiten mit Pflichtkarte (alle Live-Seiten) Editor und Warenkorb und baute ohne Pflichtkarte
// bei jedem Wiederholungs-Zeitgeber einen neuen Editor. Künstliche Ausnahme ohne Eingriff in den Editor: setAttribute('data-ersatz') wirft (nur der erste Aufbau der Produktbühne setzt es, also nur innerhalb von vorschauDatenSetzen).
const VF_FETCH = (art) => `(function () { var alt = window.fetch; window.fetch = function (u) { if (/\\/vorschau\\//.test(String(u && u.url || u))) { ${art === 'nie' ? 'return new Promise(function () {});' : "return Promise.resolve(new Response('Serverfehler', { status: 500 }));"} } return alt.apply(this, arguments); }; })();`;
const VF_WIRFT = (einmal) => `(function () { var alt = Element.prototype.setAttribute, n = 0; Element.prototype.setAttribute = function (k) { if (k === 'data-ersatz' && (${einmal ? 'n++ === 0' : 'true'})) throw new Error('PROBE Vorschaudaten'); return alt.apply(this, arguments); }; })();`;
/** Warten, bis der Bau des Editors entschieden ist (init gesetzt und nicht mehr «busy»), höchstens 15 s, dann noch die Zeitgeber bis 2,5 s nach dem Laden. */
const vfFertig = async (p) => { await p.waitForFunction(() => { const c = document.querySelector('.lspod-designer-v6'); const v = c && c.getAttribute('data-init-v6'); return !!v && v !== 'busy'; }, null, { timeout: 15000 }).catch(() => {}); await p.waitForFunction(() => performance.now() > 2700, null, { timeout: 15000 }).catch(() => {}); };
const vfLage = (p) => p.evaluate(() => { const c = document.querySelector('.lspod-designer-v6'); return { init: c.getAttribute('data-init-v6'), editoren: window.LSPOD6.editors.length, wurzeln: c.querySelectorAll('.lsp6').length, karteNoetig: !!document.querySelector('.lsp6-card-required'), themeGesperrt: document.getElementById('theme-kaufen').disabled, formGesperrt: !!document.querySelector('form[data-lspod6-karte-blockiert="1"]'), erstes: (window.__proben && window.__proben[0] || {}).t || null }; });
szenario('vorschau-fehlergrenze', true, async (b, srv) => {
  // (a) Ausnahme beim frühen Setzen der Vorschaudaten, Pflichtkarte (wie live): Editor bleibt, Warenkorb frei, Warnung in der Konsole, und der Kauf geht durch
  {
    const WARN = '(function () { window.__warn = []; var w = console.warn; console.warn = function () { window.__warn.push(Array.prototype.join.call(arguments, " ")); return w.apply(console, arguments); }; })();';
    const s = await seiteOeffnen(b, srv.url, { ...PC, ...GEISTER, query: T71 + '&pflicht=1', initSkript: WARN + VF_WIRFT(true) });
    const p = s.page;
    await vfFertig(p);
    const r = await vfLage(p);
    const warn = await p.evaluate(() => window.__warn || []);
    pruefe('(a) Setzen der Vorschaudaten wirft, Pflichtkarte: Editor gebaut (init=1), genau ein Editor und eine Wurzel', r.init === '1' && r.editoren === 1 && r.wurzeln === 1 && !r.karteNoetig, JSON.stringify(r));
    pruefe('(a) Pflichtkarte: Warenkorb nicht gesperrt (Kaufknopf des Themes frei, Formular nicht blockiert)', !r.themeGesperrt && !r.formGesperrt, JSON.stringify(r));
    pruefe('(a) Pflichtkarte: Warnung «[lspod6] Vorschaudaten nicht gesetzt: PROBE …» in der Konsole', warn.some((w) => /^\[lspod6\] Vorschaudaten nicht gesetzt: PROBE/.test(w)), JSON.stringify(warn));
    if (r.init === '1') {
      await textHinzufuegen(p, 'Hallo Welt');
      await ed(p, '(ed) => ed.waehlen(null)');
      await ctaKlick(p);
      await reviewBestaetigen(p);
      await p.waitForURL('**/cart', { timeout: 30000 }).catch(() => {});
    }
    pruefe('(a) Pflichtkarte: der Kauf geht durch (genau eine Warenkorb-Anfrage mit Druckdatei und _pod_karte)', s.warenkorb.length === 1 && Object.keys((s.warenkorb[0] || {}).properties || {}).some((k) => /Druckdatei/.test(k)) && !!((s.warenkorb[0] || {}).properties || {})._pod_karte, JSON.stringify(s.warenkorb.map((w) => Object.keys(w.properties || {}))));
    await s.schliessen();
  }
  // (b) ohne Pflichtkarte, die Ausnahme bei JEDEM Versuch: kein Neubau durch die Wiederholungs-Zeitgeber (vorher 8 Editoren nach 9 s)
  {
    const s = await seiteOeffnen(b, srv.url, { ...PC, ...GEISTER, query: T71, initSkript: VF_WIRFT(false) });
    await vfFertig(s.page);   // die Zeitgeber laufen nach 300, 800, 1500 und 2500 ms
    const r = await vfLage(s.page);
    pruefe('(b) ohne Pflichtkarte, Setzen wirft immer: init=1, genau ein Editor und eine Wurzel (kein Neubau)', r.init === '1' && r.editoren === 1 && r.wurzeln === 1, JSON.stringify(r));
    await s.schliessen();
  }
  // (c) Vorschaudaten kommen nie oder mit HTTP 500, je ohne und mit Pflichtkarte: Editor ohne Reiter nach höchstens der Wartezeit, Warenkorb frei (schon vor der Korrektur so, Schutz vor Rückfällen)
  for (const [art, init] of [['nie', VF_FETCH('nie')], ['HTTP 500', VF_FETCH('500')]]) for (const pflicht of ['', '&pflicht=1']) {
    const s = await seiteOeffnen(b, srv.url, { ...PC, ...GEISTER, query: T71 + pflicht, initSkript: E7_INIT + init });
    await vfFertig(s.page);
    await s.page.waitForTimeout(600);   // auch die Wiederholungs-Zeitgeber (bis 2,5 s nach dem Start) sind gelaufen, ohne einen zweiten Editor zu bauen
    const r = await vfLage(s.page);
    const was = `(c) Vorschaudaten ${art}${pflicht ? ', Pflichtkarte' : ''}`;
    pruefe(`${was}: init=1, ein Editor, eine Wurzel, Warenkorb frei`, r.init === '1' && r.editoren === 1 && r.wurzeln === 1 && !r.themeGesperrt && !r.formGesperrt, JSON.stringify(r));
    // Zeitgrenze grosszügig (3 s statt 1,3 s wie in «layoutsprung»): unter Last (Mutationsprobe, drei Browser) lag das erste Bild bis 1,9 s; der Editor darf nur nicht auf Daten warten, die nie kommen (D71 wartet 5 s)
    pruefe(`${was}: erstes Bild der Bühne vor 3000 ms (wartet nicht auf die Daten)`, r.erstes !== null && r.erstes < 3000, JSON.stringify(r));
    pruefe(`${was}: keine Seitenfehler`, kein(s), s.fehler.join(' | '));
    await s.schliessen();
  }
  // (d) Gegenprobe: eine beschädigte PFLICHTKARTE sperrt weiter, und zwar sofort, nicht erst nach der Wartezeit auf langsame Vorschaudaten (RO-6: «if (!karte) return null;»)
  {
    const STEMPEL = '(function () { window.__busy = null; window.__blocked = null; new MutationObserver(function () { var c = document.querySelector(".lspod-designer-v6"); if (!c) return; var v = c.getAttribute("data-init-v6"); if (v === "busy" && window.__busy === null) window.__busy = performance.now(); if (v === "blocked" && window.__blocked === null) window.__blocked = performance.now(); }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-init-v6"] }); })();';
    const s = await seiteOeffnen(b, srv.url, { ...PC, ...GEISTER, query: 'karte=71&kaputt=json&pflicht=1&mehrformen=1&shop=1001:4012&vorschau=71&vverz=3000', initSkript: STEMPEL });
    await s.page.waitForTimeout(1500);
    const r = await s.page.evaluate(() => ({ busy: window.__busy, blocked: window.__blocked, init: document.querySelector('.lspod-designer-v6').getAttribute('data-init-v6'), gesperrt: document.querySelectorAll('form[data-lspod6-karte-blockiert="1"]').length }));
    pruefe('(d) beschädigte Pflichtkarte: gesperrt (init=blocked, beide Formulare blockiert)', r.init === 'blocked' && r.gesperrt === 2, JSON.stringify(r));
    pruefe('(d) beschädigte Pflichtkarte: die Sperre kommt sofort (weniger als 300 ms nach dem Start), nicht erst nach der Wartezeit auf die Vorschaudaten', r.busy !== null && r.blocked !== null && r.blocked - r.busy < 300, JSON.stringify(r));
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
// KA-06 (Korrekturrunde 11.11.): Wege, die das Delta berührt und die der Vergleich bis dahin nicht fuhr: Bündel (Modell 586), zwei Platzierungen mit Aufpreis, hochgeladenes und gespiegeltes Foto, Einbindung wie live
const BUENDEL = 'karte=buendel&m=71,586&shop=1001:4012:71,1002:15124:586,1003:4013:71&varianten=1001:T-Shirt 71,1002:T-Shirt 586,1003:T-Shirt 71 L&vorschau=71,586&bearbeiten=1&themeregel=1';
async function varianteSv(p, wert) {   // wartet auf die Shopify-Variante (variante() kennt nur die Printful-Varianten des Modells 71)
  await p.locator(`input[name="id"][value="${wert}"]`).check();
  await p.waitForFunction((x) => String(window.LSPOD6.editors[0].st.shopVariante) === String(x), wert, { timeout: 5000 });
  await p.waitForTimeout(120);
}
const fotoFertig = (p) => p.waitForFunction(() => { const e = window.LSPOD6.editors[0]; const alle = Object.values(e.st.ebenen).flat().filter((x) => x.type === 'image'); return alle.length > 0 && alle.every((x) => !x.uploading && x.printUrl); }, null, { timeout: 20000 });
const podKarteVon = (props) => { try { return JSON.parse(props._pod_karte); } catch { return {}; } };
const KA06_FAELLE = [
  ['KA-06 Bündel 71+586, Ausführung des Modells 586, Text und Bild', BUENDEL, { pflicht: ['_pod_karte'], beweis: (n) => [Number(podKarteVon(n.props).m) === 586, `m ${podKarteVon(n.props).m}`] }, async (p) => { await varianteSv(p, 1002); await textHinzufuegen(p, 'Hallo Welt'); await motivHinzu(p, '#2040c0', 4000); await bilderGeladen(p); await ed(p, '(ed) => ed.waehlen(null)'); }],
  ['KA-06 zwei Platzierungen: Vorderseite Text, Rückseite Bild gedreht (Aufpreis)', T71, { beweis: (n) => { const k = podKarteVon(n.props); return [JSON.stringify(k.pl) === '["front","back"]' && Number(k.ap) > 0, `pl ${JSON.stringify(k.pl)}, ap ${k.ap}`]; } }, async (p) => {
    await textHinzufuegen(p, 'Vorne'); await feldSetzen(p, 'Schrifthöhe (mm)', 22);
    await p.locator('.lsp6-tab', { hasText: 'Rückseite' }).first().click();
    await motivHinzu(p, '#20a040', 4000); await bilderGeladen(p); await feldSetzen(p, 'Drehung °', 20);
    await ed(p, '(ed) => ed.waehlen(null)');
  }],
  ['KA-06 Foto über input[type=file], danach «Spiegeln»', T71, { beweis: (n) => [n.uploads.length >= 4, `${n.uploads.length} Uploads`] }, async (p) => {
    await p.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: pngErzeugen(1200, 900, [60, 120, 200]) });
    await fotoFertig(p); await bilderGeladen(p);
    const vorher = await ed(p, '(ed) => ed.st.ebenen.front[0].printUrl');
    await p.getByRole('button', { name: /Spiegeln/ }).click();
    await p.waitForFunction((v) => { const e = window.LSPOD6.editors[0].st.ebenen.front[0]; return !e.uploading && e.printUrl && e.printUrl !== v; }, vorher, { timeout: 20000 });
    await bilderGeladen(p); await ed(p, '(ed) => ed.waehlen(null)');
  }],
  ['KA-06 Einbindung wie live: data-karte-url, Pflichtkarte, data-bearbeiten fehlt', T71.replace('&bearbeiten=1', '&bearbeiten=fehlt') + '&karteurl=1&pflicht=1', {}, aktionMotiv(1001, null)],
];
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
    ...KA06_FAELLE,
  ];
  for (const [name, query, opt, aktion] of gleich) {
    const { pflicht = ['_pod_karte', '_vorschau'], beweis = null, ...seitenOpt } = opt;
    const alt = await kauf(b, srv, true, query, aktion, seitenOpt);
    const neu = await kauf(b, srv, false, query, aktion, seitenOpt);
    const d = unterschiede(alt.props, neu.props);
    pruefe(`${name}: verglichen werden die Referenz ${REF} und die geprüfte Fassung (${neu.version})`, alt.version === REF && REF === '6.4.1' && neu.version === NEU, `${alt.version} gegen ${neu.version}`);
    pruefe(`${name}: Druckdatei, _pod_karte, _vorschau und alle Eigenschaften byte-gleich zu ${REF}`, d.length === 0 && Object.keys(alt.props).length >= 3, `Unterschiede: ${d.join(', ')} | ${JSON.stringify(Object.keys(alt.props))}`);
    pruefe(`${name}: Uploads (Anzahl und SHA-256 jedes hochgeladenen Bytestroms) und die übrige Warenkorb-Anfrage gleich`, JSON.stringify(alt.uploads) === JSON.stringify(neu.uploads) && JSON.stringify(alt.rest) === JSON.stringify(neu.rest), JSON.stringify([alt.uploads, neu.uploads]));
    pruefe(`${name}: Eigenschaften vollständig: Druckdatei, ${pflicht.join(', ')}`, pflicht.every((k) => !!neu.props[k] && !!alt.props[k]) && Object.keys(neu.props).some((k) => /Druckdatei/.test(k)), JSON.stringify(Object.keys(neu.props)));
    if (beweis) { const [ok, was] = beweis(neu); pruefe(`${name}: der Weg lief wirklich (${was})`, ok, was); }
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
