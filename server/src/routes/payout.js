const express = require('express');
const { z } = require('zod');

const prisma = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/auth');
const { payoutLimiter } = require('../middleware/rateLimit');
const { resolveAccount, isMock } = require('../services/bankService');
const { namesMatch } = require('../utils/nameMatch');

const router = express.Router();
router.use(requireAuth, requireRole('CREATOR'));

const mask = (n) => '••••••' + n.slice(-4);
const toDto = (p) => ({
  bank: p.bank,
  accountNumberMasked: mask(p.accountNumber),
  accountName: p.accountName,
  verifiedAt: p.verifiedAt,
});

const saveSchema = z.object({
  bank: z.enum(['ECOBANK'], { errorMap: () => ({ message: 'Choose a supported bank.' }) }),
  accountNumber: z.string().trim().regex(/^\d{10}$/, 'Account numbers are exactly 10 digits.'),
});

router.get('/', asyncHandler(async (req, res) => {
  const payout = await prisma.payoutAccount.findUnique({ where: { userId: req.user.id } });
  res.json({ payout: payout ? toDto(payout) : null, registeredName: req.user.name, mock: isMock });
}));

router.post('/', payoutLimiter, validate(saveSchema), asyncHandler(async (req, res) => {
  const { bank, accountNumber } = req.body;

  const result = await resolveAccount(bank, accountNumber);
  if (!result.found) {
    return res.status(404).json({ error: 'We could not find that account. Check the bank and the account number.' });
  }

  // On a mismatch we do not reveal the name on the account, only that it does not match.
  if (!namesMatch(req.user.name, result.accountName)) {
    return res.status(422).json({
      error: `This account is not in your name. The account holder must match "${req.user.name}", the name you registered with.`,
    });
  }

  const [payout] = await prisma.$transaction([
    prisma.payoutAccount.upsert({
      where: { userId: req.user.id },
      update: { bank, accountNumber, accountName: result.accountName, verifiedAt: new Date() },
      create: { userId: req.user.id, bank, accountNumber, accountName: result.accountName },
    }),
    prisma.handle.updateMany({
      where: { userId: req.user.id, status: 'VERIFIED' },
      data: { level: 2 },
    }),
  ]);

  res.json({ payout: toDto(payout), message: 'Account verified. Your verified handles are now Level 2.' });
}));

router.delete('/', asyncHandler(async (req, res) => {
  await prisma.$transaction([
    prisma.payoutAccount.deleteMany({ where: { userId: req.user.id } }),
    prisma.handle.updateMany({
      where: { userId: req.user.id, status: 'VERIFIED' },
      data: { level: 1 },
    }),
  ]);
  res.json({ message: 'Payout account removed.' });
}));

module.exports = router;