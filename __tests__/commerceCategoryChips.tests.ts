/** Pastilles de catégories : « Toutes » facultatif (accueil de Découvrir). */
import {readFileSync} from 'fs';
import {join} from 'path';

const src = readFileSync(
  join(__dirname, '../src/features/commerce/components/CommerceCategoryChips.tsx'),
  'utf8',
);

describe('CommerceCategoryChips', () => {
  it('« Toutes » est affiché par défaut et masquable', () => {
    expect(src).toContain('showAll = true');
    expect(src).toContain('showAll ? chip(null');
  });
  it('sans « Toutes », toucher la pastille active la retire', () => {
    expect(src).toContain('!showAll && active ? null : slug');
  });
});
