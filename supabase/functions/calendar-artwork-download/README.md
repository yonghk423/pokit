# Calendar artwork download

Returns a one-hour signed download URL for an authenticated calendar artwork asset. The objects remain private in the `character-illustrations` bucket.

## Textured watercolor

Send `POST https://wvvtyaxsedpqiscogrwk.supabase.co/functions/v1/calendar-artwork-download` with the caller's Supabase access token, the app's publishable `apikey`, and `{ "styleId": "textured-watercolor" }`. The response contains a signed URL for `background.webp`; download the image with a `GET` to that URL before it expires (one hour).

In the app, call `supabase.functions.invoke('calendar-artwork-download', { body: { styleId: 'textured-watercolor' } })`, then download `data.file.url`.

Storage object: `calendar-themes/textured-watercolor/20261112-v1/background.webp`.

The app also lists this image in the Textured Watercolor pack. App downloads use `calendar-theme` with `themeId: textured-watercolor-01-fly-kite` and `revision: textured-watercolor-v1`, using the shared calendar JSON for overlay coordinates. This endpoint remains available for direct artwork downloads.
