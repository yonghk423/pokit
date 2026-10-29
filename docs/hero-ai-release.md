# Hero AI release connection

Project: `yourday` (`wvvtyaxsedpqiscogrwk`, Seoul). The app uses the existing public Supabase URL and publishable key. It does not use a Mac relay, a developer token, or an OpenAI key in its bundle.

## Authentication and limits

A dedicated Supabase Auth client creates and persists an anonymous account without adding a login screen. The announcement client remains read-only and unchanged. Each request validates the user's access token with Supabase Auth inside the Edge Function. Gateway legacy JWT verification is disabled only because authentication is explicitly handled in the function, including current signing keys.

An atomic database reservation enforces three outputs per anonymous account per Asia/Seoul calendar day. Database locks serialize simultaneous reservations. Claims prevent duplicate calls to OpenAI for the same output. Direct table and quota-RPC access are revoked from app roles. Expired unclaimed reservations are released; uncertain upstream calls retain quota to prevent accidental repeat billing.

An initial service-wide safeguard is 100 outputs per day. Authorized operators can update `public.hero_ai_limits.global_daily` through the dashboard or SQL. This protects the shared API budget. Upstream attempts are additionally limited to six per account and twice the global output allowance per day, including explicit upstream rejections. Anonymous accounts are installation identities: reinstalling or clearing identity data can create a new account. Stronger person-level limits require account linking and/or app attestation. Supabase anonymous sign-up rate limits and the global generation cap remain active; consider CAPTCHA/App Attest before scaling free public acquisition.

## Generation and retention

The app uploads JPEG-normalized inputs only after Generate is pressed. Neither original nor face-reference photos are persisted by the function. Each output has a separate background worker (`gpt-image-2`, `low`, `1024x1536`) with a 110-second upstream timeout, within the free Edge Function runtime. Workers do not automatically retry unknown OpenAI outcomes.

Completed PNGs are kept in the private `hero-ai-results` bucket. Only owner-authenticated requests receive five-minute signed download URLs. The app saves files into private document storage, previews results, and applies them to diary cards. A scheduled cleanup runs every 30 minutes and removes temporary result objects older than 24 hours. Temporary results therefore normally persist up to about 24.5 hours; local applied files remain in the app. Job and quota metadata are retained separately and contain no source photos.

## Deployment

- `supabase/functions/hero-ai/index.ts`: generation, authenticated job polling, signed results, maintenance endpoint.
- `supabase/migrations/20261028050000_hero_ai.sql`: isolated AI tables, atomic quota helpers and private bucket.
- `supabase/migrations/20261028051000_hero_ai_cleanup.sql`: scheduled private cleanup invocation.
- `OPENAI_API_KEY` and `HERO_AI_CLEANUP_TOKEN`: Edge Function Secrets only. The cleanup token is also encrypted in Supabase Vault for the cron invocation.

Apply only the relevant AI migrations to the existing project; do not reset the database. The announcements and operator notices tables are independent. Deploy only `hero-ai` without pruning other functions:

```sh
npx supabase functions deploy hero-ai --project-ref wvvtyaxsedpqiscogrwk --use-api --no-verify-jwt
```

The maintenance endpoint validates its own random token and does not accept user tokens as maintenance authorization. Never put the service-role key or OpenAI key into EXPO_PUBLIC variables.

## Verification

The database quota checks in `supabase/tests/hero_ai_quota.sql` run inside a rolled-back transaction with `hero_ai.test_user` set to a test Auth user's UUID. They cover duplicate reservations, duplicate claims, cross-user claims, expired unclaimed reservations, and revoked app-role permissions.

A live production smoke test generated one existing app illustration and downloaded its private output. It used no real user's facial photograph. Authenticated health returned 200; unauthenticated job access returned 401.


## Interrupted app sessions

Before reserving a server job, the client awaits writing normalized inputs into its private documents folder and a request receipt into AsyncStorage. On the next comic planner mount, a recovery view looks up that same job ID, submits only slots the server still reports reserved, and downloads completed results. Server claims remain atomic, so resuming does not create another paid request for claimed slots. A download is moved from a temporary path only after success. A local result receipt is retained until Apply; already downloaded results can be previewed even after server cleanup. Temporary normalized photos are removed once results are safely saved.

The receipt retains the original diary ID and protagonist name. Applying restored results appends to that diary if it still exists, otherwise creates a new diary. Opening the recovery preview never applies results automatically. No background upload can be guaranteed after OS termination; any missing uploads resume when the user returns. Unretrieved server outputs still expire under the existing ~24-hour retention policy. Clearing app data removes the anonymous session and recovery receipt.

## Export and generation UI

Each generated preview has separate icon-only Save to Photos and Share actions, with localized accessibility labels. Save requests add-only photo permission on iOS and legacy Android; Android 10+ saves without broad media read access. Share exports the local PNG through the OS share sheet, without uploading it to another service. Applying still saves the result into the app diary. The iOS native dependencies are linked through CocoaPods; an updated native build is required after adding expo-media-library and expo-sharing.

While processing, a fountain-pen animation shows completed image count and actual elapsed time, with a longer-wait hint after 90 seconds. There is no invented percentage or predicted finish time. Reduced Motion replaces the pen loop with a static drawing. Timers and the animation stop on unmount.

## Anonymous identity persistence

Native AI authentication now uses Expo SecureStore (iOS Keychain / Android Keystore-backed storage). The existing AsyncStorage auth session migrates at app launch (and retries on AI use) without replacing its Supabase user ID. Plaintext credentials are removed after secure persistence succeeds. Large sessions are split into small items and an atomic manifest is published only after all chunks have been written. A storage failure propagates as an authentication failure instead of silently returning an empty session.

The Keychain service and project namespace remain stable across app updates. iOS uses AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY and no biometric prompt. On the same device and bundle/signing identity, Keychain data may survive an uninstall and allow the existing Supabase session and server quota to be recovered. This is best effort: revoked/expired credentials, device resets, signing changes, or platform behavior can prevent recovery. Android uninstall removes the encryption keys and credentials; backup rules exclude SecureStore data because it cannot be decrypted after reinstall. Web still uses ordinary persistent browser storage.

Local diary reset intentionally leaves the secure AI identity intact, so resetting local content does not grant a new quota. This does not implement DeviceCheck, Play Integrity/Device Recall, account login, RevenueCat identity linking, or guaranteed reinstall protection. The existing server-side user and global daily limits remain the source of truth. Unit tests simulate reinstall by retaining the secure store while discarding ordinary app storage; they do not uninstall the user's app or erase diary data.
