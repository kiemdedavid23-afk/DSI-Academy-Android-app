import {classifyPdfError} from '@core/media/pdfNative';
import {pageToPercent, percentToPage} from '../src/features/content/store/pdfReaderStore';

describe('progression PDF', () => {
  it('convertit page ↔ pourcentage', () => {
    expect(pageToPercent(0, 11)).toBe(0);
    expect(pageToPercent(5, 11)).toBe(50);
    expect(pageToPercent(0, 1)).toBe(100);
    expect(percentToPage(50, 11)).toBe(5);
  });
  it('ne reprend pas sous 3 % ni au-delà de 97 %', () => {
    expect(percentToPage(2, 40)).toBe(0);
    expect(percentToPage(98, 40)).toBe(0);
    expect(percentToPage(null, 40)).toBe(0);
  });
});

describe('erreurs natives PDF', () => {
  it('relance la résolution du lien si la source refuse', () => {
    expect(classifyPdfError('HTTP_403').reResolve).toBe(true);
    expect(classifyPdfError('HTTP_404').reResolve).toBe(true);
    expect(classifyPdfError('SOURCE_HTML_PAGE').reResolve).toBe(true);
  });
  it('classe limite, serveur, réseau et PDF illisible', () => {
    expect(classifyPdfError('HTTP_429')).toMatchObject({errorKind: 'sourceRateLimited', retryable: true});
    expect(classifyPdfError('HTTP_503')).toMatchObject({errorKind: 'sourceServer', retryable: true});
    expect(classifyPdfError('NETWORK')).toMatchObject({errorKind: 'network', retryable: true});
    expect(classifyPdfError('PDF_PROTECTED').errorKind).toBe('pdfProtected');
    expect(classifyPdfError('PDF_INVALID').retryable).toBe(false);
  });
});

import {classifyDocError, isDocFormat} from '@core/media/docNative';

describe('formats documents natifs', () => {
  it('reconnaît epub, mobi, docx', () => {
    expect(isDocFormat('EPUB')).toBe(true);
    expect(isDocFormat('docx')).toBe(true);
    expect(isDocFormat('pdf')).toBe(false);
    expect(isDocFormat(null)).toBe(false);
  });
  it('classe les erreurs documents', () => {
    expect(classifyDocError('DOC_ENCRYPTED').errorKind).toBe('docEncrypted');
    expect(classifyDocError('DOC_UNSUPPORTED_MOBI').errorKind).toBe('docUnsupportedMobi');
    expect(classifyDocError('HTTP_403').reResolve).toBe(true);
  });
});
