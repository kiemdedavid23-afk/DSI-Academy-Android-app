/**
 * Découpe un texte en blocs d'affichage (≈ un paragraphe, ou quelques-uns),
 * pour une liste virtualisée : un seul <Text> géant serait trop lourd.
 */

export const CHUNK_TARGET = 1500;
export const CHUNK_HARD_MAX = 3000;

export function chunkText(raw: string): string[] {
  const text = raw.replace(/\r\n?/g, '\n').trim();
  if (text === '') {
    return [];
  }
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    if (current !== '') {
      chunks.push(current);
      current = '';
    }
  };

  for (const p of paragraphs) {
    let rest = p.trim();
    if (rest === '') {
      continue;
    }
    // Paragraphe démesuré : coupe sur une fin de phrase ou un espace.
    while (rest.length > CHUNK_HARD_MAX) {
      let cut = rest.lastIndexOf('. ', CHUNK_HARD_MAX);
      if (cut < CHUNK_TARGET) {
        cut = rest.lastIndexOf(' ', CHUNK_HARD_MAX);
      }
      if (cut < CHUNK_TARGET) {
        cut = CHUNK_HARD_MAX;
      }
      flush();
      chunks.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest === '') {
      continue;
    }
    if (current !== '' && current.length + rest.length + 2 > CHUNK_TARGET) {
      flush();
    }
    current = current === '' ? rest : `${current}\n\n${rest}`;
  }
  flush();
  return chunks;
}
