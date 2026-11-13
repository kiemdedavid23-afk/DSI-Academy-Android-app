/**
 * Copie les polices embarquées (src/assets/fonts) vers les assets Android
 * (android/app/src/main/assets/fonts), où React Native les lit par nom de fichier
 * (R-PLAT-3). Le dossier de destination est ignoré par git.
 *
 * Usage : node scripts/copy-fonts.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src', 'assets', 'fonts');
const DEST_DIR = path.join(
  ROOT,
  'android',
  'app',
  'src',
  'main',
  'assets',
  'fonts',
);

const FONT_EXTENSIONS = new Set(['.ttf', '.otf']);

/**
 * @param {{src?: string, dest?: string}} [options]
 * @returns {{copied: number, skipped: number}}
 */
function copyFonts(options = {}) {
  const src = options.src ?? SRC_DIR;
  const dest = options.dest ?? DEST_DIR;

  if (!fs.existsSync(src)) {
    return {copied: 0, skipped: 0};
  }

  let copied = 0;
  let skipped = 0;

  for (const entry of fs.readdirSync(src, {withFileTypes: true})) {
    if (!entry.isFile()) {
      continue;
    }
    const ext = path.extname(entry.name).toLowerCase();
    if (!FONT_EXTENSIONS.has(ext)) {
      skipped += 1;
      continue;
    }
    if (copied === 0) {
      fs.mkdirSync(dest, {recursive: true});
    }
    fs.copyFileSync(path.join(src, entry.name), path.join(dest, entry.name));
    copied += 1;
  }

  return {copied, skipped};
}

module.exports = {copyFonts, SRC_DIR, DEST_DIR, FONT_EXTENSIONS};

if (require.main === module) {
  const {copied, skipped} = copyFonts();
  console.log(
    `[copy-fonts] ${copied} police(s) copiée(s), ${skipped} fichier(s) ignoré(s).`,
  );
}
