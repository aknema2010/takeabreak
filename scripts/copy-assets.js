// Copies non-TS assets (HTML, CSS, and the assets/ folder) into dist/ after tsc,
// preserving directory structure. Keeps the build bundler-free.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const distDir = path.join(root, 'dist');

function walk(dir, cb) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('copied', path.relative(root, to));
}

// 1. Copy renderer HTML/CSS into dist mirroring src layout.
walk(srcDir, (file) => {
  if (/\.(html|css)$/.test(file)) {
    copy(file, path.join(distDir, path.relative(srcDir, file)));
  }
});

// 2. Copy the assets/ tree (icons, bundled ad clips) into dist/assets.
const assetsDir = path.join(root, 'assets');
if (fs.existsSync(assetsDir)) {
  walk(assetsDir, (file) => {
    copy(file, path.join(distDir, 'assets', path.relative(assetsDir, file)));
  });
}
