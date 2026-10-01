const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.resolve(__dirname, '../apps/customer-app/assets/cloth-details');
const FIT_DIR = path.join(ASSETS_DIR, 'fit');
const GARMENTS_DIR = path.join(ASSETS_DIR, 'garments');
const CATEGORIES_DIR = path.join(ASSETS_DIR, 'categories');
const SERVICES_DIR = path.join(ASSETS_DIR, 'services');

[FIT_DIR, GARMENTS_DIR, CATEGORIES_DIR, SERVICES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Brand colors
const NAVY = '#08284A';
const ACCENT = '#F5A400';
const BG = '#F8FAFC';
const WHITE = '#FFFFFF';
const SLATE = '#64748B';
const DARK_SLATE = '#1E293B';
const SOFT_BORDER = '#E2E8F0';

async function svgToWebpAndPng(svgString, outBaseDir, baseName) {
  const svgBuffer = Buffer.from(svgString);
  const webpPath = path.join(outBaseDir, `${baseName}.webp`);
  const pngPath = path.join(outBaseDir, `${baseName}.png`);

  await sharp(svgBuffer)
    .resize(400, 400, { fit: 'cover' })
    .webp({ quality: 90 })
    .toFile(webpPath);

  await sharp(svgBuffer)
    .resize(400, 400, { fit: 'cover' })
    .png({ quality: 90 })
    .toFile(pngPath);

  console.log(`Generated: ${baseName} (.webp + .png)`);
}

// Reusable SVG wrapper with studio lighting and pedestal/mannequin aesthetic
function wrapStudioScene(contentSvg, opts = {}) {
  const { bgGradient = ['#FDFBF7', '#F1F5F9'], pedestal = true } = opts;
  return `
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="studioLight" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${bgGradient[0]}" />
      <stop offset="100%" stop-color="${bgGradient[1]}" />
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#08284A" flood-opacity="0.12" />
    </filter>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#08284A" flood-opacity="0.08" />
    </filter>
    <linearGradient id="navyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0A325E" />
      <stop offset="100%" stop-color="#08284A" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#F5A400" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE68A" />
      <stop offset="50%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#92400E" />
    </linearGradient>
    <linearGradient id="fabricShimmer" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.15" />
    </linearGradient>
    <linearGradient id="fabricMaroon" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#991B1B" />
      <stop offset="100%" stop-color="#7F1D1D" />
    </linearGradient>
    <linearGradient id="fabricTeal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F766E" />
      <stop offset="100%" stop-color="#134E4A" />
    </linearGradient>
    <linearGradient id="fabricEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#064E3B" />
    </linearGradient>
    <linearGradient id="fabricIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3730A3" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="400" height="400" fill="url(#studioLight)" />

  ${pedestal ? `
  <!-- Studio Pedestal / Ground Shadow -->
  <ellipse cx="200" cy="355" rx="140" ry="18" fill="#08284A" fill-opacity="0.06" filter="blur(4px)" />
  <ellipse cx="200" cy="350" rx="90" ry="10" fill="#08284A" fill-opacity="0.09" filter="blur(2px)" />
  <ellipse cx="200" cy="346" rx="60" ry="6" fill="#08284A" fill-opacity="0.14" />
  ` : ''}

  <!-- Graphic Subject -->
  <g filter="url(#softShadow)">
    ${contentSvg}
  </g>
</svg>
`;
}

// Convert existing JPEG to WebP for fit images if needed
async function convertExistingJpgs() {
  const fitFiles = ['men', 'women', 'kids'];
  for (const name of fitFiles) {
    const jpgPath = path.join(FIT_DIR, `${name}.jpg`);
    if (fs.existsSync(jpgPath)) {
      await sharp(jpgPath)
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 90 })
        .toFile(path.join(FIT_DIR, `${name}.webp`));
      
      await sharp(jpgPath)
        .resize(400, 400, { fit: 'cover' })
        .png({ quality: 90 })
        .toFile(path.join(FIT_DIR, `${name}.png`));
      console.log(`Converted existing fit image: ${name}`);
    }
  }
}

// Visual definitions for remaining fit type
const unisexFitSvg = `
  <!-- Minimalist Mannequin with tailored uniform blazer & collared shirt -->
  <path d="M194 65 L206 65 L206 82 L194 82 Z" fill="#E2E8F0" />
  <ellipse cx="200" cy="65" rx="12" ry="5" fill="#CBD5E1" />
  
  <!-- White Collar -->
  <path d="M178 82 L200 110 L222 82 L206 82 L200 95 L194 82 Z" fill="#FFFFFF" />
  <path d="M198 92 L202 92 L200 130 Z" fill="#F5A400" /> <!-- Tie accent -->

  <!-- Modern Uniform Blazer -->
  <path d="M150 100 Q170 85 200 85 Q230 85 250 100 L260 270 Q200 280 140 270 Z" fill="url(#navyGrad)" />
  
  <!-- Lapels -->
  <path d="M170 88 L188 175 L165 145 L155 105 Z" fill="#0E3C6E" />
  <path d="M230 88 L212 175 L235 145 L245 105 Z" fill="#0E3C6E" />
  
  <!-- Pocket & Crest -->
  <rect x="160" y="180" width="30" height="4" rx="2" fill="#F5A400" />
  <rect x="210" y="210" width="35" height="20" rx="4" fill="#0A325E" stroke="#1E4D8A" stroke-width="1.5" />
  <rect x="155" y="210" width="35" height="20" rx="4" fill="#0A325E" stroke="#1E4D8A" stroke-width="1.5" />
  
  <!-- Buttons -->
  <circle cx="200" cy="195" r="4" fill="#F5A400" />
  <circle cx="200" cy="225" r="4" fill="#F5A400" />

  <!-- Wooden Stand -->
  <rect x="197" y="275" width="6" height="70" fill="#94A3B8" />
  <ellipse cx="200" cy="345" rx="35" ry="8" fill="#64748B" />
`;

// Service Category SVGs
const categorySvgs = {
  new_stitching: `
    <!-- Fabric Roll becoming tailored suit -->
    <path d="M120 180 Q140 160 200 160 Q260 160 280 180 L290 300 Q200 320 110 300 Z" fill="url(#fabricTeal)" />
    <!-- Tailor Measuring Tape coiled -->
    <path d="M100 260 C120 220, 160 310, 220 280 C270 250, 290 310, 310 290" fill="none" stroke="#F5A400" stroke-width="16" stroke-linecap="round" />
    <path d="M100 260 C120 220, 160 310, 220 280 C270 250, 290 310, 310 290" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4,6" />
    <!-- Gold Tailor Shears / Scissors -->
    <g transform="translate(190, 90) rotate(25) scale(0.9)">
      <circle cx="30" cy="20" r="16" fill="none" stroke="url(#goldGrad)" stroke-width="6" />
      <circle cx="30" cy="70" r="16" fill="none" stroke="url(#goldGrad)" stroke-width="6" />
      <path d="M30 30 L90 55 L30 60" fill="none" stroke="url(#goldGrad)" stroke-width="6" stroke-linejoin="round" />
      <path d="M40 45 L130 35" fill="none" stroke="url(#goldGrad)" stroke-width="6" stroke-linecap="round" />
      <path d="M40 55 L130 65" fill="none" stroke="url(#goldGrad)" stroke-width="6" stroke-linecap="round" />
      <circle cx="65" cy="50" r="4" fill="#08284A" />
    </g>
  `,
  alteration: `
    <!-- Tailored Torso with adjustment marks & tailor chalk -->
    <path d="M140 100 Q170 85 200 85 Q230 85 260 100 L270 270 Q200 285 130 270 Z" fill="url(#navyGrad)" />
    <!-- Pinned adjustment seams (Orange chalk line) -->
    <path d="M160 110 Q175 180 155 250" fill="none" stroke="#F5A400" stroke-width="4" stroke-dasharray="8,6" />
    <path d="M240 110 Q225 180 245 250" fill="none" stroke="#F5A400" stroke-width="4" stroke-dasharray="8,6" />
    <!-- Measuring Tape draped around waist -->
    <ellipse cx="200" cy="210" rx="72" ry="18" fill="none" stroke="#FBBF24" stroke-width="12" />
    <ellipse cx="200" cy="210" rx="72" ry="18" fill="none" stroke="#08284A" stroke-width="2" stroke-dasharray="3,5" />
    <!-- Tailoring Pins -->
    <circle cx="155" cy="180" r="5" fill="#EF4444" />
    <line x1="155" y1="180" x2="165" y2="195" stroke="#E2E8F0" stroke-width="2.5" />
    <circle cx="245" cy="180" r="5" fill="#EF4444" />
    <line x1="245" y1="180" x2="235" y2="195" stroke="#E2E8F0" stroke-width="2.5" />
  `,
  repair: `
    <!-- Mending needle, thread spool & zipper repair -->
    <!-- Wooden Spool with Vibrant Orange Thread -->
    <g transform="translate(130, 160)">
      <rect x="0" y="20" width="60" height="70" rx="10" fill="#F5A400" />
      <rect x="-8" y="10" width="76" height="15" rx="6" fill="#78350F" />
      <rect x="-8" y="85" width="76" height="15" rx="6" fill="#78350F" />
      <line x1="10" y1="30" x2="50" y2="30" stroke="#FDE68A" stroke-width="3" />
      <line x1="10" y1="55" x2="50" y2="55" stroke="#FDE68A" stroke-width="3" />
      <line x1="10" y1="75" x2="50" y2="75" stroke="#FDE68A" stroke-width="3" />
    </g>
    <!-- Thread curving to Needle -->
    <path d="M190 200 C240 180, 230 110, 270 90" fill="none" stroke="#F5A400" stroke-width="4" stroke-linecap="round" />
    <!-- Silver Hand Sewing Needle -->
    <g transform="translate(265, 75) rotate(40)">
      <path d="M0 0 L6 100 L3 115 L0 100 Z" fill="#E2E8F0" />
      <ellipse cx="3" cy="15" rx="1.5" ry="6" fill="#08284A" />
    </g>
    <!-- Polished Mother of Pearl Buttons -->
    <circle cx="150" cy="290" r="22" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="3" />
    <circle cx="143" cy="285" r="2.5" fill="#08284A" />
    <circle cx="157" cy="285" r="2.5" fill="#08284A" />
    <circle cx="143" cy="295" r="2.5" fill="#08284A" />
    <circle cx="157" cy="295" r="2.5" fill="#08284A" />
    <circle cx="230" cy="275" r="16" fill="#08284A" />
    <circle cx="225" cy="272" r="2" fill="#F5A400" />
    <circle cx="235" cy="272" r="2" fill="#F5A400" />
    <circle cx="225" cy="278" r="2" fill="#F5A400" />
    <circle cx="235" cy="278" r="2" fill="#F5A400" />
  `,
  embroidery: `
    <!-- Embroidery Hoop with ornate gold & floral thread work -->
    <circle cx="200" cy="200" r="110" fill="#FFFBEB" stroke="#B45309" stroke-width="14" />
    <circle cx="200" cy="200" r="98" fill="#FDF8F0" />
    <!-- Metal Clamp on Top -->
    <rect x="188" y="72" width="24" height="20" rx="3" fill="#94A3B8" />
    <line x1="184" y1="82" x2="216" y2="82" stroke="#64748B" stroke-width="4" />
    <!-- Intricate Floral & Paisley Motif -->
    <path d="M200 140 C170 170, 160 210, 200 240 C240 210, 230 170, 200 140 Z" fill="url(#fabricMaroon)" />
    <path d="M200 155 C180 180, 175 205, 200 225 C225 205, 220 180, 200 155 Z" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
    <!-- Thread Petals -->
    <circle cx="160" cy="180" r="14" fill="url(#accentGrad)" />
    <circle cx="240" cy="180" r="14" fill="url(#accentGrad)" />
    <circle cx="165" cy="230" r="14" fill="url(#fabricTeal)" />
    <circle cx="235" cy="230" r="14" fill="url(#fabricTeal)" />
    <circle cx="200" cy="200" r="8" fill="#FBBF24" stroke="#78350F" stroke-width="2" />
  `,
  finishing: `
    <!-- Crisp Fabric Edge with Hemming / Pico stitch detail and Ironing -->
    <path d="M100 120 L300 120 L300 280 L100 280 Z" fill="#08284A" rx="12" />
    <!-- Folded Hem Edge with Gold Pico Zigzag Stitch -->
    <rect x="100" y="240" width="200" height="40" fill="#0E3C6E" rx="8" />
    <path d="M100 240 L110 250 L120 240 L130 250 L140 240 L150 250 L160 240 L170 250 L180 240 L190 250 L200 240 L210 250 L220 240 L230 250 L240 240 L250 250 L260 240 L270 250 L280 240 L290 250 L300 240" fill="none" stroke="#F5A400" stroke-width="4" stroke-linejoin="round" />
    <!-- Seam Line with neat stitches -->
    <line x1="110" y1="265" x2="290" y2="265" stroke="#FDE68A" stroke-width="2.5" stroke-dasharray="6,4" />
    <!-- Tailor Precision Ribbon / Seal -->
    <circle cx="260" cy="150" r="28" fill="url(#accentGrad)" />
    <path d="M260 170 L250 200 L260 190 L270 200 Z" fill="#D97706" />
    <path d="M250 150 L258 158 L272 142" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  `,
  other: `
    <!-- Designer Sketchpad, measuring tools & tailor pencil -->
    <rect x="110" y="100" width="180" height="210" rx="16" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" />
    <line x1="135" y1="140" x2="265" y2="140" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round" />
    <line x1="135" y1="165" x2="240" y2="165" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round" />
    <!-- Garment Silhouette Sketch -->
    <path d="M170 190 L200 180 L230 190 L240 260 L160 260 Z" fill="none" stroke="#08284A" stroke-width="3" stroke-linejoin="round" />
    <!-- Tailor Ruler / Protractor -->
    <path d="M90 270 L230 310 L230 290 Z" fill="#F5A400" fill-opacity="0.9" />
    <!-- Graphite Pencil -->
    <g transform="translate(250, 80) rotate(35)">
      <polygon points="10,0 20,0 15,-20" fill="#FBBF24" />
      <polygon points="12,-15 18,-15 15,-20" fill="#1E293B" />
      <rect x="10" y="0" width="10" height="110" fill="#E11D48" />
      <rect x="10" y="100" width="10" height="15" fill="#94A3B8" />
    </g>
  `
};

// Complete Garment SVGs
const garmentSvgs = {
  kurta: `
    <!-- Traditional Men's Kurta on Mannequin -->
    <path d="M192 65 L208 65 L208 85 L192 85 Z" fill="#E2E8F0" />
    <!-- Mandarin Collar -->
    <path d="M175 85 Q200 95 225 85 L225 96 Q200 106 175 96 Z" fill="#0A325E" />
    <!-- Body -->
    <path d="M150 96 L200 96 L250 96 L265 285 Q200 290 135 285 Z" fill="url(#navyGrad)" />
    <!-- Sleeves -->
    <path d="M150 96 L115 185 L135 190 L160 140 Z" fill="#0A325E" />
    <path d="M250 96 L285 185 L265 190 L240 140 Z" fill="#0A325E" />
    <!-- Center Placket & Gold Buttons -->
    <rect x="196" y="96" width="8" height="85" fill="#0E3C6E" />
    <circle cx="200" cy="115" r="3" fill="#F5A400" />
    <circle cx="200" cy="135" r="3" fill="#F5A400" />
    <circle cx="200" cy="155" r="3" fill="#F5A400" />
    <circle cx="200" cy="175" r="3" fill="#F5A400" />
    <!-- Side Slits -->
    <line x1="140" y1="230" x2="140" y2="285" stroke="#F5A400" stroke-width="2" />
    <line x1="260" y1="230" x2="260" y2="285" stroke="#F5A400" stroke-width="2" />
    <!-- Stand -->
    <rect x="197" y="285" width="6" height="60" fill="#94A3B8" />
  `,
  kurta_pajama: `
    <!-- Kurta + Matching Pajama Set -->
    <!-- Kurta Top -->
    <path d="M160 85 L240 85 L255 220 L145 220 Z" fill="url(#navyGrad)" />
    <path d="M197 85 width 6 height 60" />
    <rect x="197" y="85" width="6" height="55" fill="#0E3C6E" />
    <circle cx="200" cy="100" r="2.5" fill="#F5A400" />
    <circle cx="200" cy="115" r="2.5" fill="#F5A400" />
    <circle cx="200" cy="130" r="2.5" fill="#F5A400" />
    <!-- Sleeves -->
    <path d="M160 85 L130 160 L145 165 L165 125 Z" fill="#0A325E" />
    <path d="M240 85 L270 160 L255 165 L235 125 Z" fill="#0A325E" />
    <!-- White Churidar / Pajama Trousers -->
    <path d="M155 220 L180 320 L195 320 L198 245 L202 245 L205 320 L220 320 L245 220 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" />
    <!-- Stand -->
    <ellipse cx="200" cy="340" rx="40" ry="8" fill="#CBD5E1" />
  `,
  shirt: `
    <!-- Crisp Formal / Casual Shirt -->
    <path d="M192 65 L208 65 L208 80 L192 80 Z" fill="#E2E8F0" />
    <!-- Collar -->
    <path d="M170 80 L200 105 L230 80 L215 76 L200 90 L185 76 Z" fill="#FFFFFF" />
    <!-- Shirt Torso -->
    <path d="M150 85 L250 85 L260 260 Q200 270 140 260 Z" fill="#0284C7" />
    <!-- Sleeves with Cuffs -->
    <path d="M150 85 L115 170 L135 175 L158 125 Z" fill="#0369A1" />
    <path d="M250 85 L285 170 L265 175 L242 125 Z" fill="#0369A1" />
    <!-- Front Placket & Buttons -->
    <rect x="196" y="85" width="8" height="175" fill="#0369A1" />
    <circle cx="200" cy="115" r="3" fill="#FFFFFF" />
    <circle cx="200" cy="145" r="3" fill="#FFFFFF" />
    <circle cx="200" cy="175" r="3" fill="#FFFFFF" />
    <circle cx="200" cy="205" r="3" fill="#FFFFFF" />
    <circle cx="200" cy="235" r="3" fill="#FFFFFF" />
    <!-- Chest Pocket -->
    <rect x="160" y="130" width="26" height="28" rx="3" fill="#0369A1" stroke="#38BDF8" stroke-width="1.5" />
  `,
  trousers: `
    <!-- Tailored Slim Fit Formal Trousers -->
    <path d="M145 100 L255 100 L260 310 L220 310 L200 170 L180 310 L140 310 Z" fill="url(#navyGrad)" />
    <!-- Waistband & Belt Loops -->
    <rect x="145" y="100" width="110" height="16" fill="#0A325E" rx="2" />
    <rect x="165" y="100" width="4" height="16" fill="#1E4D8A" />
    <rect x="198" y="100" width="4" height="16" fill="#1E4D8A" />
    <rect x="231" y="100" width="4" height="16" fill="#1E4D8A" />
    <!-- Crisp Center Ironing Crease -->
    <line x1="168" y1="120" x2="160" y2="310" stroke="#38BDF8" stroke-width="1.5" stroke-opacity="0.6" />
    <line x1="232" y1="120" x2="240" y2="310" stroke="#38BDF8" stroke-width="1.5" stroke-opacity="0.6" />
    <!-- Side Slanted Pockets -->
    <line x1="148" y1="116" x2="165" y2="150" stroke="#0E3C6E" stroke-width="3" stroke-linecap="round" />
    <line x1="252" y1="116" x2="235" y2="150" stroke="#0E3C6E" stroke-width="3" stroke-linecap="round" />
  `,
  suit: `
    <!-- 2-Piece Classic Tailored Suit -->
    <!-- Inner White Shirt & Gold Silk Tie -->
    <polygon points="180,85 200,120 220,85" fill="#FFFFFF" />
    <polygon points="196,105 204,105 200,180" fill="#F5A400" />
    <!-- Suit Jacket -->
    <path d="M145 90 L255 90 L265 260 Q200 270 135 260 Z" fill="url(#navyGrad)" />
    <!-- Peak Lapels -->
    <polygon points="160,90 190,175 155,140 145,100" fill="#0A325E" />
    <polygon points="240,90 210,175 245,140 255,100" fill="#0A325E" />
    <!-- Pocket Square -->
    <rect x="155" y="145" width="24" height="3" fill="#FFFFFF" />
    <!-- Matching Suit Trousers Peak -->
    <path d="M160 260 L175 320 L195 320 L200 275 L205 320 L225 320 L240 260 Z" fill="#08284A" />
  `,
  blazer: `
    <!-- Modern Fitted Blazer / Sport Coat -->
    <polygon points="175,85 200,125 225,85" fill="#F8FAFC" />
    <path d="M140 92 L260 92 L270 270 Q200 280 130 270 Z" fill="url(#fabricTeal)" />
    <!-- Notch Lapels -->
    <polygon points="165,92 188,175 160,145 145,105" fill="#0F766E" />
    <polygon points="235,92 212,175 240,145 255,105" fill="#0F766E" />
    <!-- Contrast Horn Buttons -->
    <circle cx="200" cy="195" r="4.5" fill="#F5A400" />
    <circle cx="200" cy="225" r="4.5" fill="#F5A400" />
    <!-- Flap Pockets -->
    <rect x="145" y="215" width="38" height="6" rx="2" fill="#134E4A" />
    <rect x="217" y="215" width="38" height="6" rx="2" fill="#134E4A" />
  `,
  waistcoat: `
    <!-- Classic Tailored Nehru / Suit Waistcoat (Vest) -->
    <path d="M192 65 L208 65 L208 85 L192 85 Z" fill="#E2E8F0" />
    <!-- Mandarin Neck Collar -->
    <path d="M178 85 Q200 95 222 85 L222 95 Q200 105 178 95 Z" fill="#78350F" />
    <!-- Waistcoat Silhouette -->
    <path d="M160 92 L240 92 L250 250 L200 275 L150 250 Z" fill="url(#fabricMaroon)" />
    <!-- Center Button Line -->
    <rect x="198" y="95" width="4" height="155" fill="#450A0A" />
    <circle cx="200" cy="115" r="3.5" fill="#F5A400" />
    <circle cx="200" cy="140" r="3.5" fill="#F5A400" />
    <circle cx="200" cy="165" r="3.5" fill="#F5A400" />
    <circle cx="200" cy="190" r="3.5" fill="#F5A400" />
    <circle cx="200" cy="215" r="3.5" fill="#F5A400" />
    <!-- Welt Pockets -->
    <rect x="165" y="180" width="24" height="4" rx="1" fill="#FBBF24" />
    <rect x="211" y="180" width="24" height="4" rx="1" fill="#FBBF24" />
  `,
  sherwani: `
    <!-- Royal Bespoke Wedding Sherwani -->
    <path d="M192 65 L208 65 L208 85 L192 85 Z" fill="#E2E8F0" />
    <!-- Rich Gold Embellished Collar -->
    <path d="M175 85 Q200 96 225 85 L225 98 Q200 108 175 98 Z" fill="#D97706" />
    <!-- Long Royal Sherwani Coat -->
    <path d="M150 95 L250 95 L265 315 Q200 325 135 315 Z" fill="#FFFBEB" stroke="#D97706" stroke-width="2.5" />
    <!-- Front Gold Zari Embroidery Panel -->
    <rect x="192" y="95" width="16" height="215" fill="url(#goldGrad)" />
    <circle cx="200" cy="120" r="3.5" fill="#78350F" />
    <circle cx="200" cy="150" r="3.5" fill="#78350F" />
    <circle cx="200" cy="180" r="3.5" fill="#78350F" />
    <circle cx="200" cy="210" r="3.5" fill="#78350F" />
    <!-- Royal Pocket Square & Brooch -->
    <circle cx="168" cy="140" r="6" fill="#D97706" />
    <circle cx="168" cy="140" r="3" fill="#EF4444" />
  `,
  pathani_suit: `
    <!-- Pathani Suit with Shoulder Epaulettes & Flap Pockets -->
    <path d="M175 85 L200 100 L225 85 L200 75 Z" fill="#1E293B" />
    <path d="M150 90 L250 90 L260 280 Q200 290 140 280 Z" fill="#334155" />
    <!-- Shoulder Straps (Epaulettes) -->
    <rect x="145" y="90" width="22" height="6" rx="2" fill="#F5A400" />
    <rect x="233" y="90" width="22" height="6" rx="2" fill="#F5A400" />
    <!-- Front Flap Pockets with buttons -->
    <rect x="155" y="130" width="30" height="26" rx="3" fill="#1E293B" />
    <polygon points="155,130 170,140 185,130" fill="#0F172A" />
    <circle cx="170" cy="136" r="2" fill="#F5A400" />
    <rect x="215" y="130" width="30" height="26" rx="3" fill="#1E293B" />
    <polygon points="215,130 230,140 245,130" fill="#0F172A" />
    <circle cx="230" cy="136" r="2" fill="#F5A400" />
  `,
  blouse: `
    <!-- Designer Saree Blouse / Choli -->
    <path d="M192 65 L208 65 L208 85 L192 85 Z" fill="#E2E8F0" />
    <!-- Deep Sweetheart Neckline -->
    <path d="M165 90 C180 125, 220 125, 235 90 L255 125 L245 190 L155 190 L145 125 Z" fill="url(#fabricMaroon)" />
    <!-- Gold Zari Embroidery along Neck & Hem -->
    <path d="M165 90 C180 125, 220 125, 235 90" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
    <line x1="155" y1="190" x2="245" y2="190" stroke="url(#goldGrad)" stroke-width="5" />
    <!-- Elbow Length Sleeves with Borders -->
    <path d="M150 100 L125 155 L145 160 L160 125 Z" fill="#7F1D1D" />
    <line x1="125" y1="155" x2="145" y2="160" stroke="#F5A400" stroke-width="3" />
    <path d="M250 100 L275 155 L255 160 L240 125 Z" fill="#7F1D1D" />
    <line x1="275" y1="155" x2="255" y2="160" stroke="#F5A400" stroke-width="3" />
    <!-- Stand -->
    <rect x="197" y="190" width="6" height="150" fill="#94A3B8" />
  `,
  kurti: `
    <!-- Women's Elegant Designer Kurti -->
    <path d="M192 65 L208 65 L208 85 L192 85 Z" fill="#E2E8F0" />
    <!-- V-Neck Neckline -->
    <polygon points="180,85 200,115 220,85" fill="#FEF3C7" />
    <!-- Flowing Kurti Body -->
    <path d="M155 90 L245 90 L265 290 Q200 295 135 290 Z" fill="url(#fabricEmerald)" />
    <!-- Gold Yoke Embroidery Pattern -->
    <path d="M180 90 L200 120 L220 90 L225 150 L175 150 Z" fill="none" stroke="url(#goldGrad)" stroke-width="3" />
    <!-- Side Slits & Hem Trim -->
    <line x1="135" y1="288" x2="265" y2="288" stroke="#FBBF24" stroke-width="4" />
    <!-- Sleeves -->
    <path d="M155 90 L125 175 L142 180 L162 135 Z" fill="#064E3B" />
    <path d="M245 90 L275 175 L258 180 L238 135 Z" fill="#064E3B" />
  `,
  salwar_suit: `
    <!-- Salwar Kameez Suit Set with Dupatta -->
    <!-- Kameez Top -->
    <path d="M160 85 L240 85 L255 225 L145 225 Z" fill="url(#fabricMaroon)" />
    <!-- Salwar (Pleated Pants) -->
    <path d="M148 225 L165 315 L185 315 L198 250 L202 250 L215 315 L235 315 L252 225 Z" fill="#FEF08A" />
    <!-- Flowing Dupatta Draped Across -->
    <path d="M130 95 Q170 170 270 210 Q260 230 125 120 Z" fill="#F5A400" fill-opacity="0.85" />
  `,
  dress: `
    <!-- Western / Indo-Western Elegant Dress -->
    <path d="M192 65 L208 65 L208 85 L192 85 Z" fill="#E2E8F0" />
    <path d="M165 88 L235 88 L230 160 L170 160 Z" fill="url(#navyGrad)" />
    <!-- Cinched Waist Ribbon -->
    <rect x="168" y="158" width="64" height="8" fill="#F5A400" rx="3" />
    <!-- Flared A-Line Skirt -->
    <path d="M168 166 L115 310 Q200 325 285 310 L232 166 Z" fill="url(#fabricIndigo)" />
  `,
  top: `
    <!-- Stylish Women's Top / Blouse -->
    <path d="M192 65 L208 65 L208 85 L192 85 Z" fill="#E2E8F0" />
    <path d="M160 90 L240 90 L250 215 Q200 225 150 215 Z" fill="#EC4899" />
    <!-- Ruffle Details / Boat Neck -->
    <path d="M170 90 Q200 105 230 90" fill="none" stroke="#FDF2F8" stroke-width="4" />
    <!-- Puffed Sleeves -->
    <ellipse cx="145" cy="115" rx="16" ry="22" fill="#DB2777" />
    <ellipse cx="255" cy="115" rx="16" ry="22" fill="#DB2777" />
  `,
  skirt: `
    <!-- Flared Pleated Maxi / Midi Skirt -->
    <rect x="160" y="110" width="80" height="12" fill="#78350F" rx="2" />
    <!-- Flowing Flared Skirt -->
    <path d="M160 122 L110 310 Q200 325 290 310 L240 122 Z" fill="url(#fabricMaroon)" />
    <!-- Pleat Lines -->
    <line x1="170" y1="122" x2="140" y2="310" stroke="#B91C1C" stroke-width="2.5" />
    <line x1="185" y1="122" x2="175" y2="315" stroke="#B91C1C" stroke-width="2.5" />
    <line x1="200" y1="122" x2="200" y2="318" stroke="#B91C1C" stroke-width="2.5" />
    <line x1="215" y1="122" x2="225" y2="315" stroke="#B91C1C" stroke-width="2.5" />
    <line x1="230" y1="122" x2="260" y2="310" stroke="#B91C1C" stroke-width="2.5" />
    <!-- Gold Border Hem -->
    <path d="M110 310 Q200 325 290 310" fill="none" stroke="url(#goldGrad)" stroke-width="8" />
  `,
  palazzo: `
    <!-- Wide Leg Flowing Palazzo Pants -->
    <rect x="150" y="100" width="100" height="14" fill="#0A325E" rx="3" />
    <path d="M150 114 L110 310 L185 310 L198 180 L202 180 L215 310 L290 310 L250 114 Z" fill="url(#fabricTeal)" />
    <!-- Flow lines -->
    <line x1="140" y1="140" x2="135" y2="310" stroke="#14B8A6" stroke-width="2" stroke-opacity="0.6" />
    <line x1="260" y1="140" x2="265" y2="310" stroke="#14B8A6" stroke-width="2" stroke-opacity="0.6" />
  `,
  lehenga: `
    <!-- Royal Bridal Lehenga & Choli Set -->
    <!-- Choli -->
    <path d="M170 85 L230 85 L225 145 L175 145 Z" fill="url(#fabricMaroon)" stroke="url(#goldGrad)" stroke-width="2" />
    <!-- Flared Grand Lehenga Skirt -->
    <path d="M165 155 L90 320 Q200 340 310 320 L235 155 Z" fill="url(#fabricMaroon)" />
    <!-- Heavy Zari Border & Kalis -->
    <path d="M90 320 Q200 340 310 320" fill="none" stroke="url(#goldGrad)" stroke-width="16" />
    <line x1="180" y1="155" x2="145" y2="320" stroke="#FBBF24" stroke-width="2.5" />
    <line x1="200" y1="155" x2="200" y2="330" stroke="#FBBF24" stroke-width="3" />
    <line x1="220" y1="155" x2="255" y2="320" stroke="#FBBF24" stroke-width="2.5" />
    <!-- Latkan Tassels -->
    <circle cx="160" cy="170" r="4" fill="#F5A400" />
    <circle cx="158" cy="182" r="3" fill="#EF4444" />
  `,
  anarkali: `
    <!-- Grand Floor-Length Anarkali Gown -->
    <path d="M192 65 L208 65 L208 85 L192 85 Z" fill="#E2E8F0" />
    <!-- Fitted Yoke -->
    <path d="M165 88 L235 88 L230 150 L170 150 Z" fill="url(#navyGrad)" />
    <!-- Multitier Flared Anarkali Umbrella Flare -->
    <path d="M170 150 L100 325 Q200 345 300 325 L230 150 Z" fill="url(#navyGrad)" />
    <!-- Gold Border Tiers -->
    <path d="M125 260 Q200 275 275 260" fill="none" stroke="url(#goldGrad)" stroke-width="4" />
    <path d="M100 325 Q200 345 300 325" fill="none" stroke="url(#goldGrad)" stroke-width="10" />
    <!-- Sleeves -->
    <path d="M165 88 L130 170 L145 175 L165 130 Z" fill="#0A325E" />
    <path d="M235 88 L270 170 L255 175 L235 130 Z" fill="#0A325E" />
  `,
  frock: `
    <!-- Cute Kids Party Frock -->
    <path d="M194 75 L206 75 L206 90 L194 90 Z" fill="#E2E8F0" />
    <path d="M170 95 L230 95 L225 155 L175 155 Z" fill="#F43F5E" />
    <!-- Ribbon Bow at Waist -->
    <rect x="172" y="152" width="56" height="8" fill="#FDE047" rx="3" />
    <circle cx="200" cy="156" r="6" fill="#EAB308" />
    <!-- Fluffy Ruffled Tulle Skirt -->
    <path d="M175 160 L120 290 Q200 305 280 290 L225 160 Z" fill="#FB7185" />
    <circle cx="160" cy="220" r="4" fill="#FFFFFF" />
    <circle cx="200" cy="210" r="4" fill="#FFFFFF" />
    <circle cx="240" cy="225" r="4" fill="#FFFFFF" />
    <circle cx="180" cy="255" r="4" fill="#FFFFFF" />
    <circle cx="220" cy="260" r="4" fill="#FFFFFF" />
  `,
  shorts: `
    <!-- Kids / Casual Tailored Shorts -->
    <rect x="145" y="120" width="110" height="16" fill="#0A325E" rx="3" />
    <path d="M145 136 L135 250 L185 250 L198 175 L202 175 L215 250 L265 250 L255 136 Z" fill="#0284C7" />
    <line x1="135" y1="240" x2="185" y2="240" stroke="#38BDF8" stroke-width="2" />
    <line x1="215" y1="240" x2="265" y2="240" stroke="#38BDF8" stroke-width="2" />
  `,
  pants: `
    <!-- Kids / Daily Pants -->
    <rect x="150" y="110" width="100" height="14" fill="#1E293B" rx="3" />
    <path d="M150 124 L140 310 L180 310 L198 175 L202 175 L220 310 L260 310 L250 124 Z" fill="#475569" />
  `,
  school_uniform: `
    <!-- Classic School Uniform with Shirt, Tie & Pleated Skirt/Trousers -->
    <polygon points="175,85 200,110 225,85" fill="#FFFFFF" />
    <polygon points="196,95 204,95 200,165" fill="#DC2626" />
    <!-- White School Shirt -->
    <path d="M150 90 L250 90 L255 185 L145 185 Z" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="2" />
    <!-- School Blazer or Pinafore -->
    <path d="M145 185 L125 300 L275 300 L255 185 Z" fill="url(#navyGrad)" />
    <!-- School Badge -->
    <rect x="160" y="125" width="18" height="20" rx="3" fill="#F5A400" />
  `,
  office_uniform: `
    <!-- Corporate / Hospitality Professional Uniform -->
    <polygon points="175,85 200,115 225,85" fill="#FFFFFF" />
    <path d="M145 90 L255 90 L265 260 Q200 270 135 260 Z" fill="url(#navyGrad)" />
    <rect x="155" y="140" width="30" height="10" rx="2" fill="#F5A400" />
    <circle cx="200" cy="180" r="4" fill="#CBD5E1" />
    <circle cx="200" cy="210" r="4" fill="#CBD5E1" />
  `,
  chef_uniform: `
    <!-- Professional Chef Coat with Double Breasted Buttons & Toque Hat -->
    <!-- Chef Hat -->
    <path d="M175 75 Q200 50 225 75 L220 90 L180 90 Z" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" />
    <!-- White Double Breasted Jacket -->
    <path d="M150 92 L250 92 L260 270 Q200 275 140 270 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="2" />
    <!-- Double Row Buttons -->
    <circle cx="185" cy="130" r="3.5" fill="#08284A" />
    <circle cx="215" cy="130" r="3.5" fill="#08284A" />
    <circle cx="185" cy="160" r="3.5" fill="#08284A" />
    <circle cx="215" cy="160" r="3.5" fill="#08284A" />
    <circle cx="185" cy="190" r="3.5" fill="#08284A" />
    <circle cx="215" cy="190" r="3.5" fill="#08284A" />
    <circle cx="185" cy="220" r="3.5" fill="#08284A" />
    <circle cx="215" cy="220" r="3.5" fill="#08284A" />
    <!-- Red Scarf Accent -->
    <polygon points="190,92 210,92 200,115" fill="#DC2626" />
  `,
  medical_uniform: `
    <!-- Healthcare Scrubs / Doctor Coat with Stethoscope -->
    <path d="M150 95 L250 95 L260 275 Q200 280 140 275 Z" fill="#0D9488" />
    <polygon points="180,95 200,125 220,95" fill="#0F766E" />
    <!-- Silver Stethoscope -->
    <path d="M165 95 C160 160, 200 200, 200 230" fill="none" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round" />
    <path d="M235 95 C240 160, 200 200, 200 230" fill="none" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round" />
    <circle cx="200" cy="235" r="9" fill="#08284A" stroke="#F5A400" stroke-width="3" />
    <!-- Pocket -->
    <rect x="155" y="145" width="28" height="28" rx="3" fill="#0F766E" />
  `,
  college_uniform: `
    <!-- College Blazer / Uniform with Striped Tie -->
    <polygon points="175,85 200,110 225,85" fill="#FFFFFF" />
    <polygon points="196,95 204,95 200,165" fill="#1D4ED8" />
    <path d="M145 90 L255 90 L265 260 Q200 270 135 260 Z" fill="#312E81" />
    <rect x="155" y="135" width="24" height="26" rx="3" fill="#1E1B4B" stroke="#F5A400" stroke-width="1.5" />
  `,
  custom_garment: `
    <!-- Custom Tailored Craftsmanship Visual with Sewing & Shears -->
    <path d="M140 110 L260 110 L270 280 Q200 295 130 280 Z" fill="url(#navyGrad)" />
    <!-- Tailor Measuring Tape wrapped -->
    <path d="M110 220 Q200 270 290 220" fill="none" stroke="#F5A400" stroke-width="10" stroke-linecap="round" />
    <!-- Gold Tailor Scissors -->
    <g transform="translate(180, 80) rotate(15) scale(0.8)">
      <circle cx="30" cy="20" r="16" fill="none" stroke="url(#goldGrad)" stroke-width="5" />
      <circle cx="30" cy="70" r="16" fill="none" stroke="url(#goldGrad)" stroke-width="5" />
      <path d="M40 45 L120 35" fill="none" stroke="url(#goldGrad)" stroke-width="5" stroke-linecap="round" />
      <path d="M40 55 L120 65" fill="none" stroke="url(#goldGrad)" stroke-width="5" stroke-linecap="round" />
    </g>
  `,
  other_garment: `
    <!-- Bespoke Custom Cloth Creation -->
    <rect x="120" y="110" width="160" height="190" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" />
    <!-- Fabric Grid Swatches -->
    <rect x="140" y="135" width="55" height="55" rx="6" fill="#08284A" />
    <rect x="205" y="135" width="55" height="55" rx="6" fill="#F5A400" />
    <rect x="140" y="200" width="55" height="55" rx="6" fill="#0D9488" />
    <rect x="205" y="200" width="55" height="55" rx="6" fill="#991B1B" />
  `
};

// Work Service SVGs
const serviceSvgs = {
  stitch_from_fabric: `
    <!-- Raw Unstitched Fabric roll + tailor tape -->
    <path d="M100 160 C100 130, 160 130, 200 130 C240 130, 300 130, 300 160 L280 280 C280 300, 220 300, 180 300 C140 300, 80 300, 80 280 Z" fill="url(#fabricTeal)" />
    <!-- Roll Core -->
    <ellipse cx="200" cy="145" rx="90" ry="18" fill="#115E59" />
    <!-- Measuring Tape across roll -->
    <path d="M90 220 Q200 270 310 210" fill="none" stroke="#F5A400" stroke-width="12" stroke-linecap="round" />
    <path d="M90 220 Q200 270 310 210" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="4,6" />
  `,
  copy_garment: `
    <!-- Two identical garments side-by-side (Original & Replica) -->
    <path d="M105 130 L175 130 L185 270 L95 270 Z" fill="url(#navyGrad)" />
    <path d="M225 130 L295 130 L305 270 L215 270 Z" fill="url(#accentGrad)" />
    <!-- Link / Clone Arrow -->
    <circle cx="200" cy="200" r="18" fill="#FFFFFF" stroke="#08284A" stroke-width="3" />
    <path d="M192 200 L208 200 M202 194 L208 200 L202 206" fill="none" stroke="#08284A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  `,
  stitch_from_reference: `
    <!-- Photo / Sketch inspiration next to tailored cloth -->
    <rect x="90" y="120" width="100" height="130" rx="8" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="3" />
    <rect x="100" y="130" width="80" height="80" rx="4" fill="#F1F5F9" />
    <path d="M125 180 L140 150 L155 180 Z" fill="#94A3B8" />
    <!-- Tailored Output -->
    <path d="M210 120 L290 120 L300 260 L200 260 Z" fill="url(#navyGrad)" />
    <!-- Magic Sparkle -->
    <path d="M200 110 L205 125 L220 130 L205 135 L200 150 L195 135 L180 130 L195 125 Z" fill="#F5A400" />
  `,
  tighten: `
    <!-- Pinned Side Seams Showing Inward Tightening Arrows -->
    <path d="M130 100 Q165 85 200 85 Q235 85 270 100 L280 270 Q200 285 120 270 Z" fill="url(#navyGrad)" />
    <!-- Inward Arrows -->
    <g transform="translate(80, 180)">
      <path d="M0 0 L40 0 M30 -8 L40 0 L30 8" fill="none" stroke="#F5A400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <g transform="translate(320, 180)">
      <path d="M0 0 L-40 0 M-30 -8 L-40 0 L-30 8" fill="none" stroke="#F5A400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  `,
  loosen: `
    <!-- Side Seams Showing Outward Letting Out Arrows -->
    <path d="M145 100 Q170 85 200 85 Q230 85 255 100 L265 270 Q200 285 135 270 Z" fill="url(#navyGrad)" />
    <!-- Outward Arrows -->
    <g transform="translate(130, 180)">
      <path d="M0 0 L-45 0 M-35 -8 L-45 0 L-35 8" fill="none" stroke="#F5A400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
    <g transform="translate(270, 180)">
      <path d="M0 0 L45 0 M35 -8 L45 0 L35 8" fill="none" stroke="#F5A400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  `,
  waist_adjustment: `
    <!-- Trouser / Skirt Waistband with measuring tape around it -->
    <path d="M140 130 L260 130 L270 280 L130 280 Z" fill="url(#navyGrad)" />
    <!-- Highlighted Waistband -->
    <rect x="135" y="125" width="130" height="25" rx="4" fill="#0A325E" stroke="#F5A400" stroke-width="3" />
    <ellipse cx="200" cy="137" rx="75" ry="12" fill="none" stroke="#FBBF24" stroke-width="6" stroke-dasharray="6,4" />
  `,
  sleeve_adjustment: `
    <!-- Shirt / Jacket Arm Sleeve with cuff measurement -->
    <path d="M120 90 L200 130 L160 280 L90 240 Z" fill="url(#navyGrad)" />
    <!-- Cuff Adjustment Line -->
    <rect x="80" y="235" width="90" height="15" rx="3" fill="#F5A400" />
    <!-- Scissors shortening mark -->
    <line x1="75" y1="215" x2="175" y2="255" stroke="#EF4444" stroke-width="3" stroke-dasharray="5,4" />
  `,
  shoulder_adjustment: `
    <!-- Shoulder Seam adjustment with tailor chalk line -->
    <path d="M130 110 L270 110 L280 270 L120 270 Z" fill="url(#navyGrad)" />
    <!-- Shoulder Pad / Width Chalk Line -->
    <line x1="130" y1="110" x2="165" y2="100" stroke="#F5A400" stroke-width="6" stroke-linecap="round" />
    <line x1="270" y1="110" x2="235" y2="100" stroke="#F5A400" stroke-width="6" stroke-linecap="round" />
    <circle cx="145" cy="105" r="4" fill="#EF4444" />
    <circle cx="255" cy="105" r="4" fill="#EF4444" />
  `,
  neck_adjustment: `
    <!-- Collar & Neckline reshaping -->
    <path d="M140 100 L260 100 L270 270 L130 270 Z" fill="url(#navyGrad)" />
    <!-- Reshaped Neckline Curve in Bright Orange -->
    <path d="M165 100 Q200 160 235 100" fill="none" stroke="#F5A400" stroke-width="6" stroke-linecap="round" />
    <path d="M175 100 Q200 135 225 100" fill="none" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="4,4" />
  `,
  shorten: `
    <!-- Hem Folded Up with Upward Arrow -->
    <path d="M130 100 L270 100 L280 280 L120 280 Z" fill="url(#navyGrad)" />
    <!-- Shorten Fold Line -->
    <rect x="120" y="235" width="160" height="45" fill="#0A325E" stroke="#F5A400" stroke-width="3" />
    <!-- Upward Arrow -->
    <g transform="translate(200, 260)">
      <path d="M0 10 L0 -25 M-8 -15 L0 -25 L8 -15" fill="none" stroke="#F5A400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  `,
  lengthen: `
    <!-- Hem Dropped Down with Downward Arrow -->
    <path d="M130 100 L270 100 L280 240 L120 240 Z" fill="url(#navyGrad)" />
    <!-- Extended Hem Allowance -->
    <rect x="120" y="240" width="160" height="45" fill="#0E3C6E" stroke="#F5A400" stroke-width="3" stroke-dasharray="6,4" />
    <!-- Downward Arrow -->
    <g transform="translate(200, 250)">
      <path d="M0 -10 L0 25 M-8 15 L0 25 L8 15" fill="none" stroke="#F5A400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  `,
  general_fitting: `
    <!-- Complete 360 tailor fit assessment on mannequin -->
    <path d="M140 90 L260 90 L270 270 Q200 285 130 270 Z" fill="url(#navyGrad)" />
    <!-- Full Body Measuring Tape Loop -->
    <ellipse cx="200" cy="150" rx="65" ry="15" fill="none" stroke="#F5A400" stroke-width="8" />
    <ellipse cx="200" cy="210" rx="72" ry="18" fill="none" stroke="#FBBF24" stroke-width="8" />
  `,
  torn_seam_repair: `
    <!-- Restitching a separated seam securely -->
    <path d="M90 120 L190 120 L190 280 L90 280 Z" fill="#08284A" />
    <path d="M210 120 L310 120 L310 280 L210 280 Z" fill="#08284A" />
    <!-- Cross Stitch Restitching Seam -->
    <path d="M185 140 L215 160 M185 160 L215 140" stroke="#F5A400" stroke-width="4" stroke-linecap="round" />
    <path d="M185 180 L215 200 M185 200 L215 180" stroke="#F5A400" stroke-width="4" stroke-linecap="round" />
    <path d="M185 220 L215 240 M185 240 L215 220" stroke="#F5A400" stroke-width="4" stroke-linecap="round" />
    <path d="M185 260 L215 280 M185 280 L215 260" stroke="#F5A400" stroke-width="4" stroke-linecap="round" />
  `,
  hole_repair: `
    <!-- Invisible Darning / Tear Weave Repair -->
    <rect x="100" y="110" width="200" height="180" rx="12" fill="#08284A" />
    <!-- Darning Grid Mesh across hole -->
    <circle cx="200" cy="200" r="40" fill="#0A325E" />
    <line x1="170" y1="180" x2="230" y2="180" stroke="#F5A400" stroke-width="3" />
    <line x1="165" y1="190" x2="235" y2="190" stroke="#F5A400" stroke-width="3" />
    <line x1="160" y1="200" x2="240" y2="200" stroke="#F5A400" stroke-width="3" />
    <line x1="165" y1="210" x2="235" y2="210" stroke="#F5A400" stroke-width="3" />
    <line x1="170" y1="220" x2="230" y2="220" stroke="#F5A400" stroke-width="3" />
    <!-- Vertical weft -->
    <line x1="180" y1="170" x2="180" y2="230" stroke="#FDE68A" stroke-width="3" />
    <line x1="190" y1="165" x2="190" y2="235" stroke="#FDE68A" stroke-width="3" />
    <line x1="200" y1="160" x2="200" y2="240" stroke="#FDE68A" stroke-width="3" />
    <line x1="210" y1="165" x2="210" y2="235" stroke="#FDE68A" stroke-width="3" />
    <line x1="220" y1="170" x2="220" y2="230" stroke="#FDE68A" stroke-width="3" />
  `,
  zip_repair: `
    <!-- Zipper slider fixing on track -->
    <rect x="175" y="90" width="18" height="220" fill="#1E293B" />
    <rect x="207" y="90" width="18" height="220" fill="#1E293B" />
    <!-- Zipper Teeth -->
    <line x1="193" y1="100" x2="207" y2="100" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round" />
    <line x1="193" y1="115" x2="207" y2="115" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round" />
    <line x1="193" y1="130" x2="207" y2="130" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round" />
    <line x1="193" y1="145" x2="207" y2="145" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round" />
    <!-- Gold Zipper Pull Slider -->
    <rect x="186" y="155" width="28" height="35" rx="4" fill="#F5A400" />
    <path d="M200 190 L200 225 L195 235 L205 235 L200 225 Z" fill="#D97706" />
    <circle cx="200" cy="215" r="3" fill="#FFFFFF" />
  `,
  zip_replacement: `
    <!-- Brand New Zipper Installation with needle & thread -->
    <rect x="180" y="80" width="40" height="240" fill="#0F172A" rx="4" />
    <rect x="194" y="80" width="12" height="240" fill="#F5A400" />
    <!-- Stitching line attaching zip tape to garment fabric -->
    <line x1="172" y1="80" x2="172" y2="320" stroke="#FDE68A" stroke-width="3" stroke-dasharray="6,4" />
    <line x1="228" y1="80" x2="228" y2="320" stroke="#FDE68A" stroke-width="3" stroke-dasharray="6,4" />
  `,
  button_replacement: `
    <!-- Premium Button Hand Sewn with Thread -->
    <circle cx="200" cy="200" r="55" fill="#08284A" stroke="#CBD5E1" stroke-width="6" />
    <circle cx="200" cy="200" r="42" fill="#0F3560" />
    <!-- 4 Button Holes & Orange Thread X -->
    <circle cx="185" cy="185" r="5" fill="#08284A" />
    <circle cx="215" cy="185" r="5" fill="#08284A" />
    <circle cx="185" cy="215" r="5" fill="#08284A" />
    <circle cx="215" cy="215" r="5" fill="#08284A" />
    <!-- Thread Cross -->
    <line x1="185" y1="185" x2="215" y2="215" stroke="#F5A400" stroke-width="5" stroke-linecap="round" />
    <line x1="185" y1="215" x2="215" y2="185" stroke="#F5A400" stroke-width="5" stroke-linecap="round" />
  `,
  hook_replacement: `
    <!-- Metal Hook & Eye Fastener -->
    <path d="M160 170 C140 170, 140 230, 160 230 L190 230 L180 185 L205 185 L215 215" fill="none" stroke="#E2E8F0" stroke-width="8" stroke-linecap="round" />
    <!-- Eye Loop -->
    <path d="M235 180 C255 180, 255 220, 235 220" fill="none" stroke="#F5A400" stroke-width="8" stroke-linecap="round" />
  `,
  elastic_replacement: `
    <!-- High Stretch Elastic Band being threaded through casing -->
    <rect x="100" y="140" width="200" height="50" rx="8" fill="#08284A" />
    <!-- Elastic Band inserting -->
    <rect x="80" y="152" width="240" height="26" rx="4" fill="#FFFFFF" stroke="#F5A400" stroke-width="4" />
    <line x1="110" y1="152" x2="110" y2="178" stroke="#CBD5E1" stroke-width="3" />
    <line x1="140" y1="152" x2="140" y2="178" stroke="#CBD5E1" stroke-width="3" />
    <line x1="170" y1="152" x2="170" y2="178" stroke="#CBD5E1" stroke-width="3" />
    <line x1="200" y1="152" x2="200" y2="178" stroke="#CBD5E1" stroke-width="3" />
    <line x1="230" y1="152" x2="230" y2="178" stroke="#CBD5E1" stroke-width="3" />
    <line x1="260" y1="152" x2="260" y2="178" stroke="#CBD5E1" stroke-width="3" />
  `,
  pocket_repair: `
    <!-- Inner / Outer Pocket Stitched & Reinforced -->
    <rect x="130" y="120" width="140" height="160" rx="8" fill="#08284A" />
    <!-- Pocket Flap & Reinforced Bartack Stitches -->
    <path d="M130 120 L200 160 L270 120 Z" fill="#0A325E" stroke="#F5A400" stroke-width="3" />
    <rect x="130" y="115" width="12" height="6" fill="#EF4444" rx="2" />
    <rect x="258" y="115" width="12" height="6" fill="#EF4444" rx="2" />
  `,
  embroidery_detail: `
    <!-- Rich Zari & Silk Thread Embroidery -->
    <circle cx="200" cy="200" r="90" fill="#08284A" />
    <!-- Floral Motif -->
    <path d="M200 145 C180 170, 180 190, 200 215 C220 190, 220 170, 200 145 Z" fill="url(#goldGrad)" />
    <path d="M145 200 C170 180, 190 180, 215 200 C190 220, 170 220, 145 200 Z" fill="url(#goldGrad)" />
    <circle cx="200" cy="200" r="12" fill="#EF4444" stroke="#FDE68A" stroke-width="3" />
  `,
  lace_work: `
    <!-- Delicate Scalloped Lace Border attached to cloth -->
    <path d="M90 100 L310 100 L310 210 L90 210 Z" fill="#08284A" />
    <!-- White Scalloped Floral Lace -->
    <path d="M90 210 Q110 250 130 210 Q150 250 170 210 Q190 250 210 210 Q230 250 250 210 Q270 250 290 210 Q310 250 330 210" fill="none" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" />
    <line x1="90" y1="210" x2="310" y2="210" stroke="#F5A400" stroke-width="4" />
  `,
  border_work: `
    <!-- Rich Gotta Patti / Zari Border Ribbon Stitching -->
    <rect x="90" y="110" width="220" height="180" fill="#991B1B" rx="8" />
    <!-- Ornate Gold Brocade Ribbon -->
    <rect x="90" y="220" width="220" height="50" fill="url(#goldGrad)" />
    <!-- Diamond Motifs on Border -->
    <polygon points="125,245 135,230 145,245 135,260" fill="#78350F" />
    <polygon points="175,245 185,230 195,245 185,260" fill="#78350F" />
    <polygon points="225,245 235,230 245,245 235,260" fill="#78350F" />
    <polygon points="275,245 285,230 295,245 285,260" fill="#78350F" />
  `,
  patch_work: `
    <!-- Decorative Embroidered Patch / Applique Attached -->
    <rect x="100" y="110" width="200" height="180" rx="10" fill="#08284A" />
    <!-- Embroidered Patch Shield -->
    <path d="M160 150 L240 150 L250 220 Q200 260 150 220 Z" fill="url(#accentGrad)" stroke="#FFFFFF" stroke-width="4" />
    <!-- Star Emblem on Patch -->
    <path d="M200 170 L205 185 L220 185 L208 195 L212 210 L200 200 L188 210 L192 195 L180 185 L195 185 Z" fill="#08284A" />
  `,
  custom_modification: `
    <!-- Custom Tailor Styling & Cutwork Design -->
    <rect x="110" y="100" width="180" height="200" rx="12" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="3" />
    <path d="M150 140 Q200 180 250 140 L260 250 L140 250 Z" fill="none" stroke="#08284A" stroke-width="3" stroke-dasharray="5,4" />
    <circle cx="200" cy="180" r="22" fill="none" stroke="#F5A400" stroke-width="4" />
    <path d="M190 180 L210 180 M200 170 L200 190" stroke="#F5A400" stroke-width="4" stroke-linecap="round" />
  `,
  hemming: `
    <!-- Neat Blind-Stitched Folded Hem Edge -->
    <rect x="90" y="100" width="220" height="140" fill="#08284A" rx="8" />
    <!-- Turned Hem Layer -->
    <rect x="90" y="210" width="220" height="60" fill="#0A325E" rx="4" stroke="#F5A400" stroke-width="3" />
    <!-- Invisible Blind Hem Stitches -->
    <path d="M100 230 L115 220 L130 230 L145 220 L160 230 L175 220 L190 230 L205 220 L220 230 L235 220 L250 230 L265 220 L280 230 L295 220" fill="none" stroke="#FDE68A" stroke-width="3.5" stroke-linecap="round" />
  `,
  pico: `
    <!-- Delicate Rolled Pico Edge along Fabric Border -->
    <path d="M90 110 L310 110 L310 240 L90 240 Z" fill="#EC4899" rx="8" />
    <!-- Ultra fine Rolled Pico Edge with zigzag loops -->
    <path d="M90 240 L100 250 L110 240 L120 250 L130 240 L140 250 L150 240 L160 250 L170 240 L180 250 L190 240 L200 250 L210 240 L220 250 L230 240 L240 250 L250 240 L260 250 L270 240 L280 250 L290 240 L300 250 L310 240" fill="none" stroke="#FBBF24" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
  `,
  fall_stitching: `
    <!-- Saree Fall Cotton Strip Attached to Bottom Border -->
    <rect x="90" y="100" width="220" height="130" fill="url(#fabricTeal)" rx="8" />
    <!-- Saree Fall Strip (Contrasting inner protective band) -->
    <rect x="90" y="215" width="220" height="60" fill="#FDE047" rx="4" stroke="#D97706" stroke-width="2" />
    <!-- Twin Parallel Fine Hemming Stitches -->
    <line x1="100" y1="225" x2="300" y2="225" stroke="#78350F" stroke-width="2.5" stroke-dasharray="6,4" />
    <line x1="100" y1="265" x2="300" y2="265" stroke="#78350F" stroke-width="2.5" stroke-dasharray="6,4" />
  `,
  lining_work: `
    <!-- Garment Outer Fabric Peeled Back to show Soft Inner Lining -->
    <!-- Inner Silk Lining (Gold / Cream) -->
    <rect x="110" y="110" width="180" height="180" rx="10" fill="#FEF3C7" stroke="#FBBF24" stroke-width="2" />
    <!-- Outer Navy Fabric Layer Folded Corner -->
    <path d="M110 110 L250 110 L150 250 L110 250 Z" fill="url(#navyGrad)" />
    <!-- Stitched Seam Joining Lining to Outer Layer -->
    <line x1="250" y1="110" x2="150" y2="250" stroke="#F5A400" stroke-width="4" stroke-linecap="round" stroke-dasharray="6,4" />
  `,
  minor_finishing: `
    <!-- Seam Thread Trimming & Steam Press Finish -->
    <rect x="100" y="120" width="200" height="160" rx="12" fill="#08284A" />
    <line x1="115" y1="200" x2="285" y2="200" stroke="#F5A400" stroke-width="4" stroke-dasharray="8,6" />
    <!-- Clean Finishing Checkmark Seal -->
    <circle cx="200" cy="190" r="28" fill="#10B981" />
    <path d="M190 190 L197 198 L212 182" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  `
};

async function generateAllAssets() {
  console.log('Starting Asset Generation...');

  // 1. Convert existing JPGs
  await convertExistingJpgs();

  // 2. Generate unisex fit
  await svgToWebpAndPng(wrapStudioScene(unisexFitSvg), FIT_DIR, 'unisex');

  // 3. Generate Categories
  for (const [key, svg] of Object.entries(categorySvgs)) {
    await svgToWebpAndPng(wrapStudioScene(svg), CATEGORIES_DIR, key);
  }

  // 4. Generate Garments
  for (const [key, svg] of Object.entries(garmentSvgs)) {
    await svgToWebpAndPng(wrapStudioScene(svg), GARMENTS_DIR, key);
  }

  // 5. Generate Work Services
  for (const [key, svg] of Object.entries(serviceSvgs)) {
    await svgToWebpAndPng(wrapStudioScene(svg), SERVICES_DIR, key);
  }

  console.log('All assets successfully generated!');
}

generateAllAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
