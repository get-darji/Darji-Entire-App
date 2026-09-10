const fs = require('fs');
const html = fs.readFileSync('mdx_source.html', 'utf8');

// Find all script tags
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let count = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  const fullTag = match[0];
  const content = match[1];
  console.log(`Script ${count++}: length ${content.length}, tag: ${fullTag.substring(0, 100)}`);
  if (content.includes('footer__logo') || content.includes('footer-grid') || content.includes('gsap') || content.includes('ScrollTrigger')) {
    console.log('Found match in inline script:', content.substring(0, 500));
  }
}

// Find external scripts
const srcRegex = /src="([^"]+\.js[^"]*)"/gi;
const externalScripts = [];
while ((match = srcRegex.exec(html)) !== null) {
  externalScripts.push(match[1]);
}
console.log('External scripts:', externalScripts);
