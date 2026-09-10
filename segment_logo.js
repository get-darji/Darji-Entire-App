const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function segmentLogo() {
  const fullWhite = sharp('apps/customer-web/public/darji-wordmark-white.png');
  const { data, info } = await fullWhite.raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  // Let's create directory for logo-parts
  const outDir = 'apps/customer-web/public/logo-parts';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Let's find pixel columns:
  // Let's slice into 5 letter segments:
  // D: x = 0 to 142
  // a: x = 142 to 215
  // r: x = 215 to 275
  // j: x = 275 to 335 (or full tail)
  // i: x = 335 to 365

  // To make seamless assembly when placed side-by-side, each segment has its own width:
  const slices = [
    { name: 'd', x1: 0, x2: 145 },
    { name: 'a', x1: 145, x2: 216 },
    { name: 'r', x1: 216, x2: 276 },
    { name: 'j', x1: 276, x2: 336 },
    { name: 'i', x1: 336, x2: 365 }
  ];

  for (const s of slices) {
    const sw = s.x2 - s.x1;
    await sharp('apps/customer-web/public/darji-wordmark-white.png')
      .extract({ left: s.x1, top: 0, width: sw, height: H })
      .toFile(path.join(outDir, `darji-${s.name}.png`));
    console.log(`Saved darji-${s.name}.png: width ${sw} x ${H}`);
  }

  // Also save a high-res scaled up 3x version so it looks razor sharp on 4K / retina screens!
  const highRes = await sharp('apps/customer-web/public/darji-wordmark-white.png')
    .resize(W * 3, H * 3, { kernel: 'lanczos3' })
    .toBuffer();

  const hrInfo = await sharp(highRes).metadata();
  const hrW = hrInfo.width;
  const hrH = hrInfo.height;

  for (const s of slices) {
    const hrX1 = Math.round(s.x1 * 3);
    const hrX2 = Math.round(s.x2 * 3);
    const sw = hrX2 - hrX1;
    await sharp(highRes)
      .extract({ left: hrX1, top: 0, width: sw, height: hrH })
      .toFile(path.join(outDir, `darji-${s.name}@3x.png`));
  }

  console.log('Saved high-res 3x letter assets!');
}

segmentLogo().catch(console.error);
