// src/shared/designsystem/theme/fonts.ts
export function fontFamily(role: string, weight: string, italic = false): string {
  const map: Record<string, string> = {
    'royal-400': 'Fraunces-Regular',
    'royal-500': 'Fraunces-Medium',
    'royal-600': 'Fraunces-SemiBold',
    'royal-700': 'Fraunces-Bold',
    'royal-400-italic': 'Fraunces-Italic',
    'royal-500-italic': 'Fraunces-MediumItalic',
    'royal-600-italic': 'Fraunces-SemiBoldItalic',
    'sans-400': 'Manrope-Regular',
    'sans-500': 'Manrope-Medium',
    'sans-600': 'Manrope-SemiBold',
    'sans-700': 'Manrope-Bold',
    'sans-800': 'Manrope-ExtraBold',
    'mono-500': 'IBMPlexMono-Medium',
  };
  const key = `${role}-${weight}${italic ? '-italic' : ''}`;
  return map[key] ?? 'Manrope-Regular';
}