import { strict as assert } from 'node:assert';
import { generateKeyPair, exportSPKI, exportPKCS8, jwtVerify, SignJWT } from 'npm:jose@6.1.0';
import { verifyAppleJws, createAppleTransactionClient } from './appleWebCrypto.ts';
Deno.test('Web Crypto verifies ES256 and rejects tampering and wrong keys', async () => {
  const keys = await generateKeyPair('ES256');
  const pem = await exportSPKI(keys.publicKey);
  const token = await new SignJWT({ bundleId: 'com.yonghee.pokit' }).setProtectedHeader({ alg: 'ES256' }).sign(keys.privateKey);
  await verifyAppleJws(token, pem);
  const parts = token.split('.');
  parts[1] = btoa(JSON.stringify({ bundleId: 'tampered' })).replace(/=/g, '');
  await assert.rejects(() => verifyAppleJws(parts.join('.'), pem));
  const other = await generateKeyPair('ES256');
  const otherPem = await exportSPKI(other.publicKey);
  await assert.rejects(() => verifyAppleJws(token, otherPem));
  await assert.rejects(() => verifyAppleJws('eyJhbGciOiJub25lIn0.e30.', pem));
});

Deno.test('Apple transaction client uses fixed hosts and a bounded signed API token', async () => {
  const keys = await generateKeyPair('ES256', { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const originalFetch = globalThis.fetch;
  try {
    for (const [environment, host] of [
      ['Production', 'api.storekit.apple.com'],
      ['Sandbox', 'api.storekit-sandbox.apple.com'],
    ]) {
      globalThis.fetch = async (input, init) => {
        const url = new URL(String(input));
        assert.equal(url.host, host);
        assert.equal(url.pathname, '/inApps/v1/transactions/123');
        const token = new Headers(init?.headers).get('Authorization')!.slice(7);
        const verified = await jwtVerify(token, keys.publicKey, {
          algorithms: ['ES256'], issuer: 'test-issuer', audience: 'appstoreconnect-v1',
        });
        assert.equal(verified.protectedHeader.kid, 'test-key');
        assert.equal(verified.payload.bid, 'com.yonghee.pokit');
        assert.equal(verified.payload.exp! - verified.payload.iat!, 300);
        assert(init?.signal);
        return Response.json({ signedTransactionInfo: 'signed-response' });
      };
      const client = createAppleTransactionClient(privateKey, 'test-key', 'test-issuer', environment);
      assert.deepEqual(await client.getTransactionInfo('123'), { signedTransactionInfo: 'signed-response' });
      await assert.rejects(() => client.getTransactionInfo('../other'));
    }
  } finally { globalThis.fetch = originalFetch; }
});
