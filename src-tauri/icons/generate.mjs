import { deflateSync } from 'zlib';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const dir = dirname(fileURLToPath(import.meta.url));
mkdirSync(dir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function roundedRect(px, py, x, y, w, h, r) {
  const cx = Math.max(x, Math.min(px, x + w));
  const cy = Math.max(y, Math.min(py, y + h));
  if (px >= x + r && px <= x + w - r) return py >= y && py <= y + h;
  if (py >= y + r && py <= y + h - r) return px >= x && px <= x + w;
  const corners = [
    [x + r, y + r],
    [x + w - r, y + r],
    [x + r, y + h - r],
    [x + w - r, y + h - r],
  ];
  return corners.some(([qx, qy]) => (px - qx) ** 2 + (py - qy) ** 2 <= r * r);
}

function pixel(x, y, size) {
  const s = size / 32;
  const dx = x + 0.5 - size / 2;
  const dy = y + 0.5 - size / 2;
  if (dx * dx + dy * dy > (size / 2 - 0.4) ** 2) return [0, 0, 0, 0];
  if (
    roundedRect(x + 0.5, y + 0.5, 8 * s, 8.2 * s, 7.2 * s, 15.6 * s, 3.6 * s) ||
    roundedRect(x + 0.5, y + 0.5, 16.8 * s, 8.2 * s, 7.2 * s, 10.4 * s, 3.6 * s)
  ) {
    return [20, 20, 21, 255];
  }
  return [245, 165, 36, 255];
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y, size);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
      raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function ico(sizes) {
  const images = sizes.map((size) => ({ size, data: png(size) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach((image, i) => {
    const o = i * 16;
    dir[o] = image.size >= 256 ? 0 : image.size;
    dir[o + 1] = image.size >= 256 ? 0 : image.size;
    dir.writeUInt32LE(image.data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += image.data.length;
  });
  return Buffer.concat([header, dir, ...images.map((image) => image.data)]);
}

writeFileSync(join(dir, '32x32.png'), png(32));
writeFileSync(join(dir, '128x128.png'), png(128));
writeFileSync(join(dir, '128x128@2x.png'), png(256));
writeFileSync(join(dir, 'icon.ico'), ico([16, 32, 48, 256]));
console.log('icons ok');
