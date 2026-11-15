// Lecteur YouTube intégré (seule exception WebView de la lecture) : page minimale
// qui n'embarque que l'iframe officielle, navigation limitée aux hôtes YouTube.

const EMBED_HOST = 'https://www.youtube-nocookie.com';

export function youtubeEmbedHtml(videoId: string): string {
  const src = `${EMBED_HOST}/embed/${videoId}?playsinline=1&rel=0&modestbranding=1`;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head><body><iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
}

export const YOUTUBE_BASE_URL = EMBED_HOST;

export function isAllowedYoutubeNavigation(url: string): boolean {
  return (
    url === 'about:blank' ||
    /^https:\/\/(www\.)?(youtube-nocookie|youtube)\.com\//i.test(url) ||
    /^https:\/\/([a-z0-9-]+\.)?(ytimg|googlevideo|gstatic|google)\.com\//i.test(url)
  );
}
