const fs = require('fs');
const path = require('path');

const pages = [
  { route: '/', file: 'index.html' },
  { route: '/about', file: 'about.html' },
  { route: '/blogs', file: 'blogs.html' },
  { route: '/blogs/founder-story-darji', file: 'blogs/founder-story-darji.html' },
  { route: '/privacy', file: 'privacy.html' },
  { route: '/terms', file: 'terms.html' },
  { route: '/security', file: 'security.html' }
];

console.log('====================================');
console.log('DARJI PRODUCTION SEO AUDIT REPORT');
console.log('====================================\n');

for (const p of pages) {
  const filePath = path.resolve(__dirname, '../apps/customer-web/.next/server/app', p.file);
  if (!fs.existsSync(filePath)) {
    console.log(`Missing file: ${filePath}`);
    continue;
  }

  const html = fs.readFileSync(filePath, 'utf8');

  const titleMatch = html.match(/<title>(.*?)<\/title>/);
  const descMatch = html.match(/<meta name="description" content="(.*?)"/);
  const canonicalMatch = html.match(/<link rel="canonical" href="(.*?)"/);
  const ogTitleMatch = html.match(/<meta property="og:title" content="(.*?)"/);
  const ogDescMatch = html.match(/<meta property="og:description" content="(.*?)"/);
  const ogImageMatch = html.match(/<meta property="og:image" content="(.*?)"/);
  const ogUrlMatch = html.match(/<meta property="og:url" content="(.*?)"/);
  const twitterCardMatch = html.match(/<meta name="twitter:card" content="(.*?)"/);
  const twitterImgMatch = html.match(/<meta name="twitter:image" content="(.*?)"/);
  const ldJsonMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || [];

  console.log(`ROUTE: ${p.route}`);
  console.log(`  Page Title       : ${titleMatch ? titleMatch[1] : 'NONE'}`);
  console.log(`  Description      : ${descMatch ? descMatch[1] : 'NONE'}`);
  console.log(`  Canonical URL    : ${canonicalMatch ? canonicalMatch[1] : 'NONE'}`);
  console.log(`  OG Title         : ${ogTitleMatch ? ogTitleMatch[1] : 'NONE'}`);
  console.log(`  OG Image         : ${ogImageMatch ? ogImageMatch[1] : 'NONE'}`);
  console.log(`  OG URL           : ${ogUrlMatch ? ogUrlMatch[1] : 'NONE'}`);
  console.log(`  Twitter Card     : ${twitterCardMatch ? twitterCardMatch[1] : 'NONE'}`);
  console.log(`  Twitter Image    : ${twitterImgMatch ? twitterImgMatch[1] : 'NONE'}`);
  console.log(`  Structured Data  : ${ldJsonMatches.length} script block(s) detected`);
  console.log('------------------------------------');
}

console.log('\nASSET VERIFICATION:');
const assets = [
  'favicon.ico',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'icon-192.png',
  'icon-512.png',
  'og-image.jpg',
  'og-image.png',
  'site.webmanifest',
  'robots.txt',
  'sitemap.xml'
];

for (const a of assets) {
  const aPath = path.resolve(__dirname, '../apps/customer-web/public', a);
  const exists = fs.existsSync(aPath);
  const size = exists ? fs.statSync(aPath).size : 0;
  console.log(`  ${a.padEnd(22)}: ${exists ? `EXISTS (${size} bytes)` : 'MISSING'}`);
}
