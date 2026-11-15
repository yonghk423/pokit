insert into storage.buckets (id, name, public, allowed_mime_types)
values ('calendar-store', 'calendar-store', false, array['application/json'])
on conflict (id) do nothing;
