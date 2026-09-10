const sharp = require('sharp');
const fs = require('fs');

async function extractLetters() {
  const fullWhite = sharp('apps/customer-web/public/darji-wordmark-white.png');
  const { data, info } = await fullWhite.raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;

  // Let's create an SVG or separate PNGs for each letter:
  // In the Darji logo (width 365, height 190):
  // Let's find horizontal split ranges:
  // D: from x=0 to ~155 (includes needle, loop, curved body)
  // a: from x=140 to ~225
  // r: from x=215 to ~285
  // j: from x=275 to ~370 (includes the lower descender tail and diamond dot)
  // i: from x=350 to ~365 (includes the stem and diamond dot)

  // Let's test letter ranges and write individual letter PNGs:
  // We will preserve the exact height H so all letters align vertically 100% identically!
  
  // Let's inspect pixel distribution across x to find exact valleys/bounds
  console.log('Finding letter segments...');

  // Save the full white logo as SVG or high-res vector representation or separate PNG letters
  // Let's save letter 1: 'D' (needle + D body)
  // Let's save letter 2: 'a'
  // Let's save letter 3: 'r'
  // Let's save letter 4: 'j'
  // Let's save letter 5: 'i'
  
  // Also, let's create a high-res vectorized SVG of the exact logo words D, A, R, J, I
  // and individual letter images!
}

extractLetters().catch(console.error);
