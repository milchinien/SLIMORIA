/* ---------------------------------------------------------------------------
 * PNG lesen, skalieren, schreiben — ohne Fremdbibliothek, zlib reicht.
 *
 * Die Rohtexturen der Kaufpakete sind 2048er und 4096er Bloecke, zusammen
 * ueber 350 MB. Im Editor werden davon dutzende gleichzeitig gebraucht; ohne
 * Verkleinerung ist der Grafikspeicher voll, bevor der erste Baum steht.
 * Deshalb laeuft jede Textur einmal durch diese Datei und liegt danach als
 * handliche Kachel im Web-Ordner.
 *
 * Unterstuetzt wird, was in den Paketen wirklich vorkommt: Bittiefe 8 und 16,
 * Farbtyp 0/2/4/6, nicht verschraenkt. Paletten (Farbtyp 3) kommen nicht vor
 * und werden ehrlich abgelehnt statt halb falsch geraten.
 * ------------------------------------------------------------------------- */

import fs from 'node:fs';
import zlib from 'node:zlib';

const KANAELE = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/* Liest ein PNG und gibt immer RGBA8 zurueck — der Rest des Werkzeugs muss
 * sich dadurch nie um Bittiefen kuemmern. */
export function pngLesen(datei) {
  const buf = fs.readFileSync(datei);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('kein PNG: ' + datei);

  let p = 8, w = 0, h = 0, bit = 8, typ = 6, inter = 0;
  const idat = [];
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const art = buf.toString('ascii', p + 4, p + 8);
    const d = buf.subarray(p + 8, p + 8 + len);
    if (art === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4);
      bit = d[8]; typ = d[9]; inter = d[12];
    } else if (art === 'IDAT') idat.push(d);
    else if (art === 'IEND') break;
    p += 12 + len;
  }
  if (inter !== 0) throw new Error('verschraenktes PNG nicht unterstuetzt: ' + datei);
  if (typ === 3) throw new Error('Paletten-PNG nicht unterstuetzt: ' + datei);
  if (bit !== 8 && bit !== 16) throw new Error('Bittiefe ' + bit + ' nicht unterstuetzt: ' + datei);

  const kanal = KANAELE[typ];
  const bpp = kanal * (bit / 8);          // Bytes je Bildpunkt in der Rohzeile
  const stride = w * bpp;
  const roh = zlib.inflateSync(Buffer.concat(idat));

  const out = Buffer.alloc(w * h * 4);
  let vor = Buffer.alloc(stride);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const f = roh[q++];
    const zeile = Buffer.from(roh.subarray(q, q + stride));
    q += stride;
    // Rueckwaerts filtern (PNG-Spezifikation, Kapitel 9).
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? zeile[i - bpp] : 0;
      const b = vor[i];
      const c = i >= bpp ? vor[i - bpp] : 0;
      let v = zeile[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      zeile[i] = v & 255;
    }
    // Nach RGBA8 ausrollen. Bei 16 Bit zaehlt nur das hohe Byte — fuer eine
    // Editor-Vorschau ist der Unterschied nicht sichtbar.
    const schritt = bit === 16 ? 2 : 1;
    for (let x = 0; x < w; x++) {
      const s = x * bpp, t = (y * w + x) * 4;
      const k = (n) => zeile[s + n * schritt];
      if (kanal === 1)      { const g = k(0); out[t] = g; out[t + 1] = g; out[t + 2] = g; out[t + 3] = 255; }
      else if (kanal === 2) { const g = k(0); out[t] = g; out[t + 1] = g; out[t + 2] = g; out[t + 3] = k(1); }
      else if (kanal === 3) { out[t] = k(0); out[t + 1] = k(1); out[t + 2] = k(2); out[t + 3] = 255; }
      else                  { out[t] = k(0); out[t + 1] = k(1); out[t + 2] = k(2); out[t + 3] = k(3); }
    }
    vor = zeile;
  }
  return { w, h, data: out };
}

/* Kastenfilter auf Zielgroesse. Kein Lanczos: die Vorlagen sind stilisiert,
 * und ein weicheres Bild faellt bei Kacheltexturen weniger auf als Ringe. */
export function skalieren(bild, zielW, zielH) {
  if (bild.w === zielW && bild.h === zielH) return bild;
  const out = Buffer.alloc(zielW * zielH * 4);
  const sx = bild.w / zielW, sy = bild.h / zielH;
  for (let y = 0; y < zielH; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.min(bild.h, Math.ceil((y + 1) * sy)));
    for (let x = 0; x < zielW; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.min(bild.w, Math.ceil((x + 1) * sx)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) {
          const t = (yy * bild.w + xx) * 4;
          // Farbe mit Alpha gewichten, sonst blutet Schwarz aus durchsichtigen
          // Bildpunkten in die Blattraender — der klassische Saum bei Laub.
          const al = bild.data[t + 3];
          r += bild.data[t] * al; g += bild.data[t + 1] * al; b += bild.data[t + 2] * al;
          a += al; n++;
        }
      }
      const t = (y * zielW + x) * 4;
      if (a > 0) { out[t] = Math.round(r / a); out[t + 1] = Math.round(g / a); out[t + 2] = Math.round(b / a); }
      out[t + 3] = Math.round(a / n);
    }
  }
  return { w: zielW, h: zielH, data: out };
}

/* Groesste Zweierpotenz <= Kante, damit Mipmaps und Wiederholung sicher sind. */
export function aufKante(bild, maxKante) {
  const zwei = (n) => { let p = 1; while (p * 2 <= n) p *= 2; return p; };
  const w = Math.min(zwei(bild.w), maxKante);
  const h = Math.min(zwei(bild.h), maxKante);
  return skalieren(bild, w, h);
}

/* Schreibt RGBA8 als PNG. Undurchsichtige Bilder werden als RGB abgelegt —
 * das spart bei 1024er Kacheln je Datei rund ein Viertel. */
export function pngSchreiben(datei, bild, { alpha = null } = {}) {
  const { w, h, data } = bild;
  let hatAlpha = alpha;
  if (hatAlpha === null) {
    hatAlpha = false;
    for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) { hatAlpha = true; break; }
  }
  const kanal = hatAlpha ? 4 : 3;
  const stride = w * kanal;
  const roh = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    roh[y * (stride + 1)] = 0;                       // Filter 0: keiner
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, t = y * (stride + 1) + 1 + x * kanal;
      roh[t] = data[s]; roh[t + 1] = data[s + 1]; roh[t + 2] = data[s + 2];
      if (hatAlpha) roh[t + 3] = data[s + 3];
    }
  }
  const idat = zlib.deflateSync(roh, { level: 9 });

  const stueck = (art, inhalt) => {
    const b = Buffer.alloc(12 + inhalt.length);
    b.writeUInt32BE(inhalt.length, 0);
    b.write(art, 4, 'ascii');
    inhalt.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + inhalt.length)) >>> 0, 8 + inhalt.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = hatAlpha ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  fs.writeFileSync(datei, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    stueck('IHDR', ihdr), stueck('IDAT', idat), stueck('IEND', Buffer.alloc(0)),
  ]));
}

let CRC_TAB = null;
function crc32(buf) {
  if (!CRC_TAB) {
    CRC_TAB = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TAB[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return c ^ -1;
}

/* Mittlere Farbe eines Bildes, Alpha gewichtet. Der Editor faerbt damit
 * Katalogeintraege ein, bevor die erste Vorschau gerendert ist. */
export function mittelFarbe(bild) {
  let r = 0, g = 0, b = 0, a = 0;
  for (let i = 0; i < bild.data.length; i += 4) {
    const al = bild.data[i + 3];
    r += bild.data[i] * al; g += bild.data[i + 1] * al; b += bild.data[i + 2] * al; a += al;
  }
  if (!a) return [128, 128, 128];
  return [Math.round(r / a), Math.round(g / a), Math.round(b / a)];
}
