import { SEASON_COLLECTION_FILES } from './seasonCollectionFiles.ts';
import { SEASON_WINTER_FILES } from './seasonWinterFiles.ts';
import { TEXTURED_WATERCOLOR_FILES } from './texturedWatercolorFiles.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { EVERYDAY_CINEMA_FILES } from './everydayCinemaFiles.ts';
import { WARM_SEPIA_OPEN_PANEL_FILES } from './warmSepiaFiles.ts';
import { CITYPOP_RETRO_FILES } from './citypopRetroFiles.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json' };
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return new Response('{}', { status: 405, headers });
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data, error } = await admin.auth.getUser(request.headers.get('Authorization')?.replace(/^Bearer /i, '') ?? '');
    if (error || !data.user) return new Response('{}', { status: 401, headers });
    const body = await request.json().catch(() => ({}));
    const allowed = [
      '01-rush-hour-commute', '02-office-presentation', '03-spilled-coffee-report', '04-lunch-rooftop', '05-proud-promotion',
      '06-angry-email', '07-after-work-run', '08-missed-deadline', '09-boxing-bag', '10-basketball-shot', '11-swimming-laps', '12-cycling-hill', '13-yoga-balance', '14-tennis-serve', '15-soccer-dribble', '16-dance-practice', '17-climbing-wall', '18-jump-rope', '19-rain-run', '20-badminton-rally', '21-couch-after-work', '22-window-tea', '23-laundry-day', '24-home-cooking', '25-lazy-morning', '26-couch-nap', '27-houseplant-care', '28-movie-night', '29-bathroom-skincare', '30-cat-on-lap', '31-frustrated-phone-call', '32-sad-bus-stop', '33-exam-results-joy', '34-interview-nerves', '35-breakup-evening', '36-concert-happiness', '37-embarrassed-spill', '38-holiday-loneliness', '39-birthday-surprise', '40-relief-after-cry', '41-spring-blossom-bicycle', '42-spring-rain-puddle', '43-spring-garden-planting', '44-summer-beach-walk', '45-summer-hill-hike', '46-autumn-leaves', '47-autumn-market', '48-autumn-bus-shelter', '49-winter-snow-play', '50-winter-bus-wait',
    ];
    const themeId = body.themeId;
    const seasonal = typeof themeId === 'string' && Object.hasOwn(SEASON_COLLECTION_FILES, themeId) ? SEASON_COLLECTION_FILES[themeId] : null;
    if (seasonal) {
      const revision = `season-${seasonal.season}-v1`;
      if (body.revision !== revision) return new Response(JSON.stringify({ error: 'calendar_update_required' }), { status: 409, headers });
      const { data: signed, error } = await admin.storage.from('character-illustrations').createSignedUrl(`calendar-themes/season-${seasonal.season}/20261115-v1/${seasonal.file}`, 3600);
      if (error || !signed?.signedUrl) throw error;
      return new Response(JSON.stringify({ themeId, revision, files: [{ name: 'background.webp', url: signed.signedUrl }] }), { headers });
    }
    const winterFile = typeof themeId === 'string' && Object.hasOwn(SEASON_WINTER_FILES, themeId) ? SEASON_WINTER_FILES[themeId] : null;
    if (winterFile) {
      if (body.revision !== 'season-winter-v2') return new Response(JSON.stringify({ error: 'calendar_update_required' }), { status: 409, headers });
      const { data: signed, error: signingError } = await admin.storage.from('character-illustrations').createSignedUrl(`calendar-themes/season-winter/20261114-v2/${winterFile}`, 3600);
      if (signingError || !signed?.signedUrl) throw signingError;
      return new Response(JSON.stringify({ themeId, revision: 'season-winter-v2', files: [{ name: 'background.webp', url: signed.signedUrl }] }), { headers });
    }
    const watercolorFile = typeof themeId === 'string' && Object.hasOwn(TEXTURED_WATERCOLOR_FILES, themeId) ? TEXTURED_WATERCOLOR_FILES[themeId] : null;
    if (watercolorFile) {
      const originalKite = themeId === 'textured-watercolor-01-fly-kite';
      const revision = originalKite ? 'textured-watercolor-v1' : 'textured-watercolor-v2';
      const storageRevision = originalKite ? '20261112-v1' : '20261113-v2';
      if (body.revision !== revision) return new Response(JSON.stringify({ error: 'calendar_update_required' }), { status: 409, headers });
      const { data: signed, error: signingError } = await admin.storage.from('character-illustrations').createSignedUrl(`calendar-themes/textured-watercolor/${storageRevision}/${watercolorFile}`, 3600);
      if (signingError || !signed?.signedUrl) throw signingError;
      return new Response(JSON.stringify({ themeId, revision, files: [{ name: 'background.webp', url: signed.signedUrl }] }), { headers });
    }
    if (typeof themeId === 'string' && themeId.startsWith('everyday-cinema-') && body.revision !== 'everyday-cinema-v2') {
      return new Response(JSON.stringify({ error: 'calendar_update_required' }), { status: 409, headers });
    }
    if (typeof themeId === 'string' && themeId.startsWith('warm-sepia-open-panel-') && body.revision !== 'warm-sepia-open-panel-v2') {
      return new Response(JSON.stringify({ error: 'calendar_update_required' }), { status: 409, headers });
    }
    if (typeof themeId === 'string' && themeId.startsWith('citypop-retro-') && body.revision !== 'citypop-retro-v1') {
      return new Response(JSON.stringify({ error: 'calendar_update_required' }), { status: 409, headers });
    }
    const everydayFile = typeof themeId === 'string' && Object.hasOwn(EVERYDAY_CINEMA_FILES, themeId) ? EVERYDAY_CINEMA_FILES[themeId] : null;
    const warmSepiaFile = typeof themeId === 'string' && Object.hasOwn(WARM_SEPIA_OPEN_PANEL_FILES, themeId) ? WARM_SEPIA_OPEN_PANEL_FILES[themeId] : null;
    const citypopRetroFile = typeof themeId === 'string' && Object.hasOwn(CITYPOP_RETRO_FILES, themeId) ? CITYPOP_RETRO_FILES[themeId] : null;
    if (!everydayFile && !warmSepiaFile && !citypopRetroFile && !allowed.includes(themeId)) return new Response(JSON.stringify({ error: 'invalid_theme' }), { status: 400, headers });
    const revision = everydayFile ? 'everyday-cinema-v2' : warmSepiaFile ? 'warm-sepia-open-panel-v2' : citypopRetroFile ? 'citypop-retro-v1' : body.revision === 'fullbleed-v2' ? 'fullbleed-v2' : 'city-animation';
    const names = ['background.webp'];
    const paths = [everydayFile
      ? `calendar-themes/everyday-cinema/20261112-v2/${everydayFile}`
      : warmSepiaFile
        ? `calendar-themes/warm-sepia-open-panel/20261112-v2/${warmSepiaFile}`
        : citypopRetroFile
          ? `calendar-themes/citypop-retro/20261112-v1/${citypopRetroFile}`
          : `calendar-themes/city-animation/${themeId}/background.webp`];
    const { data: signed, error: signingError } = await admin.storage.from('character-illustrations').createSignedUrls(paths, 3600);
    if (signingError || !signed?.every(file => file.signedUrl)) throw signingError;
    return new Response(JSON.stringify({ themeId, revision, files: names.map((name, i) => ({ name, url: signed![i].signedUrl })) }), { headers });
  } catch { return new Response('{}', { status: 503, headers }); }
});
