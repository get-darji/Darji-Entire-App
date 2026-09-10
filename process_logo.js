const sharp = require('sharp');
const fs = require('fs');

async function processLogo() {
  const image = sharp('apps/customer-web/public/darji-transparent.png');
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  console.log('Image info:', info);

  // Find non-transparent bounding box
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const alpha = data[idx + 3];
      if (alpha > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  console.log(`Bounding box: x=${minX}..${maxX} (width=${maxX - minX + 1}), y=${minY}..${maxY} (height=${maxY - minY + 1})`);

  // Create pure white version
  const whiteData = Buffer.from(data);
  for (let i = 0; i < whiteData.length; i += info.channels) {
    const alpha = whiteData[i + 3];
    if (alpha > 0) {
      whiteData[i] = 255;     // R
      whiteData[i + 1] = 255; // G
      whiteData[i + 2] = 255; // B
    }
  }

  // Save full cropped white logo
  await sharp(whiteData, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .toFile('apps/customer-web/public/darji-wordmark-white.png');

  console.log('Saved darji-wordmark-white.png');

  // Let's analyze vertical columns across the cropped logo to see letter boundaries
  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  
  // Crop the raw white data to bounding box
  const cropped = await sharp(whiteData, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cData = cropped.data;
  const colDensity = [];
  for (let x = 0; x < cropW; x++) {
    let sum = 0;
    for (let y = 0; y < cropH; y++) {
      const idx = (y * cropW + x) * 4;
      if (cData[idx + 3] > 30) sum++;
    }
    colDensity.push(sum);
  }

  console.log('Cropped Width:', cropW, 'Height:', cropH);
}

processLogo().catch(console.error);
