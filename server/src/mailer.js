const nodemailer = require('nodemailer');
const config = require('./config');

const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    if (config.isProd) throw new Error('SMTP is not configured');
    console.log(`\n[DEV EMAIL] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, text, html });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function codeEmail({ name, code, purposeLabel, minutes }) {
  const text = `Hi ${name},\n\nYour Provenly ${purposeLabel} code is: ${code}\n\nIt expires in ${minutes} minutes. If you did not request this, ignore this email.\n`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
    <h2>Provenly</h2>
    <p>Hi ${escapeHtml(name)},</p>
    <p>Your ${purposeLabel} code is:</p>
    <p style="font-size:32px;letter-spacing:6px;font-weight:bold">${code}</p>
    <p>It expires in ${minutes} minutes. If you did not request this, you can ignore this email.</p>
  </div>`;
  return { text, html };
}

module.exports = { sendMail, codeEmail };