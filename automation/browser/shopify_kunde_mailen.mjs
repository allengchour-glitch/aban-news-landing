/**
 * shopify_kunde_mailen.mjs — Kundin aus der Shopify-Bestellung anschreiben (Absender = Shop-Adresse info@luxestyle.ch).
 *
 * Anlass 28.09.2026: #1019 — unsere Mail vom 27.09. ging vom privaten Gmail raus (der Gmail-Konnektor kennt keinen anderen
 * Absender, zoho_mail.py hat hier kein App-Passwort). Betreiber: «nochmal mail im info@luxestyle machen» / «mit hetzner machen
 * mail». Der Hetzner-Browser ist im Shopify-Admin angemeldet (Auftrag 05-anmeldungen) → «Kunde kontaktieren» in der Bestellung.
 *
 * Zwei Stufen, weil die Admin-Oberfläche von hier nicht sichtbar ist:
 *   senden:false (Standard) — Bestellung öffnen, Kontakt-Dialog öffnen, Felder ausfüllen, Bildschirmfotos + Feld-/Knopfliste,
 *                             NICHTS absenden.
 *   senden:true             — dasselbe, dann den Senden-Knopf, danach Bestätigung/Timeline ablesen.
 *
 * Schutz: Die Bestellung muss eine Mailadresse zeigen, deren SHA-256 = auftrag.an_sha256 ist, sonst Abbruch. Keine Adresse wird
 * aus dem Auftrag in ein Empfängerfeld geschrieben — Empfänger ist immer die Kundin der Bestellung.
 * ⚠️ DATENSCHUTZ: Das Repo ist ÖFFENTLICH, Auftrag und Quittung landen darin. Darum: keine Adresse/kein Name im Auftrag (nur der
 * Hash), KEINE Bildschirmfotos (Bestellseite = Adresse, Telefon), jede Mailadresse in der Quittung wird maskiert.
 *
 * auftrag: { id, typ:"skript", skript:"shopify_kunde_mailen.mjs", bestellung:"19063546085767", an_sha256:"…", betreff:"…", text:"…", senden:false }
 */
import { ist_anmeldeseite, ist_fehlerseite } from '../../server/anmelde_erkennung.mjs';

const SHOP = 'au3j0y-hq';
const MAIL_RE = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
const maske = t => (t || '').replace(MAIL_RE, '<mail>').replace(/\+?\d[\d ]{8,}\d/g, '<tel>');

async function felder(seite) {
  return seite.evaluate(() => {
    const sichtbar = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const label = el => {
      const id = el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      return (id?.innerText || el.getAttribute('aria-label') || el.placeholder || el.name || '').trim().slice(0, 60);
    };
    const dlg = [...document.querySelectorAll('[role="dialog"], dialog, .Polaris-Modal-Dialog')].filter(sichtbar);
    const wurzel = dlg[dlg.length - 1] || document;
    return {
      dialog: !!dlg.length,
      dialog_text: dlg.length ? dlg[dlg.length - 1].innerText.slice(0, 1500) : null,   // wird ausserhalb maskiert
      eingaben: [...wurzel.querySelectorAll('input, textarea, select, [contenteditable="true"]')].filter(sichtbar)
        .map(e => ({ tag: e.tagName.toLowerCase(), typ: e.type || null, label: label(e), wert: (e.value || e.innerText || '').slice(0, 80) })),
      knoepfe: [...wurzel.querySelectorAll('button, a[role="button"]')].filter(sichtbar)
        .map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 40),
    };
  });
}

export default async function ({ ctx, auftrag, REPO, ERGEBNIS }) {
  const path = await import('node:path');
  if (!/^\d+$/.test(String(auftrag.bestellung || ''))) throw new Error('auftrag.bestellung (Zahl) fehlt');
  if (!/^[0-9a-f]{64}$/.test(auftrag.an_sha256 || '') || !auftrag.betreff || !auftrag.text) throw new Error('auftrag.an_sha256 / betreff / text fehlt');
  const { createHash } = await import('node:crypto');
  const bilder = [];                        // bewusst leer: keine Fotos mit Kundendaten ins öffentliche Repo
  const foto = async () => {};
  const felderM = async s => { const f = await felder(s); f.dialog_text = maske(f.dialog_text);
    f.eingaben = f.eingaben.map(e => ({ ...e, label: maske(e.label), wert: maske(e.wert) })); f.knoepfe = f.knoepfe.map(maske); return f; };
  const seite = await ctx.newPage();
  await seite.setViewportSize({ width: 1400, height: 1000 });
  const url = `https://admin.shopify.com/store/${SHOP}/orders/${auftrag.bestellung}`;
  const antwort = await seite.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await seite.waitForTimeout(8000);
  const ziel = seite.url();
  if (ist_anmeldeseite(ziel)) return { stand_hinweis: 'nicht-angemeldet', ziel };
  const fehler = ist_fehlerseite(antwort ? antwort.status() : null, ziel);
  await foto(seite, 1);
  const text = await seite.evaluate(() => document.body.innerText);
  const an = [...new Set(text.match(MAIL_RE) || [])].find(m => createHash('sha256').update(m.toLowerCase()).digest('hex') === auftrag.an_sha256);
  if (!an) {
    return { ok: false, grund: 'erwartete Empfaengeradresse nicht auf der Bestellseite — Abbruch', ziel, fehler, textanfang: maske(text.slice(0, 600)) };
  }

  // Kontakt öffnen: zuerst ausdrückliche Knöpfe, sonst die Mail-Adresse der Kundin selbst (öffnet in Shopify den Kontaktdialog)
  const versuche = [
    seite.getByRole('button', { name: /kunde kontaktieren|contact customer|e-?mail senden|send email/i }).first(),
    seite.getByRole('link', { name: /kunde kontaktieren|contact customer/i }).first(),
    seite.getByText(an, { exact: true }).first(),
  ];
  let geoeffnet = null;
  for (const v of versuche) {
    try { if (await v.isVisible({ timeout: 2000 })) { await v.click(); geoeffnet = maske(String(v)); break; } } catch {}
  }
  await seite.waitForTimeout(4000);
  await foto(seite, 2);
  let f = await felderM(seite);
  if (!f.dialog) return { ok: false, grund: 'kein Kontakt-Dialog aufgegangen', geoeffnet, felder: f, ziel };

  // Felder füllen (Betreff = erstes Textfeld mit Betreff/Subject, Nachricht = Textarea/Editor)
  const dlg = seite.locator('[role="dialog"], dialog').last();
  const betreff = dlg.getByLabel(/betreff|subject/i).first();
  const nachricht = dlg.getByLabel(/nachricht|message|benutzerdefiniert|custom/i).first();
  const gefuellt = {};
  try { await betreff.fill(auftrag.betreff, { timeout: 5000 }); gefuellt.betreff = true; } catch (e) { gefuellt.betreff = String(e.message).slice(0, 100); }
  try { await nachricht.fill(auftrag.text, { timeout: 5000 }); gefuellt.nachricht = true; } catch (e) { gefuellt.nachricht = String(e.message).slice(0, 100); }
  await seite.waitForTimeout(1500);
  await foto(seite, 3);
  f = await felderM(seite);

  if (!auftrag.senden) return { ok: true, modus: 'PROBE — nichts gesendet', geoeffnet, gefuellt, felder: f, ziel };

  if (gefuellt.betreff !== true || gefuellt.nachricht !== true) return { ok: false, grund: 'Felder nicht gefuellt — nicht gesendet', gefuellt, felder: f };
  // Senden: ggf. zweistufig («Überprüfen» → «Senden»)
  const schritte = [];
  for (let i = 0; i < 2; i++) {
    const k = dlg.getByRole('button', { name: /^(e-?mail )?senden$|^send( email| notification)?$|benachrichtigung senden|überprüfen|review/i }).last();
    if (!(await k.isVisible({ timeout: 3000 }).catch(() => false))) break;
    const name = (await k.innerText()).trim(); schritte.push(name); await k.click(); await seite.waitForTimeout(4000);
    if (!/überprüfen|review/i.test(name)) break;
  }
  await foto(seite, 4);
  const danach = await seite.evaluate(() => document.body.innerText.slice(0, 4000));
  return {
    ok: schritte.length > 0, modus: 'GESENDET', schritte, gefuellt,
    bestaetigung: maske((danach.match(/(E-Mail|Email)[^\n]{0,80}(gesendet|sent)[^\n]{0,80}/i) || [''])[0]) || null,
    dialog_noch_offen: (await felder(seite)).dialog,
  };
}
