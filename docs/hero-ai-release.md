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

While processing, the selected inputs are shown with a thin rectangular progress bar. The percentage is explicitly labeled as estimated: the server reports completed output count, not byte-level generation progress. The estimate remains below 100% until results are available. Timers stop on unmount. Recovery errors now show an inline explanation, Retry and Close instead of leaving the recovery screen blank.

## Anonymous identity persistence

Native AI authentication now uses Expo SecureStore (iOS Keychain / Android Keystore-backed storage). The existing AsyncStorage auth session migrates at app launch (and retries on AI use) without replacing its Supabase user ID. Plaintext credentials are removed after secure persistence succeeds. Large sessions are split into small items and an atomic manifest is published only after all chunks have been written. A storage failure propagates as an authentication failure instead of silently returning an empty session.

The Keychain service and project namespace remain stable across app updates. iOS uses AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY and no biometric prompt. On the same device and bundle/signing identity, Keychain data may survive an uninstall and allow the existing Supabase session and server quota to be recovered. This is best effort: revoked/expired credentials, device resets, signing changes, or platform behavior can prevent recovery. Android uninstall removes the encryption keys and credentials; backup rules exclude SecureStore data because it cannot be decrypted after reinstall. Web still uses ordinary persistent browser storage.

Local diary reset intentionally leaves the secure AI identity intact, so resetting local content does not grant a new quota. This does not implement DeviceCheck, Play Integrity/Device Recall, account login, RevenueCat identity linking, or guaranteed reinstall protection. The existing server-side user and global daily limits remain the source of truth. Unit tests simulate reinstall by retaining the secure store while discarding ordinary app storage; they do not uninstall the user's app or erase diary data.


## Completion notifications

`20261029090000_hero_ai_notifications.sql` adds a service-role-only job notification receipt. Physical devices request notification permission when generation starts; denial, simulators or token-registration failure never block generation. The Expo token and locale are registered against the authenticated owner's existing job before rendering. No source photos are included in a push payload.

Once all outputs are terminal and at least one succeeded, the last worker atomically claims one notification and sends it through Expo Push Service. Concurrent workers cannot send duplicate notifications. An unknown network outcome is not retried to avoid duplicate banners. The receipt records the Expo ticket or rejection for diagnosis; a ticket is acceptance, not proof of device delivery. `EXPO_ACCESS_TOKEN` is optional and should be configured only if enhanced push security is enabled in the EAS project. APNs/FCM credentials and device permission are required for delivery.

Tapping a notification opens the comic tab and restores the same pending job. This does not create another paid request or apply images automatically. Server deployment and the notification table have been applied to the existing `yourday` project; real-device delivery still needs verification. A server must receive the input before it can continue after app termination. A permissionless simulator can verify generation and recovery UI but is intentionally skipped for push-token registration.


## Whole-photo content preservation

Whole-photo generation now sends exactly one image to the image model: the selected original. The former fixed `42-meditation` illustration is no longer loaded or sent as a style reference, and human-face styling is confined to face replacement mode. The photo-mode prompt requires preservation of original subject matter and forbids adding people to sources without people. The server ignores legacy photo-mode reference attachments as well, so already installed clients and pending photo requests receive the same protection. Face replacement still sends the existing scene and user face reference separately. This changes new server render calls; it does not alter completed images or resubmit any already claimed output.

### Local generated-photo library

Finished PNGs remain under Documents/hero-ai independently of diary scene removal and pending-request dismissal. The personalization source screen now opens “Previously created photos”; it scans completed nonempty PNGs (including files made before this feature), reconstructs paths from the current Documents directory, and excludes temporary downloads/input JSON. Users can select multiple saved images and apply them without generation requests or quota consumption, including at zero allowance. Explicit reuse can create a new diary even when another diary already uses the same files. Files are app-local; uninstalling the app removes this storage. Physical-device visual verification remains outstanding.

### Face suitability gate

Face-only jobs now send the normalized portrait to the authenticated `/jobs` endpoint before reservation. `gpt-4.1-mini` checks for exactly one clearly visible real human face using strict JSON output (`store:false`, 25-second timeout). Missing, multiple, or unclear faces are rejected; refusal, malformed output, and network errors fail closed. Whole-photo jobs bypass this check. The render endpoint also checks the actual reference before claiming a slot so old/recovered jobs cannot bypass validation; rejected legacy reserved slots are released as failed. A bounded five-minute user/image-hash promise cache reduces duplicate checks across scenes without retaining source images or face descriptors. This is probabilistic suitability checking, not identity recognition. Vision analysis has an API cost but rejected new requests do not reserve the user's image-generation quota. Client displays localized rejection guidance and returns to photo selection. Mocked tests cover accepted/rejected/refused/unavailable responses and client rejection cleanup; real photo accuracy/device checks are still needed.

API references: https://developers.openai.com/api/docs/guides/images-vision?api-mode=chat and https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat

### Input validation (updated 2026-10-30)

The optional app-specific nudity/sexual-content preflight and moderation service calls were removed at the user's request after a safety-check service error. Face suitability validation remains in face-reference mode. The generation provider's built-in safety protections are unchanged. Single-accent rules remain active; text-based generation retains the protagonist-only rule. Existing pending requests that failed only during the removed preflight can resume normally.

### Illustration rules (2026-10-30)

All generation modes now request one required chromatic accent on one small focal object (about 1–5% of the drawing), with the remaining image in black fountain-pen ink on neutral cream paper. A stable diary-based choice selects from 30 accent colors; references cannot add other hues. This replaces the former fixed sparse-olive instruction.

Text-based scenes show only the protagonist; family/group narratives are expressed through setting, objects and mood. Photo-based generation preserves every original person, their positions and composition, using the selected drawing as a separate style reference. Person-free source photos remain person-free. These are generation prompt rules; the prompt tests verify inclusion and conflicting old instructions, not perfect visual compliance by the model. Already generated images are unchanged.

### Generation cancellation (2026-10-30)

The progress view has a cancel action; its close icon also cancels while working. The authenticated POST /jobs/:id/cancel route checks ownership and marks outputs failed with error cancelled. Failed outputs do not consume generation quota. started_at remains for the separate upstream-attempt guard. Cancellation is idempotent. Conditional completion prevents late results from reviving cancelled outputs; late uploads and notifications are removed. In-process upstream fetches are aborted when reachable, but provider computation and billing may already have started.

The client prevents late results from being applied and retains cancellation intent on connection failure, so recovery cancels instead of generating again. Draft text and photo selection remain editable. Client/UI cancellation tests and a deployed reservation/cancel check passed; the cancelled test output counted as zero generation slots without requesting an image.
