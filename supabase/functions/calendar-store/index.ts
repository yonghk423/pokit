import { checkProAccess } from '../_shared/proAccess.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { proDiaryIds } from './proDiaryIds.ts';
import { proDiaryFolders } from './proDiaryFolders.ts';
// These calendar designs stay free even when paid diary items resume.
const freeCalendarIds = new Set(['silver-ring', 'mint-glass', 'leather-folio', 'soft-mint', 'mint-planner', 'spiral-plan', 'kraft-clip', 'ivory-paper', 'berry-purple', 'cobalt-blue', 'emerald', 'weather']);
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
    const { id, format } = await request.json();
    if (!proDiaryIds.has(id) && !["berry-purple", "camera-kodak-mini-shot", "camera-leica-sofort-2", "camera-mini-12", "camera-polaroid-now", "clip-burgundy", "clip-emerald", "clip-golden-yellow", "clip-lavender", "clip-mint", "clip-orange", "clip-peach", "clip-pink", "clip-purple", "clip-sky", "clip-vivid-pink", "clip-yellow", "cobalt-blue", "emerald", "ivory-paper", "kraft-clip", "leather-folio", "mint-glass", "mint-planner", "silver-ring", "soft-mint", "spiral-plan", "trash-ash", "trash-canvas", "trash-charcoal", "trash-leather", "trash-pink", "trash-rattan", "trash-steel", "trash-vintage", "trash-walnut", "weather"].includes(id)) return json({ error: 'invalid_design' }, 400);
    if (!freeCalendarIds.has(id)) {
      const access = await checkProAccess(data.user.id, Deno.env.get('REVENUECAT_SECRET_API_KEY'), Deno.env.get('REVENUECAT_DAYLIGHT_PRO_ENTITLEMENT_ID'));
      if (access) return json({ error: access.error }, access.status);
    }
    const store = admin.storage.from('calendar-store');
    const pack: Record<string, unknown> = { id, revision: 1 };
    let paths: Record<string, string>;
    if (proDiaryIds.has(id)) {
      const folder = proDiaryFolders[id];
      if (!folder) return json({ error: 'invalid_design' }, 400);
      paths = { image: `${folder}/${id}.webp` };
      if (id.startsWith('print-border-')) for (const role of ['tl','tr','bl','br','top','bottom','left','right']) paths[role] = `${folder}/${id}-${role}.webp`;
      if (id.endsWith('-trash')) paths.filled = `${folder}/${id}-filled.webp`;
    } else if (id.startsWith('trash-')) {
      paths = { empty: `trash-bins/${id}-empty.webp`, filled: `trash-bins/${id}-filled.webp` };
    } else if (id.startsWith('camera-') || id.startsWith('clip-')) {
      const folder = id.startsWith('camera-') ? 'cameras' : 'clips';
      paths = { image: `${folder}/${id}.webp` };
    } else {
      const { data, error } = await store.download(`calendars/${id}.json`);
      if (error) throw error;
      const paper = JSON.parse(await data.text());
      pack.paper = paper.paper;
      pack.edge = paper.edge;
      paths = id === 'kraft-clip' ? { binding: 'calendars/kraft-clip-binding.webp' } : {};
    }
    const files = await Promise.all(Object.entries(paths).map(async ([role, path]) => {
      if (format === 2) {
        const { data, error } = await store.createSignedUrl(path, 300);
        if (error) throw error;
        return [role, data.signedUrl];
      }
      // Existing app versions expect embedded images.
      const { data, error } = await store.download(path);
      if (error) throw error;
      const bytes = new Uint8Array(await data.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      return [role, 'data:image/webp;base64,' + btoa(binary)];
    }));
    const assets = Object.fromEntries(files);
    if (format === 2) pack.files = assets;
    else if ('paper' in pack) {
      if (assets.binding) pack.binding = assets.binding;
    } else pack.images = assets;
    return json(pack);
  } catch { return json({ error: 'download_unavailable' }, 503); }
});
