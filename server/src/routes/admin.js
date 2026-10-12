const express = require('express');
const { z } = require('zod');

const prisma = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

const STATUSES = ['PENDING_PROOF', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'REVOKED'];

router.get('/handles', asyncHandler(async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : 'PENDING_REVIEW';
  const handles = await prisma.handle.findMany({
    where: { status },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
      newDisputes: {
        where: { status: 'OPEN' },
        include: {
          existingHandle: {
            select: { id: true, platform: true, handle: true, profileUrl: true, user: { select: { name: true } } },
          },
        },
      },
    },
  });
  res.json({ handles });
}));

// Given a code seen in a bio, shows which claim it was issued for.
router.get('/code-lookup', asyncHandler(async (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase();
  if (!/^CV-[A-Z0-9]{8}$/.test(code)) {
    return res.status(400).json({ error: 'Enter a code like CV-K7M2QX4P.' });
  }
  const handle = await prisma.handle.findFirst({
    where: { proofCode: code },
    include: { user: { select: { name: true } } },
  });
  if (!handle) return res.json({ found: false });
  res.json({
    found: true,
    handle: {
      platform: handle.platform,
      handle: handle.handle,
      profileUrl: handle.profileUrl,
      status: handle.status,
      user: handle.user,
    },
  });
}));

const approveSchema = z.object({
  level: z.number().int().min(1).max(2).optional(),
  note: z.string().trim().max(500).optional(),
});

router.post('/handles/:id/approve', validate(approveSchema), asyncHandler(async (req, res) => {
  const handle = await prisma.handle.findUnique({ where: { id: req.params.id } });
  if (!handle || handle.status !== 'PENDING_REVIEW') {
    return res.status(400).json({ error: 'Only handles in the review queue can be approved.' });
  }

  const holder = await prisma.handle.findFirst({
    where: {
      id: { not: handle.id },
      platform: handle.platform,
      normalized: handle.normalized,
      status: 'VERIFIED',
    },
  });
  if (holder) {
    return res.status(409).json({ error: 'Another creator already holds this exact handle. Revoke that one first.' });
  }

  const payout = await prisma.payoutAccount.findUnique({ where: { userId: handle.userId } });
  const level = Math.max(req.body.level || 1, payout ? 2 : 1);

  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.handle.update({
      where: { id: handle.id },
      data: {
        status: 'VERIFIED',
                level,
        reviewNote: req.body.note || null,
        reviewedById: req.user.id,
        reviewedAt: now,
        verifiedAt: now,
      },
    }),
    prisma.dispute.updateMany({
      where: { newHandleId: handle.id, status: 'OPEN' },
      data: { status: 'RESOLVED', resolution: 'APPROVED', resolvedById: req.user.id, resolvedAt: now },
    }),
  ]);
  res.json({ handle: updated });
}));

const noteSchema = z.object({ note: z.string().trim().min(3, 'Add a short reason').max(500) });

router.post('/handles/:id/reject', validate(noteSchema), asyncHandler(async (req, res) => {
  const handle = await prisma.handle.findUnique({ where: { id: req.params.id } });
  if (!handle || handle.status !== 'PENDING_REVIEW') {
    return res.status(400).json({ error: 'Only handles in the review queue can be rejected.' });
  }

  const now = new Date();
  const [updated] = await prisma.$transaction([
    prisma.handle.update({
      where: { id: handle.id },
      data: { status: 'REJECTED', reviewNote: req.body.note, reviewedById: req.user.id, reviewedAt: now },
    }),
    prisma.dispute.updateMany({
      where: { newHandleId: handle.id, status: 'OPEN' },
      data: { status: 'RESOLVED', resolution: 'REJECTED', resolvedById: req.user.id, resolvedAt: now },
    }),
  ]);
  res.json({ handle: updated });
}));

router.post('/handles/:id/revoke', validate(noteSchema), asyncHandler(async (req, res) => {
  const handle = await prisma.handle.findUnique({ where: { id: req.params.id } });
  if (!handle || handle.status !== 'VERIFIED') {
    return res.status(400).json({ error: 'Only verified handles can be revoked.' });
  }
  const updated = await prisma.handle.update({
    where: { id: handle.id },
    data: { status: 'REVOKED', reviewNote: req.body.note, reviewedById: req.user.id, reviewedAt: new Date() },
  });
  res.json({ handle: updated });
}));

module.exports = router;