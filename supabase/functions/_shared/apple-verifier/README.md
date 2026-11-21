# Apple verifier 3.1.0 compatibility copy

`jws_verification.ts` is the original TypeScript source embedded in the published
`@apple/app-store-server-library@3.1.0` source map, under the included MIT license.
Changes include explicit pinned Deno imports, TypeScript-only annotations, and substituting
`EdgeX509Certificate` for Node's incomplete X509Certificate implementation in
hosted Supabase Edge Runtime (supabase/edge-runtime issue 761).

The shim uses jsrsasign, which the Apple verifier already depends on, for certificate
signature verification and AIA parsing. All Apple chain anchoring, certificate
marker OIDs, validity dates, OCSP checks, ES256/JWS verification, bundle and environment
checks remain in Apple's original verifier. Online checks remain enabled.

When upgrading the Apple dependency, regenerate this source and review the diff.
Do not replace verification with payload decoding or skip revocation checks.

The final JWS signature check uses jose 6.1.0 Web Crypto with ES256 explicitly
required, retaining JWT temporal-claim checks. The Edge Runtime reports EC curve
names differently from Node, causing jsonwebtoken's key-type check to reject
valid Apple signatures. No permissive key-type flag is used. The App Store
transaction lookup also signs its five-minute API token using jose and sends it
only to the fixed environment-specific Apple endpoint. The returned JWS still
passes the full Apple certificate/OCSP and transaction policy checks.
