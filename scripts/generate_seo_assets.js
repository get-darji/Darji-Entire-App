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
  // Let's create an ultra-clean, high-end Open Graph card
  const logoCroppedBuffer = await sharp(DARJI_LOGO_CROPPED)
    .resize(380, null, { fit: 'inside' })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logoCroppedBuffer).metadata();

  const ogSvg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradients -->
      <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#07080a" />
        <stop offset="50%" stop-color="#0d0f14" />
        <stop offset="100%" stop-color="#08090c" />
      </linearGradient>

      <radialGradient id="amberGlow" cx="50%" cy="36%" r="48%">
        <stop offset="0%" stop-color="#ff7000" stop-opacity="0.24" />
        <stop offset="40%" stop-color="#ffaa00" stop-opacity="0.09" />
        <stop offset="100%" stop-color="#ff7000" stop-opacity="0" />
      </radialGradient>

      <linearGradient id="cardBorder" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
        <stop offset="50%" stop-color="#ff7000" stop-opacity="0.28" />
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.06" />
      </linearGradient>
    </defs>

    <!-- Base Canvas -->
    <rect width="1200" height="630" fill="url(#bgGradient)" />

    <!-- Ambient Amber Lighting Glow -->
    <circle cx="600" cy="220" r="480" fill="url(#amberGlow)" />

    <!-- Outer Decorative Border Frame -->
    <rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="url(#cardBorder)" stroke-width="1.5" />

    <!-- Subtle corner accents -->
    <path d="M 60 90 L 60 60 L 90 60" stroke="#ffaa00" stroke-width="2" fill="none" opacity="0.6" />
    <path d="M 1140 90 L 1140 60 L 1110 60" stroke="#ffaa00" stroke-width="2" fill="none" opacity="0.6" />
    <path d="M 60 540 L 60 570 L 90 570" stroke="#ffaa00" stroke-width="2" fill="none" opacity="0.6" />
    <path d="M 1140 540 L 1140 570 L 1110 570" stroke="#ffaa00" stroke-width="2" fill="none" opacity="0.6" />

    <!-- Top Badge -->
    <g transform="translate(600, 75)">
      <rect x="-140" y="-16" width="280" height="32" rx="16" fill="#141820" stroke="#ff7000" stroke-opacity="0.4" stroke-width="1" />
      <circle cx="-110" cy="0" r="4" fill="#ff7000" />
      <text x="-95" y="5" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" letter-spacing="1.5" fill="#f1f5f9">DOORSTEP TAILORING</text>
    </g>

    <!-- Main Headline / Tagline -->
    <text x="600" y="430" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" letter-spacing="-0.5" fill="#ffffff">
      Doorstep Tailoring &amp; Alteration Services
    </text>

    <!-- Subtitle -->
    <text x="600" y="480" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="21" font-weight="400" fill="#94a3b8">
      Custom stitching, precise alterations &amp; repairs picked up from your home
    </text>

    <!-- Bottom Feature Pills -->
    <g transform="translate(600, 536)">
      <text x="-250" y="0" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="500" fill="#cbd5e1">✦ Expert Tailors</text>
      <text x="0" y="0" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="500" fill="#cbd5e1">✦ Doorstep Pickup &amp; Delivery</text>
      <text x="250" y="0" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="500" fill="#cbd5e1">✦ Perfect Fit Guarantee</text>
    </g>
  </svg>
  `;

  // Overlay the exact Darji logo right in the upper-center of the OG card
  const logoTop = Math.round(110);
  const logoLeft = Math.round(600 - logoMeta.width / 2);

  const ogComposite = await sharp(Buffer.from(ogSvg))
    .composite([
      {
        input: logoCroppedBuffer,
        top: logoTop,
        left: logoLeft
      }
    ])
    .toBuffer();

  // Save both og-image.jpg and og-image.png (for maximum compatibility across platforms)
  await sharp(ogComposite)
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .toFile(path.join(PUBLIC_DIR, 'og-image.jpg'));
  console.log('Created og-image.jpg');

  await sharp(ogComposite)
    .png({ compressionLevel: 9 })
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));
  console.log('Created og-image.png');

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
