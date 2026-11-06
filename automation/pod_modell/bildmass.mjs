/**
 * Bildgrösse aus den ersten Bytes einer Datei (JPEG, PNG, GIF, WebP). Rein: kein Netz. Die Modell-Fabrik misst damit, ob ein Printful-Bild «lesbar» gross ist
 * (kürzere Seite ≥ 600 px), ohne die Bilder ganz herunterzuladen (bilder_messen.mjs holt nur die ersten 64 KB per Range-Anfrage).
 * Gibt {w, h, art} oder null (nicht erkannt / noch nicht genug Bytes) zurück. Nie raten.
 */
export function bildMass(buf) {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {            // PNG: IHDR bei Byte 16
    const w = (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0, h = (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0;
    return w > 0 && h > 0 ? { w, h, art: 'png' } : null;
  }
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) { const w = b[6] | b[7] << 8, h = b[8] | b[9] << 8; return w > 0 && h > 0 ? { w, h, art: 'gif' } : null; }
  if (b.length >= 30 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {   // RIFF....WEBP
    const k = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (k === 'VP8 ' && b.length >= 30) return { w: (b[26] | b[27] << 8) & 0x3fff, h: (b[28] | b[29] << 8) & 0x3fff, art: 'webp' };
    if (k === 'VP8L' && b.length >= 25) { const v = b[21] | b[22] << 8 | b[23] << 16 | b[24] << 24; return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1, art: 'webp' }; }
    if (k === 'VP8X' && b.length >= 30) return { w: (b[24] | b[25] << 8 | b[26] << 16) + 1, h: (b[27] | b[28] << 8 | b[29] << 16) + 1, art: 'webp' };
    return null;
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {                                                  // JPEG: Marken durchlaufen bis zu einem SOF
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      let m = b[i + 1];
      while (m === 0xff && i + 2 < b.length) { i++; m = b[i + 1]; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        const h = b[i + 5] << 8 | b[i + 6], w = b[i + 7] << 8 | b[i + 8];
        return w > 0 && h > 0 ? { w, h, art: 'jpeg' } : null;
      }
      const len = b[i + 2] << 8 | b[i + 3];
      if (len < 2) return null;
      i += 2 + len;
    }
    return null;
  }
  return null;
}
