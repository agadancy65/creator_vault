const PLATFORMS = {
  INSTAGRAM: {
    hosts: ['instagram.com', 'www.instagram.com'],
    re: /^[a-z0-9._]{1,30}$/i,
    needsAt: false,
    build: (h) => `https://www.instagram.com/${h}/`,
  },
  TIKTOK: {
    hosts: ['tiktok.com', 'www.tiktok.com'],
    re: /^[a-z0-9._]{2,24}$/i,
    needsAt: true,
    build: (h) => `https://www.tiktok.com/@${h}`,
  },
  X: {
    hosts: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'],
    re: /^[a-z0-9_]{1,15}$/i,
    needsAt: false,
    build: (h) => `https://x.com/${h}`,
  },
  YOUTUBE: {
    hosts: ['youtube.com', 'www.youtube.com', 'm.youtube.com'],
    re: /^[a-z0-9._-]{3,30}$/i,
    needsAt: true,
    build: (h) => `https://www.youtube.com/@${h}`,
  },
  FACEBOOK: {
    hosts: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com'],
    re: /^[a-z0-9.]{5,50}$/i,
    needsAt: false,
    build: (h) => `https://www.facebook.com/${h}`,
  },
};

const RESERVED = new Set([
  'home', 'explore', 'login', 'signup', 'share', 'intent', 'i', 'hashtag', 'search', 'p', 'reel',
  'reels', 'watch', 'channel', 'c', 'user', 'pages', 'profile.php', 'settings', 'about', 'help',
  'stories', 'tv', 'accounts', 'direct',
]);

// Returns { platform, handle, profileUrl } or { error }
function parseProfileUrl(input) {
  let text = String(input || '').trim();
  if (!text) return { error: 'Enter your profile link.' };
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`;

  let url;
  try {
    url = new URL(text);
  } catch {
    return { error: 'That does not look like a valid link.' };
  }

  const host = url.hostname.toLowerCase();
  const platform = Object.keys(PLATFORMS).find((p) => PLATFORMS[p].hosts.includes(host));
  if (!platform) {
    return { error: 'Supported platforms: Instagram, TikTok, X (Twitter), YouTube and Facebook.' };
  }

  const cfg = PLATFORMS[platform];
  let first = url.pathname.split('/').filter(Boolean)[0];
  if (!first) return { error: 'That link does not point to a profile.' };

  try {
    first = decodeURIComponent(first);
  } catch {
    return { error: 'That link does not look right.' };
  }

  if (cfg.needsAt && !first.startsWith('@')) {
    return { error: 'Use your profile link that contains @yourusername.' };
  }
  const handle = first.replace(/^@/, '');

  if (RESERVED.has(handle.toLowerCase()) || !cfg.re.test(handle)) {
    return { error: 'That link does not point to a profile.' };
  }

  // We rebuild the URL ourselves, so users can never make the server fetch an arbitrary address.
  return { platform, handle, profileUrl: cfg.build(handle) };
}

module.exports = { parseProfileUrl };