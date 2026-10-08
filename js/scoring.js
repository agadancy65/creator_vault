// Levenshtein edit distance between two strings
function levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// mockCreators: replace with a real backend fetch once Supabase is wired up.
// Each creator has one verified handle + fake metadata for the demo.
//
// "photo" is the path to the creator's profile photo. It is resolved
// relative to the pages/ directory, since that is where results are
// rendered. A creator without a photo simply omits it, and the result
// card falls back to the generic icon.
const mockCreators = [
  {
    name: "Tobi",
    handle: "@tobi_official",
    accountAgeDays: 900,
    photoHash: "same-photo-hash-1",
    photo: "../assets/images/avatar-tobi.svg",
    claimed: true,
    reviewed: true,
  },
];

// Turns an account age in days into a short human phrase, for the
// "how long has this account been active" reason.
function accountAgePhrase(days) {
  if (typeof days !== "number" || !isFinite(days) || days < 1) {
    return "a short time";
  }
  if (days < 60) {
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (days < 730) {
    const months = Math.round(days / 30.44);
    return `${months} month${months === 1 ? "" : "s"}`;
  }
  return `over ${Math.floor(days / 365.25)} years`;
}

// Why an exact match counts as verified. These are the reasons
// shown on the verified result card.
function verifiedReasons(creator) {
  const reasons = [];
  if (creator.claimed !== false) {
    reasons.push(`Officially claimed by ${creator.name}`);
  }
  if (creator.reviewed !== false) {
    reasons.push("Identity reviewed by CreatorVault");
  }
  reasons.push(
    `Account active for ${accountAgePhrase(creator.accountAgeDays)}`,
  );
  return reasons;
}

// Simulates "how old is the searched account" and "does its photo match" —
// in a real build this comes from platform APIs or seeded demo data.
function mockSignals(searchedHandle) {
  const isLookalike =
    searchedHandle.toLowerCase().includes("0fficial") ||
    searchedHandle.toLowerCase().includes("_mgmt");
  return {
    accountAgeDays: isLookalike ? 8 : 900,
    photoHash: isLookalike ? "same-photo-hash-1" : "different-hash",
  };
}

// Main entry point. Returns { status, handle, matchedHandle, reasons }
function scoreHandle(searchedHandle) {
  const clean = searchedHandle.startsWith("@")
    ? searchedHandle
    : `@${searchedHandle}`;

  // Exact match against a verified handle
  const exact = mockCreators.find(
    (c) => c.handle.toLowerCase() === clean.toLowerCase(),
  );
  if (exact) {
    return {
      status: "verified",
      handle: clean,
      name: exact.name,
      photo: exact.photo || null,
      reasons: verifiedReasons(exact),
    };
  }

  // Find closest verified handle
  let closest = null;
  let closestDistance = Infinity;
  for (const c of mockCreators) {
    const d = levenshtein(clean.toLowerCase(), c.handle.toLowerCase());
    if (d < closestDistance) {
      closestDistance = d;
      closest = c;
    }
  }

  const signals = mockSignals(clean);
  let score = 0;
  const reasons = [];

  const normalizedSimilarity =
    1 -
    closestDistance /
      Math.max(clean.length, closest ? closest.handle.length : 1);

  if (closest && normalizedSimilarity > 0.75) {
    score += 40;
    reasons.push(
      `${closestDistance} character${closestDistance === 1 ? "" : "s"} different from ${closest.handle}`,
    );
  }
  if (signals.accountAgeDays < 90) {
    score += 25;
    reasons.push(`Account created ${signals.accountAgeDays} days ago`);
  }
  if (closest && signals.photoHash === closest.photoHash) {
    score += 35;
    reasons.push("Profile photo matches a verified creator");
  }

  if (score >= 50) {
    return {
      status: "flagged",
      handle: clean,
      matchedHandle: closest ? closest.handle : null,
      reasons,
    };
  }

  return { status: "not_found", handle: clean, reasons: [] };
}
