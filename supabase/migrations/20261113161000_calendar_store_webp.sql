update storage.buckets
set allowed_mime_types = array['application/json', 'image/webp']
where id = 'calendar-store';
