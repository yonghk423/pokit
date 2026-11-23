// Runs the actual Edge Function handlers with isolated Apple verification and storage fixtures.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
let checks = 0;
const assetPaths = new Map();
function recordAssets(bucket, paths) { for (const objectPath of paths) assetPaths.set(`${bucket}/${objectPath}`, { bucket, path: objectPath }); }
const compiled = new Map();
function compile(file) {
  if (!compiled.has(file)) compiled.set(file, ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
  return compiled.get(file);
}
function readData(file) {
  const exports = {};
  vm.runInNewContext(compile(path.resolve(file)), { exports });
  return Object.values(exports)[0];
}
async function run(name, body, scenario, expected) {
  let handler, storageCalls = 0, lookups = 0;
  const admin = {
    storage: { from: bucket => ({
      list: async () => { storageCalls++; return { data: [{ name: 'p7-1.webp' }] }; },
      download: async () => { storageCalls++; return { data: { text: async () => '{}', arrayBuffer: async () => new ArrayBuffer(1) } }; },
      createSignedUrl: async objectPath => { storageCalls++; recordAssets(bucket, [objectPath]); return { data: { signedUrl: 'https://example.test/file' } }; },
      createSignedUrls: async paths => { storageCalls++; recordAssets(bucket, paths); return { data: paths.map(() => ({ signedUrl: 'https://example.test/file' })) }; },
    }) },
  };
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const mod = { exports: {} }; cache.set(file, mod.exports);
    const code = compile(file);
    vm.runInNewContext(code, {
      exports: mod.exports, module: mod, Request, Response, AbortSignal, console, btoa,
      fetch: async () => { throw new Error('Unexpected network call in isolated handler test'); },
      Deno: { serve: fn => { handler = fn; }, env: { get: () => 'fixture' } },
      require: id => {
        if (id.endsWith('/applePurchaseAccess.ts')) {
          const check = environment => async proofs => {
            lookups++;
            assert.deepEqual(proofs, ['signed-fixture']);
            assert.equal(environment, name.endsWith('-sandbox') ? 'Sandbox' : 'Production');
            if (scenario === 'active') return null;
            if (scenario === 'unavailable') return { status: 503, error: 'subscription_verification_unavailable' };
            return { status: 403, error: 'subscription_required' };
          };
          return { checkApplePurchaseAccess: check('Production'), checkSandboxPurchaseAccess: check('Sandbox') };
        }
        return id.startsWith('npm:') ? { createClient: () => admin } : load(path.resolve(path.dirname(file), id));
      },
    }, { filename: file });
    return mod.exports;
  }
  load(path.resolve('supabase/functions', name, 'index.ts'));
  const response = await handler(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, signedTransactions: ['signed-fixture'], userId: 'forged-user', isPro: true }) }));
  assert.equal(response.status, expected, `${name} ${scenario}: ${await response.clone().text()}`);
  if (expected !== 200) assert.equal(storageCalls, 0, `${name}: must not access storage before authorization`);
  if (scenario === 'free') assert.equal(lookups, 0);
  else assert.equal(lookups, 1);
  checks++;
}
(async () => {
  const paid = [
    ['store-download', { id: 'camera-kodak-mini-shot' }],
    ['calendar-store', { id: 'camera-kodak-mini-shot' }],
    ['character-pack', { action: 'download' }],
    ['calendar-theme', { themeId: 'everyday-cinema-01-platform', revision: 'everyday-cinema-v2' }],
    ['calendar-artwork-download', { styleId: 'textured-watercolor' }],
  ];
  // Enumerate the actual server catalogs so every paid item follows the same gate.
  const diaryIds = [...readData('supabase/functions/calendar-store/proDiaryIds.ts')];
  const storeIds = [...diaryIds, 'sunshine-yellow', 'lemon-slice', 'kissing-shadows', 'daylight-cassette', 'mint-sneakers', 'camera-mini-12', 'camera-kodak-mini-shot', ...['ash','canvas','charcoal','leather','pink','rattan','steel','vintage','walnut'].map(id => `trash-${id}`)];
  const themes = [];
  for (const [file, revision] of [['seasonCollectionFiles', null], ['seasonWinterFiles','season-winter-v2'], ['texturedWatercolorFiles','textured-watercolor-v2'], ['everydayCinemaFiles','everyday-cinema-v2'], ['warmSepiaFiles','warm-sepia-open-panel-v2'], ['citypopRetroFiles','citypop-retro-v1']]) {
    for (const [themeId, value] of Object.entries(readData(`supabase/functions/calendar-theme/${file}.ts`))) {
      themes.push(['calendar-theme', { themeId, revision: file === 'seasonCollectionFiles' ? `season-${value.season}-v1` : themeId === 'textured-watercolor-01-fly-kite' ? 'textured-watercolor-v1' : revision }]);
    }
  }
  const allPaid = [...storeIds.map(id => ['calendar-store', { id, format: 2 }]), ...themes];
  console.log(`Catalog: ${diaryIds.length} diary items, ${storeIds.length - diaryIds.length} other store items, ${themes.length} illustration scenes`);
  for (const suffix of ['', '-sandbox']) {
    for (const [name, body] of allPaid) {
      for (const [scenario, expected] of [['denied',403], ['unavailable',503], ['active',200]]) await run(name + suffix, body, scenario, expected);
    }
  }
  for (const suffix of ['', '-sandbox']) {
    for (const [name, body] of paid)
      for (const [scenario, expected] of [['denied',403], ['unavailable',503], ['active',200]])
        await run(name + suffix, body, scenario, expected);
    await run('calendar-store' + suffix, { id: 'weather' }, 'free', 200);
    await run('character-pack' + suffix, { action: 'preview' }, 'free', 200);
    await run('calendar-theme' + suffix, { themeId: '01-rush-hour-commute' }, 'free', 200);
  }
  console.log(`${checks} server authorization checks passed`);
  const manifestIndex = process.argv.indexOf('--asset-manifest');
  if (manifestIndex >= 0) {
    assert(process.argv[manifestIndex + 1], 'manifest output path required');
    fs.writeFileSync(process.argv[manifestIndex + 1], JSON.stringify([...assetPaths.values()], null, 2) + '\n');
    console.log(`${assetPaths.size} unique fixture-resolved asset paths recorded (not a live storage check)`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
