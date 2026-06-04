const DIRECT_MEDIA_EXTENSIONS = [
  '.mp3',
  '.m4a',
  '.aac',
  '.ogg',
  '.wav',
  '.flac',
  '.mp4',
  '.webm',
  '.m3u8',
  '.mov',
];

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');

const getExtension = (url) => {
  const clean = normalize(url).split('?')[0].split('#')[0].toLowerCase();
  const dotIndex = clean.lastIndexOf('.');
  return dotIndex >= 0 ? clean.slice(dotIndex) : '';
};

const isHttpUrl = (url) => /^https?:\/\//i.test(normalize(url));

const extractYoutubeId = (url) => {
  const value = normalize(url);
  if (!value) return null;

  const shortMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (shortMatch) return shortMatch[1];

  const watchMatch = value.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watchMatch) return watchMatch[1];

  const embedMatch = value.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i);
  if (embedMatch) return embedMatch[1];

  return null;
};

const classifyMediaSource = (url) => {
  const value = normalize(url);
  if (!value || !isHttpUrl(value)) return 'invalid';

  const youtubeId = extractYoutubeId(value);
  if (youtubeId) return 'youtube';

  const ext = getExtension(value);
  if (DIRECT_MEDIA_EXTENSIONS.includes(ext)) {
    if (['.mp3', '.m4a', '.aac', '.ogg', '.wav', '.flac'].includes(ext)) {
      return 'audio';
    }
    return 'video';
  }

  return 'html';
};

const toMediaPayload = (url) => {
  const value = normalize(url);
  const sourceType = classifyMediaSource(value);
  const youtubeId = sourceType === 'youtube' ? extractYoutubeId(value) : null;

  if (sourceType === 'youtube') {
    return {
      sourceType,
      isPlayable: true,
      media: {
        kind: 'video',
        provider: 'youtube',
        source: value,
        youtubeId,
      },
    };
  }

  if (sourceType === 'audio' || sourceType === 'video') {
    return {
      sourceType,
      isPlayable: true,
      media: {
        kind: sourceType,
        provider: 'direct',
        source: value,
        youtubeId: null,
      },
    };
  }

  return {
    sourceType,
    isPlayable: false,
    media: {
      kind: null,
      provider: null,
      source: null,
      youtubeId: null,
    },
  };
};

module.exports = {
  classifyMediaSource,
  toMediaPayload,
  extractYoutubeId,
};