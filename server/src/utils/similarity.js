const CHAR_MAP = { '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't', $: 's', '@': 'a', '!': 'l', '|': 'l', i: 'l' };

// Lowercases, maps lookalike characters (0->o, 1->l, i->l ...), removes separators.
function normalize(raw) {
  let s = String(raw).toLowerCase().replace(/^@/, '');
  s = s.replace(/rn/g, 'm').replace(/vv/g, 'w');
  s = [...s].map((c) => CHAR_MAP[c] || c).join('');
  return s.replace(/[._\-]/g, '');
}

// Words scammers add to a real name.
const RISKY_WORDS = [
  'official', 'real', 'mgmt', 'management', 'manager', 'team', 'business', 'biz', 'ads',
  'collab', 'collabs', 'agency', 'fanpage', 'fans', 'page', 'contact', 'booking', 'bookings', 'media',
]
  .map(normalize)
  .sort((a, b) => b.length - a.length);

// Removes risky words from the start/end to reveal the core name: tobiofficialmgmt -> tobi
function stripRisky(norm) {
  let s = norm;
  let changed = true;
  while (changed) {
    changed = false;
    for (const w of RISKY_WORDS) {
      if (s.length - w.length < 3) continue;
      if (s.endsWith(w)) {
        s = s.slice(0, -w.length);
        changed = true;
      } else if (s.startsWith(w)) {
        s = s.slice(w.length);
        changed = true;
      }
    }
  }
  return s;
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

// Returns { score, reason } if the two handles look alike, otherwise null.
function compareHandles(newRaw, existingRaw) {
  const a = normalize(newRaw);
  const b = normalize(existingRaw);
  if (!a || !b) return null;

  if (a === b) return { score: 1, reason: 'LOOKALIKE_CHARACTERS' };

  const ca = stripRisky(a);
  const cb = stripRisky(b);
  if (ca === cb && ca.length >= 3) return { score: 0.95, reason: 'SAME_CORE_NAME' };

  const max = Math.max(a.length, b.length);
  const ratio = 1 - levenshtein(a, b) / max;
  if ((levenshtein(a, b) <= 1 && max >= 4) || ratio >= 0.8) return { score: ratio, reason: 'VERY_SIMILAR' };

  const cmax = Math.max(ca.length, cb.length);
  if (cmax >= 4) {
    const cr = 1 - levenshtein(ca, cb) / cmax;
    if (cr >= 0.85) return { score: cr, reason: 'SIMILAR_CORE_NAME' };
  }
  return null;
}

// True if the handle contains words like official / mgmt / team around a core name.
function isRisky(raw) {
  const n = normalize(raw);
  return stripRisky(n) !== n;
}

module.exports = { normalize, compareHandles, isRisky };