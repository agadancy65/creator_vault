const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const config = require('./config');
const authRoutes = require('./routes/auth');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// serve the existing frontend from the repo root, but never expose backend code or secrets
const frontendRoot = path.join(__dirname, '..', '..');
const blocked = /^\/(server|node_modules|\.git)(\/|$)/i;
app.use((req, res, next) => (blocked.test(req.path) ? res.status(404).end() : next()));
app.use(express.static(frontendRoot));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(config.port, () => {
  console.log(`Provenly running on http://localhost:${config.port}`);
});