// Read-only smoke checks against a deployed server. Never prints keys, proofs or signed URLs.
const fs = require('node:fs');
const { parseEnv } = require('node:util');
const assert = require('node:assert/strict');

const env = Object.assign({}, ...['.env', '.env.local'].map(file =>
  fs.existsSync(file) ? parseEnv(fs.readFileSync(file, 'utf8')) : {}), process.env);
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(url && key, 'Supabase public configuration is required');
const paid = [
  ['store-download', { id: 'sunshine-yellow', format: 2 }],
  ['calendar-store', { id: 'sunshine-yellow', format: 2 }],
  ['calendar-theme', { themeId: 'textured-watercolor-01-fly-kite', revision: 'textured-watercolor-v1' }],
  ['calendar-artwork-download', { styleId: 'textured-watercolor' }],
  ['character-pack', { action: 'download' }],
];
async function request(name, body) {
  const suffix = env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT === 'Sandbox' ? '-sandbox' : '';
  const response = await fetch(`${url}/functions/v1/${name}${suffix}`, {
    method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, data: await response.json() };
}
async function main() {
  let count = 0;
  for (const [name, body] of paid) {
    for (const [label, extra] of [
      ['missing proof', {}],
      ['forged proof', { signedTransactions: ['eyJhbGciOiJFUzI1NiJ9.eyJwcm9kdWN0SWQiOiJtb250aGx5In0.fake'] }],
      ['client Pro claim', { isPro: true, appUserID: '$RCAnonymousID:untrusted' }],
    ]) {
      const result = await request(name, { ...body, ...extra });
      assert.equal(result.status, 403, `${name}: ${label}`);
      assert.equal(result.data.error, 'subscription_required', `${name}: ${label}`);
      count++;
    }
    console.log(`PASS ${name}: missing/forged proof and client Pro claims denied`);
  }
  for (const [name, body] of [
    ['calendar-store', { id: 'silver-ring', format: 2 }],
    ['calendar-theme', { themeId: '01-rush-hour-commute' }],
    ['character-pack', { action: 'preview' }],
  ]) {
    const result = await request(name, body);
    assert.equal(result.status, 200, `${name}: free content`);
    if (result.data.files?.length) {
      const file = await fetch(result.data.files[0].url, { signal: AbortSignal.timeout(30000) });
      assert.equal(file.status, 200, `${name}: signed free asset`);
      assert((await file.arrayBuffer()).byteLength > 0, `${name}: nonempty asset`);
    } else assert(result.data.paper, `${name}: free calendar metadata`);
    count++;
    console.log(`PASS ${name}: free content accessible without a user session`);
  }
  console.log(`${count} live checks passed. A real Apple purchase/restore is still required to test authorized paid downloads.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
