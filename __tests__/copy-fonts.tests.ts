/**
 * Tests de scripts/copy-fonts.js
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const {copyFonts, SRC_DIR, DEST_DIR} = require('../scripts/copy-fonts.js');

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'dsi-fonts-'));
}

describe('copyFonts', () => {
  it('expose les chemins source et destination', () => {
    expect(SRC_DIR).toContain(path.join('src', 'assets', 'fonts'));
    expect(DEST_DIR).toContain(path.join('android', 'app', 'src', 'main'));
    expect(DEST_DIR).toContain('fonts');
  });

  it('ne plante pas quand le dossier source n\'existe pas', () => {
    const dest = path.join(tempDir(), 'out');
    const result = copyFonts({src: path.join(tempDir(), 'absent'), dest});
    expect(result).toEqual({copied: 0, skipped: 0});
    expect(fs.existsSync(dest)).toBe(false);
  });

  it('ignore .gitkeep et ne crée pas la destination s\'il n\'y a aucune police', () => {
    const src = tempDir();
    fs.writeFileSync(path.join(src, '.gitkeep'), 'keep');
    const dest = path.join(tempDir(), 'out');
    const result = copyFonts({src, dest});
    expect(result).toEqual({copied: 0, skipped: 1});
    expect(fs.existsSync(dest)).toBe(false);
  });

  it('copie les .ttf et .otf, ignore le reste', () => {
    const src = tempDir();
    fs.writeFileSync(path.join(src, 'Manrope-Regular.ttf'), 'a');
    fs.writeFileSync(path.join(src, 'Fraunces-Bold.otf'), 'b');
    fs.writeFileSync(path.join(src, 'OFL.txt'), 'licence');
    const dest = path.join(tempDir(), 'out');
    const result = copyFonts({src, dest});
    expect(result).toEqual({copied: 2, skipped: 1});
    expect(fs.readdirSync(dest).sort()).toEqual([
      'Fraunces-Bold.otf',
      'Manrope-Regular.ttf',
    ]);
  });
});
