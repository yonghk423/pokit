import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'npm:jose@6.1.0';

export async function verifyAppleJws(jws: string, publicKeyPem: string): Promise<void> {
  const key = await importSPKI(publicKeyPem, 'ES256');
  await jwtVerify(jws, key, { algorithms: ['ES256'] });
}

/** The single App Store endpoint needed for current revocation/expiration checks. */
export function createAppleTransactionClient(privateKey: string, keyId: string, issuerId: string, environment: string) {
  if (environment !== 'Sandbox' && environment !== 'Production') throw new Error('invalid_environment');
  const key = importPKCS8(privateKey, 'ES256');
  const origin = environment === 'Sandbox' ? 'https://api.storekit-sandbox.apple.com' : 'https://api.storekit.apple.com';
  return {
    async getTransactionInfo(id: string): Promise<{ signedTransactionInfo: string }> {
      if (!/^\d{1,64}$/.test(id)) throw new Error('invalid_transaction_id');
      const token = await new SignJWT({ bid: 'com.yonghee.pokit' })
        .setProtectedHeader({ alg: 'ES256', kid: keyId, typ: 'JWT' })
        .setIssuer(issuerId).setAudience('appstoreconnect-v1')
        .setIssuedAt().setExpirationTime('5m').sign(await key);
      const response = await fetch(origin + '/inApps/v1/transactions/' + id, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('apple_transaction_unavailable');
      const body = await response.json();
      if (typeof body.signedTransactionInfo !== 'string') throw new Error('apple_transaction_unavailable');
      return { signedTransactionInfo: body.signedTransactionInfo };
    },
  };
}
