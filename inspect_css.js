const fs = require('fs');
const html = fs.readFileSync('mdx_source.html', 'utf8');

const regex = /href="([^"]+\.css[^"]*)"/gi;
let match;
const cssLinks = [];
while ((match = regex.exec(html)) !== null) {
  cssLinks.push(match[1]);
}

console.log('CSS Links:', cssLinks);
Promise.all(cssLinks.map(url => fetch(url.startsWith('http') ? url : 'https://www.mdx.so' + url).then(r => r.text())))
  .then(cssTexts => {
    cssTexts.forEach((css, idx) => {
      const parts = css.split('}');
      parts.forEach(p => {
        if (p.includes('footer__logo') || p.includes('footer-grid') || p.includes('footer-bottom')) {
          console.log(p.trim() + '}');
        }
      });
    });
  })
  .catch(err => console.error(err));
