// Alle Bilder der Übersicht in einem Lauf (deviceScaleFactor 2): Desktop 1440×900 und Handy 360×640, 390×844, 412×915, je dunkel und hell,
// Fälle normal, keine Positionen, Echtgeld. Aufruf: node bilder_alle.js <Zielordner>
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const ZIEL = path.resolve(process.argv[2] || path.join(__dirname, 'bilder'));
fs.mkdirSync(ZIEL, { recursive: true });
const FAELLE = [['voll', 'normal'], ['leer', 'keine-positionen'], ['echtgeld', 'echtgeld']];
const HANDYS = [[360, 640], [390, 844], [412, 915]];
let n = 0;
for (const thema of ['dunkel', 'hell']) {
  for (const [fall, name] of FAELLE) {
    execFileSync(process.execPath, [path.join(__dirname, 'schnellbild.js'), fall, '1440', '900', thema, path.join(ZIEL, `desktop-1440x900-${thema}-${name}.png`)], { env: { ...process.env, CLIP: '0,0,1440,900', VOLL: '0' }, stdio: ['ignore', 'ignore', 'inherit'] }); n++;
    for (const [w, h] of HANDYS) {
      const vorsatz = path.join(ZIEL, `tmp-${w}-${thema}-${name}`);
      execFileSync(process.execPath, [path.join(__dirname, 'mobil_bilder.js'), fall, String(w), String(h), thema, vorsatz, 'oben'], { stdio: ['ignore', 'ignore', 'inherit'] });
      fs.renameSync(`${vorsatz}-oben.png`, path.join(ZIEL, `handy-${w}x${h}-${thema}-${name}.png`)); n++;
    }
  }
}
console.log(n, 'Bilder in', ZIEL);
