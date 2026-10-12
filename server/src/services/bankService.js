// MOCK of a bank "name enquiry" service, shaped like Ecobank's account validation.
// To go live, replace the body of resolveAccount() with the real API call.
// Test accounts: edit the names so the first one matches the name your test creator signed up with.
const MOCK_ACCOUNTS = {
  ECOBANK: {
    '0123456789': 'AGADA JOSEPH',
    '0123456790': 'DAUDA ELIZABETH ITINE',
    '0123456791': 'UGWUMBA AGBAEZE OKORO',
    '0123456792': 'FADUMILA EMMANUEL',
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function resolveAccount(bank, accountNumber) {
  await sleep(500); // simulates network time
  const name = (MOCK_ACCOUNTS[bank] || {})[accountNumber];
  return name ? { found: true, accountName: name } : { found: false };
}

module.exports = { resolveAccount, isMock: true };