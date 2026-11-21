import { X509Certificate, type KeyObject } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { X509 } from 'npm:jsrsasign@11.1.5';

/** Supplies the missing Supabase Node-compat members using Apple's existing JS PKI dependency.
 * Certificate signatures are still cryptographically verified; no validation is skipped.
 */
export class EdgeX509Certificate {
  private readonly native: X509Certificate;
  private readonly der: Buffer;
  private readonly parsed: X509;

  constructor(input: Uint8Array | string) {
    this.native = new X509Certificate(input);
    this.der = typeof input === 'string'
      ? Buffer.from(input.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, ''), 'base64')
      : Buffer.from(input);
    this.parsed = new X509();
    this.parsed.readCertHex(this.der.toString('hex'));
  }

  get issuer() { return this.native.issuer; }
  get subject() { return this.native.subject; }
  get ca() { return this.native.ca; }
  get publicKey() { return this.native.publicKey; }
  get validFrom() { return this.native.validFrom; }
  get validTo() { return this.native.validTo; }
  get fingerprint256() { return this.native.fingerprint256; }
  get raw(): Buffer { return Buffer.from(this.der); }
  toString(): string {
    return `-----BEGIN CERTIFICATE-----\n${this.der.toString('base64').match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----\n`;
  }
  verify(publicKey: KeyObject): boolean {
    return this.parsed.verifySignature(publicKey.export({ type: 'spki', format: 'pem' }) as string);
  }
  get infoAccess(): string | undefined {
    const info = this.parsed.getExtAIAInfo();
    if (!info) return undefined;
    return [
      ...info.ocsp.map(uri => `OCSP - URI:${uri}`),
      ...info.caissuer.map(uri => `CA Issuers - URI:${uri}`),
    ].join('\n');
  }
}
