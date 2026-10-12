const express = require('express');
const crypto = require('crypto');
const { z } = require('zod');

const prisma = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { checkLimiter } = require('../middleware/rateLimit');
const { parseProfileUrl } = require('../utils/profileUrl');
const { submitForDecision } = require('../services/claims');

const router = express.Router();
router.use(requireAuth, requireRole('CREATOR'));

const MAX_HANDLES = 5;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid typing mistakes

function makeProofCode() {
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  return `CV-${s}`;
}

const toDto = (h) => ({
  id: h.id,
  platform: h.platform,
  handle: h.handle,
  profileUrl: h.profileUrl,
  status: h.status,
  level: h.level,
  proofCode: h.status === 'PENDING_PROOF' || h.status === 'PENDING_REVIEW' ? h.proofCode : undefined,
  reviewNote: h.reviewNote || undefined,
  createdAt: h.createdAt,
  verifiedAt: h.verifiedAt,
});

async function loadOwn(req, res) {
  const handle = await prisma.handle.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!handle) {
    res.status(404).json({ error: 'Handle not found.' });
    return null;
  }
  return handle;
}

router.get('/handles', asyncHandler(async (req, res) => {
  const handles = await prisma.handle.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  res.json({ handles: handles.map(toDto) });
}));

router.post('/handles', validate(z.object({ profileUrl: z.string().trim().min(3).max(300) })), asyncHandler(async (req, res) => {
  const parsed = parseProfileUrl(req.body.profileUrl);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const own = await prisma.handle.findMany({ where: { userId: req.user.id } });
  if (own.length >= MAX_HANDLES) return res.status(400).json({ error: `You can add up to ${MAX_HANDLES} handles.` });

  const normalized = parsed.handle.toLowerCase();
  if (own.some((h) => h.platform === parsed.platform && h.normalized === normalized)) {
    return res.status(409).json({ error: 'You already added this handle.' });
  }

  const handle = await prisma.handle.create({
    data: {
      userId: req.user.id,
      platform: parsed.platform,
      handle: parsed.handle,
      normalized,
      profileUrl: parsed.profileUrl,
      proofCode: makeProofCode(),
    },
  });

  res.status(201).json({
    handle: toDto(handle),
    instructions: `Add the code ${handle.proofCode} to your ${parsed.platform} bio, then press Check. Keep it there until you are verified.`,
  });
}));

// Best-effort automatic proof: look for the code on the public profile page.
router.post('/handles/:id/check', checkLimiter, asyncHandler(async (req, res) => {
  const handle = await loadOwn(req, res);
  if (!handle) return;
  if (handle.status !== 'PENDING_PROOF') return res.status(400).json({ error: 'This handle is not waiting for proof.' });

  let found = false;
  try {
    const response = await fetch(handle.profileUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CreatorVaultBot/1.0)', 'Accept-Language': 'en' },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    });
    const text = (await response.text()).slice(0, 2_000_000);
    found = text.toLowerCase().includes(handle.proofCode.toLowerCase());
  } catch {
    found = false;
  }

  if (!found) {
    return res.json({
      confirmed: false,
      message: 'We could not see the code on your profile. Make sure it is in your bio and saved. If it still fails, request a manual review.',
    });
  }

  const updated = await submitForDecision(handle, 'AUTO');
  res.json({ confirmed: true, handle: toDto(updated) });
}));

// Fallback: an admin will look at the live bio and confirm the code.
router.post('/handles/:id/request-review', asyncHandler(async (req, res) => {
  const handle = await loadOwn(req, res);
  if (!handle) return;
  if (handle.status !== 'PENDING_PROOF') return res.status(400).json({ error: 'This handle is not waiting for proof.' });

  const updated = await submitForDecision(handle, 'MANUAL');
  res.json({ handle: toDto(updated), message: 'Submitted. An admin will review your profile soon.' });
}));

router.delete('/handles/:id', asyncHandler(async (req, res) => {
  const handle = await loadOwn(req, res);
  if (!handle) return;
  await prisma.handle.delete({ where: { id: handle.id } });
  res.json({ message: 'Handle removed.' });
}));

module.exports = router;