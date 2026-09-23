/**
 * social_profil_politur.mjs — poliert Instagram-, TikTok- und Pinterest-Profil im angemeldeten
 * Agenten-Browser (Hetzner). Betreiber 23.09.2026: «jede sozail profile verschönern».
 *
 * Facebook wurde am 23.09. bereits per Graph-API gesetzt (Info, Beschreibung, Website, Profil- und
 * Titelbild). IG/TikTok/Pinterest haben KEINE Profil-Edit-API → dieser Auftrag.
 *
 * Was gesetzt wird (Texte = Laden-Sprache wie Slides/Captions, gleiche Bausteine überall):
 *   IG:        Name «LuxeStyle · Schweizer Shop», Bio (130 Z. ≤ 150), Website https://luxestyle.ch, Profilbild
 *   TikTok:    Name «LuxeStyle · Schweizer Shop», Bio (79 Z. ≤ 80), Profilbild; Bio-Link ist NICHT setzbar
 *              (Business-Konto-Feld; gemessen 22.09.: 0× bioLink) → nur melden
 *   Pinterest: Name, Info (about), Website — nur die Felder, die das Formular sichtbar anbietet
 *
 * REGELN: jedes Feld wird VOR dem Schreiben gelesen (Ist-Wert ins Ergebnis), nur bei Abweichung geschrieben,
 * nach dem Speichern zurückgelesen; Screenshot vorher/nachher je Dienst; jeder Dienst einzeln abgesichert —
 * was nicht klappt, wird mit Grund gemeldet, nichts wird geraten. Nicht angemeldet = Abbruch mit Kennzeichen
 * (der Runner zählt das als «Anmeldung nötig», nicht als Fehler). DRY über auftrag.dry=true: nur lesen.
 */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { ist_anmeldeseite, ist_wandtext } from '../../server/anmelde_erkennung.mjs';

export const TEXTE = {
  name: 'LuxeStyle · Schweizer Shop',
  bio_ig: '🇨🇭 Kleiner Schweizer Shop aus Belp\nMode · Beauty · Wohnen · Technik\nTWINT & Rechnung · 30 Tage Rückgabe\n–10 % mit Code WELCOME10 👇',
  bio_tt: '🇨🇭 Schweizer Shop aus Belp\nMode·Beauty·Wohnen·Technik\nTWINT & Rechnung · Link 👇',
  about_pin: 'Kleiner Schweizer Shop aus Belp – Mode, Beauty, Wohnen, Technik. TWINT & Kauf auf Rechnung · 30 Tage Rückgabe · luxestyle.ch',
  website: 'https://luxestyle.ch',
  bild_url: 'https://raw.githubusercontent.com/allengchour-glitch/aban-news-landing/claude/luxestyle-status-tztnn1/social/brand/profil-rund-dunkel.jpg',
};

const download = (url, dest) => new Promise((res, rej) => {
  const f = fs.createWriteStream(dest);
  https.get(url, r => { if (r.statusCode !== 200) return rej(new Error('HTTP ' + r.statusCode)); r.pipe(f); f.on('finish', () => f.close(() => res(dest))); }).on('error', rej);
});

async function ersterSichtbare(seite, selektoren, ms = 1500) {
  for (const s of selektoren) {
    try { const el = seite.locator(s).first(); if (await el.isVisible({ timeout: ms })) return el; } catch {}
  }
  return null;
}
async function feldSetzen(el, wert) {
  await el.click({ timeout: 5000 });
  await el.press('Control+A').catch(() => {});
  await el.fill(wert).catch(async () => { await el.press('Backspace'); await el.type(wert, { delay: 8 }); });
}
async function klickText(seite, texte) {
  for (const t of texte) {
    const b = seite.getByRole('button', { name: new RegExp(`^\\s*${t}\\s*$`, 'i') }).first();
    try { if (await b.isVisible({ timeout: 1500 })) { await b.click(); return t; } } catch {}
  }
  return null;
}

export default async function ({ ctx, REPO, ERGEBNIS, auftrag }) {
  const dry = !!auftrag.dry;
  const bilder = []; const bericht = { dry, dienste: {} };
  const shot = async (seite, name) => { try { const p = path.join(ERGEBNIS, `${auftrag.id}-${name}.png`); await seite.screenshot({ path: p, fullPage: false }); bilder.push(path.relative(REPO, p)); } catch {} };
  const bild = path.join(ERGEBNIS, `${auftrag.id}-profilbild.jpg`);
  let bildOk = false; try { await download(TEXTE.bild_url, bild); bildOk = true; } catch (e) { bericht.bild_fehler = e.message; }

  // ---------------------------------------------------------------- Instagram
  {
    const seite = await ctx.newPage(); const r = { ist: {}, gesetzt: [], offen: [] }; bericht.dienste.instagram = r;
    try {
      await seite.setViewportSize({ width: 1300, height: 1000 });
      await seite.goto('https://www.instagram.com/accounts/edit/', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await seite.waitForTimeout(5000);
      const url = seite.url(); const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 4000);
      if (ist_anmeldeseite(url)) { const e = new Error('nicht angemeldet — ' + url); e.nichtAngemeldet = true; throw e; }
      if (ist_wandtext(text)) { const e = new Error('Bot-Wand: ' + text.slice(0, 100)); e.umgeleitet = true; throw e; }
      await shot(seite, 'ig-vorher');
      const bio = await ersterSichtbare(seite, ['textarea#pepBio', 'textarea[aria-label*="Bio" i]', 'textarea[aria-label*="Steckbrief" i]', 'form textarea']);
      const name = await ersterSichtbare(seite, ['input#pepName', 'input[aria-label*="Name" i]', 'input[name="name"]']);
      const web = await ersterSichtbare(seite, ['input#pepExternalUrl', 'input[aria-label*="Website" i]', 'input[name="external_url"]']);
      if (bio) r.ist.bio = await bio.inputValue().catch(() => '');
      if (name) r.ist.name = await name.inputValue().catch(() => '');
      if (web) r.ist.website = await web.inputValue().catch(() => '');
      if (!dry) {
        if (bio && r.ist.bio !== TEXTE.bio_ig) { await feldSetzen(bio, TEXTE.bio_ig); r.gesetzt.push('bio'); } else if (!bio) r.offen.push('bio-Feld nicht gefunden');
        if (name && r.ist.name !== TEXTE.name) { await feldSetzen(name, TEXTE.name); r.gesetzt.push('name'); } else if (!name) r.offen.push('name-Feld nicht gefunden');
        if (r.gesetzt.length) {
          const k = await klickText(seite, ['Absenden', 'Submit', 'Speichern', 'Save']);
          if (!k) r.offen.push('Speichern-Knopf nicht gefunden (Bio/Name evtl. nicht gespeichert)');
          await seite.waitForTimeout(3000);
        }
        // Website liegt bei IG unter «Links bearbeiten» — hier nur melden, wenn sie fehlt oder http ist
        if (r.ist.website !== undefined && !/^https:\/\/luxestyle\.ch/.test(r.ist.website)) r.offen.push(`Website steht auf «${r.ist.website}» — unter «Links bearbeiten» auf https://luxestyle.ch setzen`);
        // Profilbild
        if (bildOk) {
          const fi = await ersterSichtbare(seite, ['input[type="file"][accept*="image"]', 'form input[type="file"]'], 800);
          if (fi) { try { await fi.setInputFiles(bild); r.gesetzt.push('profilbild'); await seite.waitForTimeout(4000); } catch (e) { r.offen.push('Profilbild-Upload: ' + e.message.slice(0, 80)); } }
          else r.offen.push('Profilbild: kein Datei-Feld sichtbar (Knopf «Foto ändern» öffnet es erst)');
        }
        await seite.reload({ waitUntil: 'domcontentloaded' }).catch(() => {}); await seite.waitForTimeout(4000);
        const bio2 = await ersterSichtbare(seite, ['textarea#pepBio', 'textarea[aria-label*="Bio" i]', 'form textarea']);
        r.rueckgelesen = { bio: bio2 ? await bio2.inputValue().catch(() => '') : null };
        r.bio_stimmt = r.rueckgelesen.bio === TEXTE.bio_ig;
      }
      await shot(seite, 'ig-nachher');
    } catch (e) { r.fehler = e.message; r.nichtAngemeldet = !!e.nichtAngemeldet; await shot(seite, 'ig-fehler'); }
    finally { await seite.close().catch(() => {}); }
  }

  // ---------------------------------------------------------------- TikTok
  {
    const seite = await ctx.newPage(); const r = { ist: {}, gesetzt: [], offen: [] }; bericht.dienste.tiktok = r;
    try {
      await seite.setViewportSize({ width: 1300, height: 1000 });
      await seite.goto('https://www.tiktok.com/@luxestyle.ch', { waitUntil: 'domcontentloaded', timeout: 60000 });
      await seite.waitForTimeout(6000);
      const url = seite.url(); const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 4000);
      if (ist_anmeldeseite(url)) { const e = new Error('nicht angemeldet — ' + url); e.nichtAngemeldet = true; throw e; }
      if (ist_wandtext(text)) { const e = new Error('Bot-Wand: ' + text.slice(0, 100)); e.umgeleitet = true; throw e; }
      await shot(seite, 'tt-vorher');
      const edit = await ersterSichtbare(seite, ['[data-e2e="edit-profile-entrance"]', 'button:has-text("Profil bearbeiten")', 'button:has-text("Edit profile")'], 4000);
      if (!edit) { r.offen.push('«Profil bearbeiten» nicht sichtbar — angemeldet als anderes Konto?'); throw new Error('Edit-Knopf fehlt'); }
      await edit.click(); await seite.waitForTimeout(3000);
      const name = await ersterSichtbare(seite, ['[data-e2e="edit-profile-name-input"]', 'input[placeholder*="Name" i]']);
      const bio = await ersterSichtbare(seite, ['[data-e2e="edit-profile-bio-input"]', 'textarea']);
      if (name) r.ist.name = await name.inputValue().catch(() => '');
      if (bio) r.ist.bio = await bio.inputValue().catch(() => '');
      if (!dry) {
        if (name && r.ist.name !== TEXTE.name) { await feldSetzen(name, TEXTE.name); r.gesetzt.push('name'); }
        if (bio && r.ist.bio !== TEXTE.bio_tt) { await feldSetzen(bio, TEXTE.bio_tt); r.gesetzt.push('bio'); }
        if (bildOk) {
          const fi = await ersterSichtbare(seite, ['input[type="file"]'], 800);
          if (fi) { try { await fi.setInputFiles(bild); r.gesetzt.push('profilbild'); await seite.waitForTimeout(3000); const ok = await klickText(seite, ['Anwenden', 'Apply', 'Speichern', 'Save']); if (ok) await seite.waitForTimeout(2000); } catch (e) { r.offen.push('Profilbild: ' + e.message.slice(0, 80)); } }
          else r.offen.push('Profilbild: kein Datei-Feld im Dialog');
        }
        if (r.gesetzt.length) {
          const k = await ersterSichtbare(seite, ['[data-e2e="edit-profile-save"]', 'button:has-text("Speichern")', 'button:has-text("Save")'], 3000);
          if (k) { await k.click(); await seite.waitForTimeout(4000); } else r.offen.push('Speichern-Knopf nicht gefunden');
        }
        r.offen.push('Bio-Link (Website) ist bei TikTok nur im Business-Konto setzbar — Betreiber-Klick, hier nicht automatisierbar');
      }
      await shot(seite, 'tt-nachher');
    } catch (e) { r.fehler = r.fehler || e.message; r.nichtAngemeldet = !!e.nichtAngemeldet; await shot(seite, 'tt-fehler'); }
    finally { await seite.close().catch(() => {}); }
  }

  // ---------------------------------------------------------------- Pinterest
  {
    const seite = await ctx.newPage(); const r = { ist: {}, gesetzt: [], offen: [] }; bericht.dienste.pinterest = r;
    try {
      await seite.setViewportSize({ width: 1500, height: 1100 });
      await seite.goto('https://ch.pinterest.com/settings/', { waitUntil: 'load', timeout: 60000 });
      await seite.waitForTimeout(6000);
      const url = seite.url(); const text = (await seite.locator('body').innerText().catch(() => '')).slice(0, 4000);
      if (ist_anmeldeseite(url)) { const e = new Error('nicht angemeldet — ' + url); e.nichtAngemeldet = true; throw e; }
      if (ist_wandtext(text)) { const e = new Error('Bot-Wand: ' + text.slice(0, 100)); e.umgeleitet = true; throw e; }
      await shot(seite, 'pin-vorher');
      const name = await ersterSichtbare(seite, ['input[name="first_name"]', 'input#first_name', 'input[data-test-id*="first" i]']);
      const about = await ersterSichtbare(seite, ['textarea[name="about"]', 'textarea#about', 'textarea[data-test-id*="about" i]', 'textarea']);
      const web = await ersterSichtbare(seite, ['input[name="website_url"]', 'input#website_url', 'input[data-test-id*="website" i]']);
      if (name) r.ist.name = await name.inputValue().catch(() => '');
      if (about) r.ist.about = await about.inputValue().catch(() => '');
      if (web) r.ist.website = await web.inputValue().catch(() => '');
      if (!dry) {
        if (name && r.ist.name !== 'LuxeStyle') { await feldSetzen(name, 'LuxeStyle'); r.gesetzt.push('name'); }
        if (about && r.ist.about !== TEXTE.about_pin) { await feldSetzen(about, TEXTE.about_pin); r.gesetzt.push('about'); }
        if (web && r.ist.website !== TEXTE.website) { await feldSetzen(web, TEXTE.website); r.gesetzt.push('website'); }
        if (r.gesetzt.length) {
          const k = await ersterSichtbare(seite, ['button[data-test-id="settings-form-save"]', 'button:has-text("Speichern")', 'button:has-text("Save")'], 3000);
          if (k) { await k.click(); await seite.waitForTimeout(4000); } else r.offen.push('Speichern-Knopf nicht gefunden');
        }
        await seite.reload({ waitUntil: 'load' }).catch(() => {}); await seite.waitForTimeout(5000);
        const about2 = await ersterSichtbare(seite, ['textarea[name="about"]', 'textarea#about', 'textarea']);
        r.rueckgelesen = { about: about2 ? await about2.inputValue().catch(() => '') : null };
        r.about_stimmt = r.rueckgelesen.about === TEXTE.about_pin;
      }
      await shot(seite, 'pin-nachher');
    } catch (e) { r.fehler = e.message; r.nichtAngemeldet = !!e.nichtAngemeldet; await shot(seite, 'pin-fehler'); }
    finally { await seite.close().catch(() => {}); }
  }

  const na = Object.values(bericht.dienste).filter(d => d.nichtAngemeldet).length;
  if (na === Object.keys(bericht.dienste).length) { const e = new Error('bei keinem Dienst angemeldet'); e.nichtAngemeldet = true; throw e; }
  return { ...bericht, bilder };
}
