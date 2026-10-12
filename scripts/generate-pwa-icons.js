import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer: (width * 4 + 1) * height
  const rowSize = 1 + width * 4;
  const rawBuffer = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawBuffer[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawBuffer[pixelOffset] = r;
      rawBuffer[pixelOffset + 1] = g;
      rawBuffer[pixelOffset + 2] = b;
      rawBuffer[pixelOffset + 3] = a;
    }
  }

  const deflatedData = zlib.deflateSync(rawBuffer, { level: 9 });

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      let byte = buf[i];
      crc = crc ^ byte;
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const header = Buffer.alloc(8);
    header.writeUInt32BE(len, 0);
    header.write(type, 4);

    const crcBuf = Buffer.concat([Buffer.from(type), data]);
    const crcVal = crc32(crcBuf);
    const footer = Buffer.alloc(4);
    footer.writeUInt32BE(crcVal, 0);

    return Buffer.concat([header, data, footer]);
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const idatChunk = makeChunk('IDAT', deflatedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Drawing function for FamilyHub Brand Icon
function drawFamilyIcon(x, y, w, h, isMaskable = false) {
  const nx = x / w; // 0 to 1
  const ny = y / h; // 0 to 1

  // Base background: Indigo Gradient (#4F46E5 -> #312E81)
  const bgR = Math.round(79 - (79 - 49) * ny);
  const bgG = Math.round(70 - (70 - 46) * ny);
  const bgB = Math.round(229 - (229 - 129) * ny);

  // If not maskable, we round the corners into a soft squircle
  if (!isMaskable) {
    const r = 0.22; // corner radius in unit coordinates
    const inCornerX = nx < r ? r - nx : nx > (1 - r) ? nx - (1 - r) : 0;
    const inCornerY = ny < r ? r - ny : ny > (1 - r) ? ny - (1 - r) : 0;
    if (inCornerX > 0 && inCornerY > 0) {
      const dist = Math.hypot(inCornerX, inCornerY);
      if (dist > r) {
        return [0, 0, 0, 0]; // Transparent outside squircle
      }
    }
  }

  // Safe zone scaling factor: maskable icons get 0.7 scale to stay within 80% safe zone
  const scale = isMaskable ? 0.72 : 0.88;
  const cx = 0.5;
  const cy = 0.52;
  const px = (nx - cx) / scale + 0.5;
  const py = (ny - cy) / scale + 0.5;

  // 1. Home Roof (Triangle shape: apex at px=0.5, py=0.22, base py=0.48, width 0.7)
  if (py >= 0.20 && py <= 0.44) {
    const halfWidthAtY = (py - 0.20) * 1.5;
    if (Math.abs(px - 0.5) <= halfWidthAtY && Math.abs(px - 0.5) >= halfWidthAtY - 0.08) {
      return [255, 255, 255, 245];
    }
  }

  // 2. Central Family Heart (Rose / Crimson: #F43F5E)
  // Heart curve: (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
  const hx = (px - 0.5) * 3.4;
  const hy = -(py - 0.58) * 3.4;
  const heartEq = Math.pow(hx * hx + hy * hy - 0.85, 3) - hx * hx * Math.pow(hy, 3);
  if (heartEq <= 0) {
    return [244, 63, 94, 255]; // Rose-500
  }

  // 3. Family Figure Heads inside the heart
  // Parent 1 (Center White)
  if (Math.hypot(px - 0.5, py - 0.50) < 0.052) {
    return [255, 255, 255, 255];
  }
  // Parent 2 (Left Gold)
  if (Math.hypot(px - 0.42, py - 0.54) < 0.042) {
    return [253, 224, 71, 255];
  }
  // Child (Right Cyan)
  if (Math.hypot(px - 0.58, py - 0.54) < 0.042) {
    return [103, 232, 249, 255];
  }

  // Default: Indigo background
  return [bgR, bgG, bgB, 255];
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generate all standard PWA assets
const assets = [
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
  { name: 'favicon.png', size: 64, maskable: false },
];

for (const a of assets) {
  const pngBuf = createPNG(a.size, a.size, (x, y, w, h) =>
    drawFamilyIcon(x, y, w, h, a.maskable)
  );
  fs.writeFileSync(path.join(outDir, a.name), pngBuf);
  console.log(`Generated ${a.name} (${a.size}x${a.size})`);
}
