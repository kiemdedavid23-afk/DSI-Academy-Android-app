import {
  contentAuthor,
  formatDuration,
  levelKey,
} from '@core/utils/contentDisplay';

describe('formatDuration', () => {
  it('ne montre jamais de fausse durée', () => {
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(undefined)).toBeNull();
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(Number.NaN)).toBeNull();
  });
  it('suit les règles du site', () => {
    expect(formatDuration(45)).toBe('0:45');
    expect(formatDuration(2520)).toBe('42 min');
    expect(formatDuration(3900)).toBe('1h 05');
  });
});

describe('contentAuthor', () => {
  it('lit author puis auteur', () => {
    expect(contentAuthor({metadata: {author: ' A '}})).toBe('A');
    expect(contentAuthor({metadata: {auteur: 'B'}})).toBe('B');
    expect(contentAuthor({metadata: {}})).toBeNull();
    expect(contentAuthor({metadata: {author: 3}})).toBeNull();
  });
});

describe('levelKey', () => {
  it('reconnaît les niveaux connus, sinon null', () => {
    expect(levelKey('debutant')).toBe('beginner');
    expect(levelKey('Intermediate')).toBe('intermediate');
    expect(levelKey('avancé')).toBe('advanced');
    expect(levelKey('expert')).toBeNull();
    expect(levelKey(null)).toBeNull();
  });
});
