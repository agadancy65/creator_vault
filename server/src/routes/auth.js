const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');

const config = require('../config');
const prisma = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const validate = require('../middleware/validate');
const { authLimiter, codeLimiter } = require('../middleware/rateLimit');
const { requireAuth } = require('../middleware/auth');
const { issueCode, consumeCode } = require('../utils/codes');

const router = express.Router();

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');
const code = z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits');

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email,
  password,
  role: z.enum(['creator', 'organization'], { message: 'Choose creator or organization' }),
});
const verifySchema = z.object({ email, code });
const emailOnlySchema = z.object({ email });
const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password').max(72) });
const resetSchema = z.object({ email, code, newPassword: password });

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role.toLowerCase(),
  emailVerified: u.emailVerified,
});

function startSession(res, user) {
  const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: `${config.sessionDays}d`,
  });
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  });
}

const codeFailure = (res, reason) => {
  if (reason === 'locked') return res.status(429).json({ error: 'Too many wrong attempts. Request a new code.' });
  if (reason === 'expired') return res.status(400).json({ error: 'Code expired. Request a new one.' });
  return res.status(400).json({ error: 'Incorrect code.' });
};

router.post('/signup', authLimiter, validate(signupSchema), asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing && existing.emailVerified) {
    return res.status(409).json({ error: 'An account with this email already exists. Try logging in.' });
  }

  const user = existing
    ? await prisma.user.update({ where: { email }, data: { name, passwordHash, role: role.toUpperCase() } })
    : await prisma.user.create({ data: { name, email, passwordHash, role: role.toUpperCase() } });

  await issueCode(user, 'EMAIL_VERIFY');
  res.status(201).json({ message: 'Account created. Check your email for a 6-digit code.', email: user.email });
}));

router.post('/verify-email', codeLimiter, validate(verifySchema), asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'Incorrect code.' });
  if (user.emailVerified) return res.status(400).json({ error: 'Email already verified. Please log in.' });

  const result = await consumeCode(user, 'EMAIL_VERIFY', code);
  if (!result.ok) return codeFailure(res, result.reason);

  const verified = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  startSession(res, verified);
  res.json({ message: 'Email verified.', user: publicUser(verified) });
}));

router.post('/resend-code', codeLimiter, validate(emailOnlySchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (user && !user.emailVerified) await issueCode(user, 'EMAIL_VERIFY');
  res.json({ message: 'If that account needs verification, a new code has been sent.' });
}));

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Incorrect email or password.' });

  if (!user.emailVerified) {
    await issueCode(user, 'EMAIL_VERIFY');
    return res.status(403).json({
      error: 'Please verify your email. We sent you a new code.',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
  }

  startSession(res, user);
  res.json({ user: publicUser(user) });
}));

router.post('/logout', (req, res) => {
  res.clearCookie(config.cookieName, { httpOnly: true, sameSite: 'lax', secure: config.isProd });
  res.json({ message: 'Logged out.' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

router.post('/forgot-password', codeLimiter, validate(emailOnlySchema), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email } });
  if (user && user.emailVerified) await issueCode(user, 'PASSWORD_RESET');
  res.json({ message: 'If that email is registered, a reset code has been sent.' });
}));

router.post('/reset-password', codeLimiter, validate(resetSchema), asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: 'Incorrect code.' });

  const result = await consumeCode(user, 'PASSWORD_RESET', code);
  if (!result.ok) return codeFailure(res, result.reason);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12), emailVerified: true },
  });
  res.json({ message: 'Password updated. You can now log in.' });
}));

module.exports = router;