#!/usr/bin/env node
/* LuxeStyle — social-profile-polish.mjs  (LOKAL auf dem PC ausführen, NICHT in CI)
 * ----------------------------------------------------------------------------
 * Poliert IG + TikTok + FB Profil OHNE API: steuert dein bereits eingeloggtes Brave
 * über den Remote-Debugging-Port (CDP). Kein Passwort, kein Token — nutzt die offene
 * Brave-Session. Bio/Name/Link sind reversibel; das Skript LÖSCHT NICHTS.
 *
 * VORAUSSETZUNG (du hast das schon):
 *   1) Brave mit Port starten:
 *        Windows: & "C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe" --remote-debugging-port=9222 --user-data-dir="$env:USERPROFILE\brave-agent"
 *   2) In diesem Brave bei instagram.com / tiktok.com / facebook.com eingeloggt sein.
 *   3) Node ist installiert.
 *
 * AUSFÜHREN (im Repo-Ordner, am PC):
 *   npm i puppeteer-core
 *   node automation/social-profile-polish.mjs            # macht alles
 *   node automation/social-profile-polish.mjs instagram  # nur eine Plattform
 *
 * Das Skript NAVIGIERT + TIPPT die Bio/Name. Profilbild-Upload macht es NICHT
 * automatisch (Datei-Dialog ist OS-geschützt) — es öffnet aber die richtige Seite
 * und sagt dir, welche Datei (social/brand/profil-rund-dunkel.jpg) du wählen sollst.
 */
import puppeteer from 'puppeteer-core';

const CDP = process.env.CDP || 'http://localhost:9222';
const ONLY = (process.argv[2] || '').toLowerCase();

const TEXTS = {
  name_ig: 'LuxeStyle · Schweizer Online-Shop',
  bio_ig: '🇨🇭 Schweizer Online-Shop\nMode · Schmuck · Uhren · dein eigenes Design 🎨\n📦 Weltweiter Versand · 30 Tage Rückgabe\n🎁 –10 % mit Code WELCOME10 👇',
  link_ig: 'https://f.mtr.cool/XRISHONHRA',
  name_tt: 'LuxeStyle · Schweizer Shop',
  bio_tt: '🇨🇭 Schweizer Shop · Mode·Schmuck·Uhren\n–10 % Code WELCOME10 · luxestyle.ch',
};

const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function connect(){
  const b = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  return b;
}
async function page(b, url){
  const p = await b.newPage();
  await p.goto(url, { waitUntil:'networkidle2', timeout:60000 }).catch(()=>{});
  await sleep(2500);
  return p;
}

// Robust: Feld per mehreren Selektoren finden, leeren, tippen
async function setField(p, selectors, value){
  for (const sel of selectors){
    const el = await p.$(sel);
    if (el){
      await el.click({ clickCount: 3 }).catch(()=>{});
      await p.keyboard.press('Backspace').catch(()=>{});
      await el.type(value, { delay: 20 }).catch(()=>{});
      return true;
    }
  }
  return false;
}

async function doInstagram(b){
  console.log('\n=== Instagram ===');
  const p = await page(b, 'https://www.instagram.com/accounts/edit/');
  // Felder heissen je nach UI unterschiedlich — mehrere Namen probieren
  const okName = await setField(p, ['input[name="fullName"]','input[aria-label*="Name"]'], TEXTS.name_ig);
  const okBio  = await setField(p, ['textarea[name="biography"]','textarea[aria-label*="Steckbrief"]','textarea[aria-label*="Bio"]'], TEXTS.bio_ig);
  const okLink = await setField(p, ['input[name="url"]','input[aria-label*="Website"]','input[placeholder*="Website"]'], TEXTS.link_ig);
  console.log(`  Name:${okName?'✓':'?'} Bio:${okBio?'✓':'?'} Link:${okLink?'✓':'?'}`);
  console.log('  → Prüfe die Felder im Brave-Fenster und klicke "Senden/Absenden" (Speichern macht NICHT das Skript).');
  console.log('  → Profilbild: oben "Profilfoto ändern" → Datei social/brand/profil-rund-dunkel.jpg wählen.');
}

async function doTikTok(b){
  console.log('\n=== TikTok ===');
  const p = await page(b, 'https://www.tiktok.com/setting?activeTab=editProfile');
  // TikTok-Edit liegt oft hinter einem "Profil bearbeiten"-Button
  console.log('  → Falls ein Dialog "Profil bearbeiten" nötig ist, klicke ihn; das Skript füllt dann Name/Bio.');
  const okName = await setField(p, ['input[data-e2e="edit-profile-nickname"]','input[maxlength="30"]'], TEXTS.name_tt);
  const okBio  = await setField(p, ['textarea[data-e2e="edit-profile-bio"]','textarea[maxlength="80"]'], TEXTS.bio_tt);
  console.log(`  Name:${okName?'✓':'?'} Bio:${okBio?'✓':'?'}`);
  console.log('  → "Speichern" im Fenster klicken. Profilbild: Foto-Icon → profil-rund-dunkel.jpg.');
}

async function doFacebook(b){
  console.log('\n=== Facebook ===');
  await page(b, 'https://business.facebook.com/latest/settings/page_info');
  console.log('  → FB läuft besser per API (Tool fb-profile-polish.mjs). Hier nur Seite geöffnet zum Prüfen.');
}

(async () => {
  let b;
  try { b = await connect(); }
  catch(e){ console.error('❌ Kein Brave auf', CDP, '— starte Brave mit --remote-debugging-port=9222.', e.message); process.exit(1); }
  console.log('✓ Mit Brave verbunden:', CDP);
  if (!ONLY || ONLY==='instagram') await doInstagram(b);
  if (!ONLY || ONLY==='tiktok')    await doTikTok(b);
  if (!ONLY || ONLY==='facebook')  await doFacebook(b);
  console.log('\nFertig. Die Tabs bleiben offen — prüfen + im Fenster speichern. (Skript speichert/löscht nichts selbst.)');
  await b.disconnect();
})();
