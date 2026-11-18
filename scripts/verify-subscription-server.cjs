// Runs the actual Edge Function handlers with isolated auth, RevenueCat and storage fixtures.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
let checks = 0;
async function run(name, body, scenario, expected) {
  let handler, storageCalls = 0, lookups = 0;
  const admin = {
    auth: { getUser: async () => ({ data: { user: scenario === 'unauthorized' ? null : { id: 'verified-user' } } }) },
    storage: { from: () => ({
      list: async () => { storageCalls++; return { data: [{ name: 'p7-1.webp' }] }; },
      download: async () => { storageCalls++; return { data: { text: async () => '{}', arrayBuffer: async () => new ArrayBuffer(1) } }; },
      createSignedUrl: async () => { storageCalls++; return { data: { signedUrl: 'https://example.test/file' } }; },
      createSignedUrls: async paths => { storageCalls++; return { data: paths.map(() => ({ signedUrl: 'https://example.test/file' })) }; },
    }) },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const mod = { exports: {} }; cache.set(file, mod.exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInNewContext(code, {
      exports: mod.exports, module: mod, Request, Response, AbortSignal, console, btoa,
      Deno: { serve: fn => { handler = fn; }, env: { get: key => key === 'REVENUECAT_SECRET_API_KEY' && scenario === 'missing-key' ? undefined : 'fixture' } },
      fetch: async url => {
        lookups++; assert.match(url, /customers\/verified-user\/active_entitlements/);
        assert.ok(!url.includes('forged-user'));
        if (scenario === 'network-error') throw new Error('offline');
        if (scenario === 'not-found') return new Response('{}', { status: 404 });
        if (scenario === 'upstream-error') return new Response('{}', { status: 500 });
        if (scenario === 'malformed') return Response.json({});
        const item = { entitlement_id: scenario === 'other' ? 'unrelated' : scenario === 'legacy' ? 'entl6dedc07f76' : 'entld55880b331', expires_at: scenario === 'expired' ? Date.now() - 1000 : Date.now() + 60000 };
        return Response.json({ items: scenario === 'none' ? [] : [item] });
      },
      require: id => id.startsWith('npm:') ? { createClient: () => admin } : load(path.resolve(path.dirname(file), id)),
    }, { filename: file });
    return mod.exports;
  }
  load(path.resolve('supabase/functions', name, 'index.ts'));
  const response = await handler(new Request('https://example.test', { method: 'POST', headers: { Authorization: 'Bearer fixture', 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, userId: 'forged-user', isPro: true }) }));
  assert.equal(response.status, expected, `${name} ${scenario}: ${await response.clone().text()}`);
  if (expected !== 200) assert.equal(storageCalls, 0, `${name}: must not access storage before authorization`);
  if (scenario === 'unauthorized') assert.equal(lookups, 0);
  checks++;
}
(async () => {
  const paid = [
    ['calendar-store', { id: 'camera-kodak-mini-shot' }],
    ['character-pack', { action: 'download' }],
    ['calendar-theme', { themeId: 'everyday-cinema-01-platform', revision: 'everyday-cinema-v2' }],
    ['calendar-artwork-download', { styleId: 'textured-watercolor' }],
  ];
  for (const [name, body] of paid) for (const [scenario, expected] of [['unauthorized',401],['none',403],['other',403],['expired',403],['not-found',403],['missing-key',503],['network-error',503],['upstream-error',503],['malformed',503],['active',200],['legacy',200]]) await run(name, body, scenario, expected);
  await run('calendar-store', { id: 'weather' }, 'missing-key', 200);
  await run('character-pack', { action: 'preview' }, 'missing-key', 200);
  await run('calendar-theme', { themeId: '01-rush-hour-commute' }, 'missing-key', 200);
  console.log(`${checks} server authorization checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
