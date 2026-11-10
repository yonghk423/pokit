# Character 6 download

Display name: 주인공6 (renumbered from 주인공7). Storage identifiers remain stable for existing installs.

Storage source: private `character-illustrations/protagonist-7/card-960`, verified in the dashboard (50 WebP images).

Deployment prerequisites:
- RevenueCat V2 secret API key (only `customer_information:customers:read`) in Edge Function secret `REVENUECAT_SECRET_API_KEY`.
- Entitlement identifier `yourday_pro`, V2 ID `entl6dedc07f76`, project `proj12204b57`.
- Deploy `character-pack` using the repository configuration (`verify_jwt=false`; the function validates JWT with auth.getUser).

The preview action signs the first image for authenticated users. The download action checks the authenticated user's entitlement server-side before issuing one-hour URLs. Never make the whole bucket public or put the secret key in EXPO_PUBLIC variables.

The app links the current RevenueCat SDK customer to its Supabase authenticated UUID with Purchases.logIn before downloading. Validate existing anonymous purchase merging and restored purchases on an actual device before release. Files are retained in Documents, with the complete manifest written only after all downloads succeed. Interrupted downloads can be retried. This adds the collection to the gallery; it does not yet add a new AI style or character choice to diary creation.

Deployed on 2026-11-08 to `wvvtyaxsedpqiscogrwk`; the RevenueCat secret is registered. An unauthenticated production request returned HTTP 401. A real subscribed-device download and anonymous purchase merging still require end-to-end verification. No new test account was created.
