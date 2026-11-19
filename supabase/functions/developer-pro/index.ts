import { createClient } from 'npm:@supabase/supabase-js@2';
import { activateDeveloperPro } from '../_shared/developerPro.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = request.headers.get('Authorization')?.replace(/^Bearer /i, '') ?? '';
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return json({ error: 'unauthorized' }, 401);
    // No client-supplied ID, simulator flag, device name or secret can authorize a grant.
    return json(await activateDeveloperPro(data.user.id, {
      allowlist: Deno.env.get('DAYLIGHT_DEVELOPER_PRO_USER_IDS'),
      readKey: Deno.env.get('REVENUECAT_SECRET_API_KEY'),
      grantKey: Deno.env.get('REVENUECAT_DEVELOPER_GRANT_KEY'),
    }));
  } catch {
    return json({ error: 'developer_pro_unavailable' }, 503);
  }
});
