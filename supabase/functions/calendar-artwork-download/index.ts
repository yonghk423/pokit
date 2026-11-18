import { checkProAccess } from '../_shared/proAccess.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Content-Type': 'application/json',
};

const styleAssets: Record<string, { revision: string; path: string; downloadName: string }> = {
  'textured-watercolor': {
    revision: '20261112-v1',
    path: 'calendar-themes/textured-watercolor/20261112-v1/01-fly-kite-v2.webp',
    downloadName: 'textured-watercolor-background.webp',
  },
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return new Response('{}', { status: 405, headers });

  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const accessToken = request.headers.get('Authorization')?.replace(/^Bearer /i, '') ?? '';
    const { data, error } = await admin.auth.getUser(accessToken);
    if (error || !data.user) return new Response('{}', { status: 401, headers });

    const body = await request.json().catch(() => ({}));
    const asset = typeof body.styleId === 'string' ? styleAssets[body.styleId] : undefined;
    if (!asset) return new Response(JSON.stringify({ error: 'invalid_style' }), { status: 400, headers });

    const access = await checkProAccess(data.user.id, Deno.env.get('REVENUECAT_SECRET_API_KEY'), Deno.env.get('REVENUECAT_DAYLIGHT_PRO_ENTITLEMENT_ID'));
    if (access) return new Response(JSON.stringify({ error: access.error }), { status: access.status, headers });

    const { data: signed, error: signingError } = await admin.storage
      .from('character-illustrations')
      .createSignedUrl(asset.path, 3600, { download: asset.downloadName });
    if (signingError || !signed?.signedUrl) throw signingError;

    return new Response(JSON.stringify({
      styleId: body.styleId,
      revision: asset.revision,
      file: { name: asset.downloadName, url: signed.signedUrl, expiresIn: 3600 },
    }), { headers });
  } catch {
    return new Response('{}', { status: 503, headers });
  }
});
