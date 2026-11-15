import {classifyPlayerError, formatClock, nextSpeed} from '@core/media/playerNative';
import {isAllowedYoutubeNavigation, youtubeEmbedHtml} from '@core/config/youtube';
import {continueContentId} from '../src/features/academy/logic/houses';

describe('lecteur audio/vidéo : aides', () => {
  it('formate le temps', () => {
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(65_000)).toBe('1:05');
    expect(formatClock(3_725_000)).toBe('1:02:05');
    expect(formatClock(-5)).toBe('0:00');
  });
  it('fait tourner les vitesses', () => {
    expect(nextSpeed(1)).toBe(1.25);
    expect(nextSpeed(0.75)).toBe(1);
    expect(nextSpeed(3)).toBe(1.25);
  });
  it('relance la demande de lien quand la source refuse', () => {
    expect(classifyPlayerError('HTTP_403').reResolve).toBe(true);
    expect(classifyPlayerError('HTTP_410').reResolve).toBe(true);
    expect(classifyPlayerError('NETWORK')).toMatchObject({errorKind: 'network', retryable: true, reResolve: false});
    expect(classifyPlayerError('UNSUPPORTED').errorKind).toBe('unsupportedFormat');
    expect(classifyPlayerError('PLAYER').retryable).toBe(true);
  });
});

describe('YouTube intégré', () => {
  it('limite la navigation aux hôtes YouTube', () => {
    expect(isAllowedYoutubeNavigation('about:blank')).toBe(true);
    expect(isAllowedYoutubeNavigation('https://www.youtube-nocookie.com/embed/abc')).toBe(true);
    expect(isAllowedYoutubeNavigation('https://evil.example.com/')).toBe(false);
    expect(isAllowedYoutubeNavigation('http://www.youtube.com/')).toBe(false);
  });
  it("n'embarque que l'iframe officielle", () => {
    const html = youtubeEmbedHtml('dQw4w9WgXcQ');
    expect(html).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });
});

describe('Reprendre', () => {
  it('mène à la fiche pour bibliothèque, audio et vidéos', () => {
    expect(continueContentId({id: '12', house: 'audio'})).toBe(12);
    expect(continueContentId({id: '7', house: 'videos'})).toBe(7);
    expect(continueContentId({id: '7', house: 'community'})).toBeNull();
  });
});
