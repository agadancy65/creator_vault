const express = require('express');
const { z } = require('zod');

const prisma = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { reportLimiter } = require('../middleware/rateLimit');
const { parseProfileUrl } = require('../utils/profileUrl');

const router = express.Router();
router.use(requireAuth, requireRole('CREATOR'));

const MAX_OPEN = 5;

const createSchema = z.object({
  realHandleId: z.string().trim().min(1, 'Choose which of your handles is being copied.'),
  profileUrl: z.string().trim().min(3, 'Paste the fake profile link.').max(300),
  details: z.string().trim().min(10, 'Briefly say what makes it fake (at least 10 characters).').max(1000),
});

router.get('/', asyncHandler(async (req, res) => {
  const reports = await prisma.report.findMany({
    where: { reporterId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: { realHandle: { select: { platform: true, handle: true } } },
  });
  res.json({
    reports: reports.map((r) => ({
      id: r.id,
      platform: r.platform,
      handle: r.handle,
      profileUrl: r.profileUrl,
      details: r.details,
      status: r.status,
      resolution: r.resolution,
      createdAt: r.createdAt,
      realHandle: r.realHandle,
    })),
  });
}));

router.post('/', reportLimiter, validate(createSchema), asyncHandler(async (req, res) => {
  const { realHandleId, profileUrl, details } = req.body;

  const real = await prisma.handle.findFirst({
    where: { id: realHandleId, userId: req.user.id, status: 'VERIFIED' },
  });
  if (!real) {
    return res.status(400).json({ error: 'You can only report on behalf of one of your verified handles.' });
  }

  const parsed = parseProfileUrl(profileUrl);
  if (parsed.error) return res.status(400).json({ error: parsed.error });
  const normalized = parsed.handle.toLowerCase();

  const own = await prisma.handle.findFirst({
    where: { userId: req.user.id, platform: parsed.platform, normalized },
  });
  if (own) return res.status(400).json({ error: 'That is your own profile.' });

  const duplicate = await prisma.report.findFirst({
    where: { reporterId: req.user.id, platform: parsed.platform, normalized, status: { in: ['OPEN', 'CONFIRMED'] } },
  });
  if (duplicate) return res.status(409).json({ error: 'You already reported this profile.' });

  const openCount = await prisma.report.count({ where: { reporterId: req.user.id, status: 'OPEN' } });
  if (openCount >= MAX_OPEN) {
    return res.status(429).json({ error: `You have ${MAX_OPEN} reports waiting for review. Please wait for a decision.` });
  }

  const reported = await prisma.handle.findFirst({
    where: { platform: parsed.platform, normalized, userId: { not: req.user.id } },
    orderBy: { createdAt: 'desc' },
  });

  const report = await prisma.report.create({
    data: {
      reporterId: req.user.id,
      realHandleId: real.id,
      reportedHandleId: reported ? reported.id : null,
      platform: parsed.platform,
      handle: parsed.handle,
      normalized,
      profileUrl: parsed.profileUrl,
      details,
    },
  });
  res.status(201).json({ report: { id: report.id, status: report.status } });
}));

module.exports = router;