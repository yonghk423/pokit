import { createClient } from 'npm:@supabase/supabase-js@2';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = request.headers.get('Authorization')?.replace(/^Bearer /i, '') ?? '';
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'unauthorized' }, 401);
    const { action } = await request.json();
    if (action !== 'preview' && action !== 'download') return json({ error: 'invalid_action' }, 400);
    if (action === 'download') {
      const secret = Deno.env.get('REVENUECAT_SECRET_API_KEY');
      if (!secret) return json({ error: 'subscription_verification_unavailable' }, 503);
      // Identity comes exclusively from the verified Supabase JWT.
      const response = await fetch(`https://api.revenuecat.com/v2/projects/proj12204b57/customers/${encodeURIComponent(data.user.id)}/active_entitlements?limit=100`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15000) });
      if (response.status === 404) return json({ error: 'subscription_required' }, 403);
      if (!response.ok) return json({ error: 'subscription_verification_unavailable' }, 503);
      const customer = await response.json();
      // RevenueCat V2 uses the immutable entitlement ID for yourday_pro.
      const entitlement = customer.items?.find((item: { entitlement_id: string; expires_at: number | null }) => item.entitlement_id === 'entl6dedc07f76');
      if (!entitlement || (entitlement.expires_at !== null && !(entitlement.expires_at > Date.now()))) return json({ error: 'subscription_required' }, 403);
    }
    const storage = admin.storage.from('character-illustrations');
    const prefix = 'protagonist-7/card-960';
    const { data: objects, error: listError } = await storage.list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (listError) throw listError;
    const files = (objects ?? []).filter(file => /^p7-[0-9]+[.]webp$/.test(file.name));
    if (!files.length) return json({ error: 'pack_unavailable' }, 404);
    const selected = action === 'preview' ? files.slice(0, 1) : files;
    const { data: signed, error: signError } = await storage.createSignedUrls(selected.map(file => `${prefix}/${file.name}`), 3600);
    if (signError || !signed || signed.some(file => !file.signedUrl)) throw signError ?? new Error('sign_failed');
    return json({ count: files.length, files: selected.map((file, i) => ({ name: file.name, url: signed[i].signedUrl })) });
  } catch { return json({ error: 'pack_unavailable' }, 503); }
});
