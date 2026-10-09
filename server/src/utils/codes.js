const crypto = require('crypto');
const config = require('../config');
const prisma = require('../db');
const { sendMail, codeEmail } = require('../mailer');

const LABELS = { EMAIL_VERIFY: 'email verification', PASSWORD_RESET: 'password reset' };

function generateCode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashCode(userId, purpose, code) {
  return crypto.createHmac('sha256', config.codePepper).update(`${userId}:${purpose}:${code}`).digest('hex');
}

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

async function issueCode(user, purpose) {
  const last = await prisma.verificationCode.findFirst({
    where: { userId: user.id, purpose },
    orderBy: { createdAt: 'desc' },
  });
  if (last && Date.now() - last.createdAt.getTime() < config.code.resendCooldownSeconds * 1000) {
    return { sent: false, reason: 'cooldown' };
  }

  await prisma.verificationCode.updateMany({
    where: { userId: user.id, purpose, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateCode();
  await prisma.verificationCode.create({
    data: {
      userId: user.id,
      purpose,
      codeHash: hashCode(user.id, purpose, code),
      expiresAt: new Date(Date.now() + config.code.ttlMinutes * 60 * 1000),
    },
  });

  const { text, html } = codeEmail({
    name: user.name,
    code,
    purposeLabel: LABELS[purpose],
    minutes: config.code.ttlMinutes,
  });
  await sendMail({ to: user.email, subject: `Your Provenly ${LABELS[purpose]} code`, text, html });
  return { sent: true };
}

async function consumeCode(user, purpose, submitted) {
  const record = await prisma.verificationCode.findFirst({
    where: { userId: user.id, purpose, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!record || record.expiresAt < new Date()) return { ok: false, reason: 'expired' };
  if (record.attempts >= config.code.maxAttempts) return { ok: false, reason: 'locked' };

  const match = safeEqual(record.codeHash, hashCode(user.id, purpose, submitted));
  if (!match) {
    await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, reason: 'invalid' };
  }
  await prisma.verificationCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return { ok: true };
}

module.exports = { issueCode, consumeCode };