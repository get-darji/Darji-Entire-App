const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.resolve(__dirname, '../apps/customer-web/public');
const APP_ICON_PATH = path.resolve(__dirname, '../apps/customer-app/app-icon.png');
const DARJI_LOGO_CROPPED = path.resolve(PUBLIC_DIR, 'darji-logo-cropped.png');
const DARJI_TRANSPARENT = path.resolve(PUBLIC_DIR, 'darji-transparent.png');

async function generateAssets() {
  console.log('Generating Favicons and Brand Assets...');

  // 1. Favicon 16x16, 32x32, 48x48 from app-icon
  const icon16 = await sharp(APP_ICON_PATH)
    .resize(16, 16, { fit: 'contain' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-16x16.png'), icon16);
  console.log('Created favicon-16x16.png');

  const icon32 = await sharp(APP_ICON_PATH)
    .resize(32, 32, { fit: 'contain' })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), icon32);
  console.log('Created favicon-32x32.png');

  const icon48 = await sharp(APP_ICON_PATH)
    .resize(48, 48, { fit: 'contain' })
    .png()
    .toBuffer();

  // Create standard ICO file with 16, 32, 48 PNG frames
  function createIco(pngBuffers) {
    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0); // Reserved
    header.writeUInt16LE(1, 2); // Type 1 = ICO
    header.writeUInt16LE(pngBuffers.length, 4); // Number of images

    let offset = 6 + pngBuffers.length * 16;
    const entries = [];
    const imageBodies = [];

    for (const buf of pngBuffers) {
      const entry = Buffer.alloc(16);
      const metadata = sharp(buf).metadata();
      // Read width and height from buffer or hardcode
      // PNG header has width at offset 16 (4 bytes) and height at offset 20 (4 bytes)
      const width = buf.readUInt32BE(16);
      const height = buf.readUInt32BE(20);

      entry.writeUInt8(width >= 256 ? 0 : width, 0);
      entry.writeUInt8(height >= 256 ? 0 : height, 1);
      entry.writeUInt8(0, 2); // Color palette
      entry.writeUInt8(0, 3); // Reserved
      entry.writeUInt16LE(1, 4); // Color planes
      entry.writeUInt16LE(32, 6); // Bits per pixel
      entry.writeUInt32LE(buf.length, 8); // Size of image data
      entry.writeUInt32LE(offset, 12); // Offset of image data

      entries.push(entry);
      imageBodies.push(buf);
      offset += buf.length;
    }

    return Buffer.concat([header, ...entries, ...imageBodies]);
  }

  const icoBuffer = createIco([icon16, icon32, icon48]);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  console.log('Created favicon.ico');

  // 2. Apple Touch Icon (180x180)
  await sharp(APP_ICON_PATH)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 3. PWA Icons (192x192 and 512x512)
  await sharp(APP_ICON_PATH)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'icon-192.png'));
  console.log('Created icon-192.png');

  await sharp(APP_ICON_PATH)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'icon-512.png'));
  console.log('Created icon-512.png');

  // 4. Social Sharing Image (og-image.jpg and og-image.png) (1200x630)
  // Pure solid black background with centered Darji logo only
  const solidBlackBg = await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }
  })
    .png()
    .toBuffer();

  const logoBuffer = await sharp(DARJI_LOGO_CROPPED)
    .resize(680, null, { fit: 'inside' })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoBuffer).metadata();
  const left = Math.round((1200 - logoMeta.width) / 2);
  const top = Math.round((630 - logoMeta.height) / 2);

  const ogComposite = await sharp(solidBlackBg)
    .composite([
      {
        input: logoBuffer,
        top: top,
        left: left
      }
    ])
    .toBuffer();

  // Save both og-image.jpg and og-image.png
  await sharp(ogComposite)
    .jpeg({ quality: 96, chromaSubsampling: '4:4:4' })
    .toFile(path.join(PUBLIC_DIR, 'og-image.jpg'));
  console.log('Created og-image.jpg (Solid black + logo only)');

  await sharp(ogComposite)
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));
  console.log('Created og-image.png (Solid black + logo only)');

  // 5. Create site.webmanifest
  const manifest = {
    name: "Darji — Doorstep Tailoring & Alteration Services",
    short_name: "Darji",
    description: "Darji connects customers with trusted local tailors for seamless doorstep tailoring and alteration services.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0A0B",
    theme_color: "#FF7000",
    icons: [
      {
        src: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png"
      },
      {
        src: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png"
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };

  fs.writeFileSync(path.join(PUBLIC_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log('Created site.webmanifest');

  console.log('All brand and SEO assets generated successfully!');
}

generateAssets().catch(console.error);
