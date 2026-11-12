/**
 * Tests de scripts/copy-fonts.js
 */

const {copyFonts, SRC_DIR, DEST_DIR} = require('../../scripts/copy-fonts.js');

describe('copyFonts', () => {
  it('ne plante pas quand le dossier source n\'existe pas ou ne contient que .gitkeep', () => {
    // Dans le dépôt actuel, src/assets/fonts/ ne contient que .gitkeep.
    const result = copyFonts();
    expect(result).toHaveProperty('copied');
    expect(result).toHaveProperty('skipped');
    expect(typeof result.copied).toBe('number');
    expect(typeof result.skipped).toBe('number');
  });

  it('expose les chemins source et destination', () => {
    expect(typeof SRC_DIR).toBe('string');
    expect(typeof DEST_DIR).toBe('string');
    expect(SRC_DIR).toContain('assets');
    expect(SRC_DIR).toContain('fonts');
    expect(DEST_DIR).toContain('android');
    expect(DEST_DIR).toContain('fonts');
  });
});