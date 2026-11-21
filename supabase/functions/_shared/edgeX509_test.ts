import { strict as assert } from 'node:assert';
import { Buffer } from 'node:buffer';
import { generateKeyPairSync } from 'node:crypto';
import { EdgeX509Certificate } from './edgeX509.ts';
import { appleRootG3 } from './appleRoot.ts';
Deno.test('Apple root DER and PEM survive the edge adapter', () => {
  const der = Buffer.from(appleRootG3, 'base64');
  const cert = new EdgeX509Certificate(der);
  assert.deepEqual(cert.raw, der);
  assert.deepEqual(new EdgeX509Certificate(cert.toString()).raw, der);
  assert.equal(cert.ca, true);
  assert.equal(cert.issuer, cert.subject);
});
Deno.test('Apple root signature is verified and another key is rejected', () => {
  const cert = new EdgeX509Certificate(Buffer.from(appleRootG3, 'base64'));
  assert.equal(cert.verify(cert.publicKey), true);
  const other = generateKeyPairSync('ec', { namedCurve: 'secp384r1' });
  assert.equal(cert.verify(other.publicKey), false);
});
Deno.test('tampered certificate signature is rejected', () => {
  const der = Buffer.from(appleRootG3, 'base64');
  const root = new EdgeX509Certificate(der);
  der[der.length - 1] ^= 1;
  assert.equal(new EdgeX509Certificate(der).verify(root.publicKey), false);
});
