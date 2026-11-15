// Exercise the same authenticated function and signed downloads used by the app.
require('@expo/env').load(process.cwd());
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
(async () => {
  const dir = 'output/everyday-cinema-next-90/final';
  const first = JSON.parse(await fs.readFile('output/everyday-cinema-fixed-layout/manifest.json', 'utf8')).files;
  const rest = JSON.parse(await fs.readFile(dir + '/manifest.json', 'utf8')).assets;
  const client = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error } = await client.auth.signInAnonymously();
  if (error || !auth.session) throw new Error('Anonymous auth failed: ' + error?.message);
  const items = [...first, ...rest];
  const rows = [];
  for (let start = 0; start < items.length; start += 4) {
    await Promise.all(items.slice(start, start + 4).map(async item => {
      const file = item.webpFile.split('/').pop();
      const themeId = 'everyday-cinema-' + file.replace(/\.webp$/, '');
      const { data, error } = await client.functions.invoke('calendar-theme', { body: { themeId, revision: 'everyday-cinema-v2' } });
      if (error || data?.themeId !== themeId || data?.revision !== 'everyday-cinema-v2') throw new Error('Function failed: ' + themeId + ' ' + error?.message);
      const url = data.files?.find(x => x.name === 'background.webp')?.url;
      if (!url || !decodeURIComponent(new URL(url).pathname).endsWith('/calendar-themes/everyday-cinema/20261112-v2/' + file)) throw new Error('Wrong download route: ' + themeId);
      const response = await fetch(url, { headers: { 'Cache-Control': 'no-store' } });
      if (!response.ok) throw new Error('Download HTTP ' + response.status + ': ' + themeId);
      const bytes = Buffer.from(await response.arrayBuffer());
      const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      if (sha256 !== item.webpSha256) throw new Error('Signed download hash mismatch: ' + themeId);
      rows.push({ themeId, status: response.status, sha256, bytes: bytes.length });
    }));
    console.log(`${rows.length}/100 API downloads verified`);
  }
  await fs.writeFile(dir + '/download-api-verification.json', JSON.stringify({ count: rows.length, passed: true, files: rows }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
