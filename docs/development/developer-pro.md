# Developer Pro

Development builds call `developer-pro` before opening a purchase flow. Release builds skip this call and retain the normal RevenueCat purchase flow. The endpoint derives identity from verified Supabase authentication; request bodies cannot select a customer.

Supabase project: `wvvtyaxsedpqiscogrwk`.

Server secrets:
- `DAYLIGHT_DEVELOPER_PRO_USER_IDS`: exact comma-separated Supabase user IDs.
- `REVENUECAT_SECRET_API_KEY`: existing read-only verification key, unchanged.
- `REVENUECAT_DEVELOPER_GRANT_KEY`: separate V2 key with Customers Configuration read/write only. Never place this value in app configuration, source, or logs.

Registered on 2026-11-19:
- Physical iPhone 16 Pro: `3cadc399-96f9-49ff-9970-e6a6854feace` — removed from the server allowlist on 2026-11-21 at the owner’s request; complimentary RevenueCat entitlement revoked.
- iPhone 18 Pro Max simulator: `ae6ae776-7c9d-4069-8d7f-634e47a0b1a4`
- iPhone 17 simulator: `79488aee-ade4-43a1-88fd-0d01e390ba5a`

The endpoint grants the existing `daylight_pro` entitlement for one year when inactive. Active grants are returned unchanged, so repeated taps do not extend them. This is a promotional entitlement, not a zero-price App Store transaction. RevenueCat stores it, and existing asset endpoints continue to verify RevenueCat normally. An activation error stops the development purchase attempt rather than falling through to a paid transaction.

Ordinary restarts preserve the authenticated customer identity. Another simulator, clearing app credentials, or creating another anonymous account can produce a new identity; it must be explicitly verified and registered. Device UDIDs and bundle/product identifiers are not changed.

Validation: 32 focused tests, TypeScript check, deployed unauthenticated request rejected with 401, and iPhone 17 runtime activation plus a paid `clip-burgundy` asset download returned HTTP 200 (172922 bytes). Physical device identity and its existing RevenueCat grant were checked; the new button flow was not exercised on the physical device.
