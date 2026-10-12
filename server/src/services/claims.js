const prisma = require('../db');
const { compareHandles, isRisky } = require('../utils/similarity');

// Finds verified handles owned by OTHER creators that this claim resembles.
async function findSimilarVerified(handle) {
  const verified = await prisma.handle.findMany({
    where: { status: 'VERIFIED', userId: { not: handle.userId } },
    include: { user: { select: { name: true } } },
  });

  const results = [];
  for (const v of verified) {
    if (v.platform === handle.platform && v.normalized === handle.normalized) {
      results.push({ handle: v, score: 1, reason: 'EXACT_SAME_HANDLE' });
      continue;
    }
    const cmp = compareHandles(handle.handle, v.handle);
    if (cmp) results.push({ handle: v, score: cmp.score, reason: cmp.reason });
  }
  return results.sort((x, y) => y.score - x.score).slice(0, 5);
}

// Called once ownership proof is submitted. Auto-verifies only clean, automatically proven claims;
// everything else goes to the admin queue with dispute records.
async function submitForDecision(handle, method) {
  const conflicts = await findSimilarVerified(handle);

  const reasons = [];
  if (method === 'MANUAL') reasons.push('MANUAL_PROOF');
  if (conflicts.length) reasons.push('SIMILAR_TO_VERIFIED');
  if (isRisky(handle.handle)) reasons.push('RISKY_NAME');

  if (reasons.length === 0) {
    return prisma.handle.update({
      where: { id: handle.id },
      data: { status: 'VERIFIED', level: 1, proofMethod: 'AUTO', verifiedAt: new Date(), reviewReason: null },
    });
  }

  for (const c of conflicts) {
    await prisma.dispute.upsert({
      where: { newHandleId_existingHandleId: { newHandleId: handle.id, existingHandleId: c.handle.id } },
      update: { similarity: c.score, reason: c.reason, status: 'OPEN', resolution: null, resolvedAt: null },
      create: { newHandleId: handle.id, existingHandleId: c.handle.id, similarity: c.score, reason: c.reason },
    });
  }

  return prisma.handle.update({
    where: { id: handle.id },
    data: { status: 'PENDING_REVIEW', proofMethod: method, reviewReason: reasons.join(',') },
  });
}

module.exports = { findSimilarVerified, submitForDecision };