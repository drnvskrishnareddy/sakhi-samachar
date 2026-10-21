// After `expo export -p web`: make the site installable and GitHub-Pages friendly.
// Usage: node scripts/postexport-web.mjs [distDir]
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = process.argv[2] || 'dist';
const base = (process.env.EXPO_BASE_URL || '').replace(/\/$/, '');
const indexPath = join(dist, 'index.html');
let html = readFileSync(indexPath, 'utf8');

const head = [
  `<link rel="manifest" href="${base}/manifest.json">`,
  `<link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png">`,
  '<meta name="theme-color" content="#A63D66">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Sakhi Samachar">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="description" content="Sakhi Samachar: menstrual health diary. A diary, not medical advice.">',
].join('\n');

if (!html.includes('rel="manifest"')) html = html.replace('</head>', `${head}\n</head>`);
html = html.replace(/<title>[^<]*<\/title>/, '<title>Sakhi Samachar</title>');
writeFileSync(indexPath, html);

// The privacy policy is published with the app, at <site>/privacy.html.
copyFileSync('docs/privacy-policy.html', join(dist, 'privacy.html'));

// GitHub Pages: open any app address directly (e.g. /insights) and skip Jekyll.
copyFileSync(indexPath, join(dist, '404.html'));
writeFileSync(join(dist, '.nojekyll'), '');
console.log(`Web build ready in ${dist} (base "${base || '/'}")`);
