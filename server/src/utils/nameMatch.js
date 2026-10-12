function tokens(s) {
  return String(s)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

// Tolerant on order and extra names ("Joseph Agada" matches "AGADA JOSEPH OJOCHENEMI"),
// but needs at least two names in common.
function namesMatch(registeredName, bankName) {
  const a = new Set(tokens(registeredName));
  const b = new Set(tokens(bankName));
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared >= 2;
}

module.exports = { namesMatch };