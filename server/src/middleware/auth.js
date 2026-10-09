const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../db');

async function requireAuth(req, res, next) {
  const token = req.cookies[config.cookieName];
  if (!token) return res.status(401).json({ error: 'Not signed in' });

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Not signed in' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.emailVerified) return res.status(401).json({ error: 'Not signed in' });
    req.user = user;
    next();
  } catch (err) {
    next(err); // database trouble is a 500, not "logged out"
  }
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

module.exports = { requireAuth, requireRole };