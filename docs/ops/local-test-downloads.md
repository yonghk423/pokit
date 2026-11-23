# Local test downloads

Production downloads continue to require verified Apple transactions. RevenueCat test access is imported only by the `*-sandbox` functions.

Local iOS simulators use the existing `EXPO_PUBLIC_SIMULATOR_DOWNLOAD_TOKEN`. A physical development device uses the same route only when its current RevenueCat App User ID is listed in the ignored `.env.local` variable `EXPO_PUBLIC_LOCAL_TEST_CUSTOMER_IDS` (comma separated). Escape `$` as `\$` in Expo dotenv files. Release builds never send test credentials.

On the server, `SIMULATOR_REVENUECAT_CUSTOMER_ID` preserves the simulator registration; `LOCAL_TEST_REVENUECAT_CUSTOMER_IDS` explicitly lists additional physical test customers. The server requires the test token, an exact allowlisted customer ID, and a currently active `daylight_pro` entitlement fetched from RevenueCat. Registering an ID alone does not grant Pro. Unknown IDs fall back to Apple Sandbox verification. Configure secrets before deploying the sandbox functions.

A local installation can have active RevenueCat customer entitlements while StoreKit returns no matching current transactions. This test route does not create or fabricate an Apple purchase proof. Reinstalling or resetting the anonymous RevenueCat identity may require registering the newly verified test ID again.
