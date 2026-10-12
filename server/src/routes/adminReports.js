const express = require('express');
const { z } = require('zod');

const prisma = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('ADMIN'));

const STATUSES = ['OPEN', 'CONFIRMED', 'DISMISSED'];

router.get('/', asyncHandler(async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : 'OPEN';
  const reports = await prisma.report.findMany({
    where: { status },
    orderBy: { createdAt: 'asc' },
    include: {
      reporter: { select: { name: true, email: true } },
      realHandle: {
        select: { platform: true, handle: true, profileUrl: true, user: { select: { name: true } } },
      },
      reportedHandle: {
        select: { platform: true, handle: true, status: true, user: { select: { name: true, email: true } } },
      },
    },
  });
  res.json({ reports });
}));

const confirmSchema = z.object({ note: z.string().trim().max(500).optional() });
const dismissSchema = z.object({ note: z.string().trim().min(3, 'Add a short reason').max(500) });

router.post('/:id/confirm', validate(confirmSchema), asyncHandler(async (req, res) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: { reportedHandle: true },
  });
  if (!report || report.status !== 'OPEN') {
    return res.status(400).json({ error: 'Only open reports can be confirmed.' });
  }

  const now = new Date();
  const ops = [
    prisma.report.update({
      where: { id: report.id },
      data: { status: 'CONFIRMED', resolution: req.body.note || null, resolvedById: req.user.id, resolvedAt: now },
    }),
  ];

  const h = report.reportedHandle;
  if (h && h.status === 'VERIFIED') {
    ops.push(
      prisma.handle.update({
        where: { id: h.id },
        data: { status: 'REVOKED', reviewNote: 'Confirmed impersonation report', reviewedById: req.user.id, reviewedAt: now },
      })
    );
  } else if (h && (h.status === 'PENDING_REVIEW' || h.status === 'PENDING_PROOF')) {
    ops.push(
      prisma.handle.update({
        where: { id: h.id },
        data: { status: 'REJECTED', reviewNote: 'Confirmed impersonation report', reviewedById: req.user.id, reviewedAt: now },
      }),
      prisma.dispute.updateMany({
        where: { newHandleId: h.id, status: 'OPEN' },
        data: { status: 'RESOLVED', resolution: 'REJECTED', resolvedById: req.user.id, resolvedAt: now },
      })
    );
  }

  await prisma.$transaction(ops);
  res.json({ message: 'Report confirmed.' });
}));

router.post('/:id/dismiss', validate(dismissSchema), asyncHandler(async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report || report.status !== 'OPEN') {
    return res.status(400).json({ error: 'Only open reports can be dismissed.' });
  }
  await prisma.report.update({
    where: { id: report.id },
    data: { status: 'DISMISSED', resolution: req.body.note, resolvedById: req.user.id, resolvedAt: new Date() },
  });
  res.json({ message: 'Report dismissed.' });
}));

module.exports = router;