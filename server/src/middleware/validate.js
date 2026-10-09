module.exports = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const first = result.error.issues[0];
    return res.status(400).json({ error: first ? first.message : 'Invalid input' });
  }
  req.body = result.data;
  next();
};