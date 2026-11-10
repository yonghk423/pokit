import { createClient } from 'npm:@supabase/supabase-js@2';
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
    if (!allowed.includes(themeId)) return new Response(JSON.stringify({ error: 'invalid_theme' }), { status: 400, headers });
    const revision = body.revision === 'fullbleed-v2' ? 'fullbleed-v2' : 'city-animation';
    const names = ['background.webp'];
    const paths = [`calendar-themes/city-animation/${themeId}/background.webp`];
    const { data: signed, error: signingError } = await admin.storage.from('character-illustrations').createSignedUrls(paths, 3600);
    if (signingError || !signed?.every(file => file.signedUrl)) throw signingError;
    return new Response(JSON.stringify({ themeId, revision, files: names.map((name, i) => ({ name, url: signed![i].signedUrl })) }), { headers });
  } catch { return new Response('{}', { status: 503, headers }); }
});
