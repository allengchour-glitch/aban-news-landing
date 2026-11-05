// Tests für bildmass.mjs und bilder_messen.mjs (kein Netz: fetch-Attrappe, Bytes von Hand gebaut). Lauf: /opt/node22/bin/node automation/pod_modell/bildmass_test.mjs
import { writeFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bildMass } from './bildmass.mjs';
import { adressenAus, erlaubt, main } from './bilder_messen.mjs';
import { neuerTest } from './testhilfe.mjs';
const { ist, wahr, ende } = neuerTest('bildmass');

const be16 = (n) => [n >> 8, n & 255];
const le16 = (n) => [n & 255, n >> 8];
const png = (w, h) => Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, w >>> 24, (w >> 16) & 255, (w >> 8) & 255, w & 255, h >>> 24, (h >> 16) & 255, (h >> 8) & 255, h & 255, 8, 2, 0, 0, 0]);
const jpeg = (w, h, davor = []) => Uint8Array.from([0xff, 0xd8, ...davor, 0xff, 0xc0, 0, 17, 8, ...be16(h), ...be16(w), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9]);
const exif = (n) => [0xff, 0xe1, ...be16(n + 2), ...Array(n).fill(0)];
const gif = (w, h) => Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, ...le16(w), ...le16(h), 0, 0, 0]);
ist('PNG 700×1000', bildMass(png(700, 1000)), { w: 700, h: 1000, art: 'png' });
ist('PNG ohne Grösse 0', bildMass(png(0, 5)), null);
ist('JPEG 700×1000', bildMass(jpeg(700, 1000)), { w: 700, h: 1000, art: 'jpeg' });
ist('JPEG mit grossem EXIF-Block davor (30 000 Byte)', bildMass(jpeg(600, 800, exif(30000))), { w: 600, h: 800, art: 'jpeg' });
ist('JPEG: Marke DHT (0xC4) ist kein SOF', bildMass(Uint8Array.from([0xff, 0xd8, 0xff, 0xc4, 0, 4, 0, 0, 0xff, 0xc0, 0, 17, 8, 1, 0, 2, 0, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1])), { w: 512, h: 256, art: 'jpeg' });
ist('JPEG abgeschnitten (nur 6 Byte, vor der Grösse): nicht erkannt, nicht geraten', bildMass(jpeg(700, 1000).slice(0, 6)), null);
ist('GIF 20×10', bildMass(gif(20, 10)), { w: 20, h: 10, art: 'gif' });
ist('WebP VP8X 1000×500', bildMass(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0, ...[999 & 255, 999 >> 8, 0], ...[499 & 255, 499 >> 8, 0]])), { w: 1000, h: 500, art: 'webp' });
ist('Text ist kein Bild', bildMass(new TextEncoder().encode('<html>nicht gefunden</html>')), null);
ist('leer', bildMass(new Uint8Array(0)), null);

ist('erlaubte Hosts: nur https auf Printful', ['https://files.cdn.printful.com/a.jpg', 'http://files.cdn.printful.com/a.jpg', 'https://evil.example/a.jpg', 'https://files.cdn.printful.com.evil.example/a.jpg', 'kein url'].map(erlaubt), [true, false, false, false, false]);
const dir = mkdtempSync(join(tmpdir(), 'bm-'));
writeFileSync(join(dir, 'p.json'), JSON.stringify({ medien: [{ url: 'https://files.cdn.printful.com/a.jpg' }], bilder: { ungemessen: ['https://files.cdn.printful.com/b.jpg'], kandidaten: ['https://files.cdn.printful.com/c.jpg'] } }));
ist('Adressen aus Plan-Dateien (Medien, ungemessen, Kandidaten)', adressenAus({ plaeneDir: dir }).sort(), ['https://files.cdn.printful.com/a.jpg', 'https://files.cdn.printful.com/b.jpg', 'https://files.cdn.printful.com/c.jpg']);
writeFileSync(join(dir, 'u.txt'), 'https://files.cdn.printful.com/x.jpg\n\nhttps://evil.example/y.jpg\n');
const aufrufe = [];
const fetchFn = async (url, o) => { aufrufe.push([url, o.headers.Range]); return { status: 206, headers: { get: () => 'bytes 0-99/5000' }, arrayBuffer: async () => jpeg(700, 1000).buffer }; };
const out = join(dir, 'm.json');
const erg = await main({ URLS: join(dir, 'u.txt'), OUT: out, PAUSE_MS: '0' }, fetchFn, async () => {});
ist('Messung: erlaubte Adresse gemessen, fremde Adresse nie angefragt', [erg['https://files.cdn.printful.com/x.jpg'].w, erg['https://evil.example/y.jpg'].fehler, aufrufe.length], [700, 'Host nicht erlaubt', 1]);
ist('Messung: nur die ersten 64 KB per Range', aufrufe[0][1], 'bytes=0-65535');
ist('Messung: Ergebnisdatei geschrieben', JSON.parse(readFileSync(out, 'utf8'))['https://files.cdn.printful.com/x.jpg'].bytes, 5000);
aufrufe.length = 0; await main({ URLS: join(dir, 'u.txt'), OUT: out, PAUSE_MS: '0' }, fetchFn, async () => {});
ist('zweiter Lauf misst Gemessenes nicht noch einmal', aufrufe.length, 0);
const fehl = await main({ URLS: join(dir, 'u.txt'), OUT: join(dir, 'm2.json'), PAUSE_MS: '0' }, async () => ({ status: 404, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0) }), async () => {});
ist('HTTP 404 wird als Fehler vermerkt, nicht als Grösse', fehl['https://files.cdn.printful.com/x.jpg'].fehler, 'HTTP 404');
const html = await main({ URLS: join(dir, 'u.txt'), OUT: join(dir, 'm3.json'), PAUSE_MS: '0' }, async () => ({ status: 200, headers: { get: () => null }, arrayBuffer: async () => new TextEncoder().encode('<html>x</html>').buffer }), async () => {});
ist('Antwort ist kein Bild: Fehler, keine Grösse', html['https://files.cdn.printful.com/x.jpg'].fehler, 'Format nicht erkannt');
rmSync(dir, { recursive: true, force: true });   // keine Wegwerf-Ordner im Temp-Verzeichnis zurücklassen
ende();
