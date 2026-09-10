const fs = require('fs');
const html = fs.readFileSync('mdx_source.html', 'utf8');

const regex = /href="([^"]+\.css[^"]*)"/gi;
let match;
const cssLinks = [];
while ((match = regex.exec(html)) !== null) {
  cssLinks.push(match[1]);
}

Promise.all(cssLinks.map(url => fetch(url.startsWith('http') ? url : 'https://www.mdx.so' + url).then(r => r.text())))
  .then(cssTexts => {
    cssTexts.forEach((css, idx) => {
      const fontFaces = css.match(/@font-face\s*\{[^}]+\}/gi);
      console.log(`CSS ${idx} font faces:`, fontFaces);
      const fonts = css.match(/font-family:[^;}]+/gi);
      if (fonts) {
        console.log(`CSS ${idx} font families:`, [...new Set(fonts)]);
      }
    });
  });
