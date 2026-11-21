import { authorizeApplePurchase, authorizeApplePurchaseWithReviewSupport, isActiveDaylightPurchase } from '../../../../supabase/functions/_shared/applePurchasePolicy';
import { SignedDataVerifier, Environment } from '@apple/app-store-server-library';
import { appleRootG3 } from '../../../../supabase/functions/_shared/appleRoot';
const valid = { bundleId: 'com.yonghee.pokit', environment: 'Production', transactionId: '123', originalTransactionId: '100', productId: 'monthly', type: 'Auto-Renewable Subscription', expiresDate: Date.now() + 60000 };
it('keeps Sandbox and Production purchases isolated', () => {
  const sandbox = { ...valid, environment: 'Sandbox' };
  expect(isActiveDaylightPurchase(sandbox, 'Sandbox')).toBe(true);
  expect(isActiveDaylightPurchase(sandbox, 'Production')).toBe(false);
  expect(isActiveDaylightPurchase(valid, 'Sandbox')).toBe(false);
});
it.each([
  { bundleId: 'other' }, { environment: 'Sandbox' }, { productId: 'fake' },
  { expiresDate: 1 }, { revocationDate: 1 }, { isUpgraded: true }, { transactionId: undefined },
])('rejects invalid purchase %j', change => expect(isActiveDaylightPurchase({ ...valid, ...change }, 'Production')).toBe(false));
it('accepts a valid current subscription and lifetime purchase', () => {
  expect(isActiveDaylightPurchase(valid, 'Production')).toBe(true);
  expect(isActiveDaylightPurchase({ ...valid, productId: 'lifetime', type: 'Non-Consumable', expiresDate: undefined }, 'Production')).toBe(true);
});
it('checks latest revocation even for a valid older proof', async () => {
  const verify = jest.fn().mockResolvedValueOnce(valid).mockResolvedValueOnce({ ...valid, revocationDate: 1 });
  expect(await authorizeApplePurchase(['old'], 'Production', verify, async () => 'latest')).toBe(false);
});
it('rejects a mismatched transaction from the latest lookup', async () => {
  const verify = jest.fn().mockResolvedValueOnce(valid).mockResolvedValueOnce({ ...valid, transactionId: 'other' });
  expect(await authorizeApplePurchase(['old'], 'Production', verify, async () => 'latest')).toBe(false);
});
it('accepts a verified matching latest transaction', async () => {
  expect(await authorizeApplePurchase(['proof'], 'Production', async () => valid, async () => 'latest')).toBe(true);
});
it('fails closed when Apple is unavailable', async () => {
  await expect(authorizeApplePurchase(['proof'], 'Production', async () => valid, async () => { throw new Error('offline'); })).rejects.toThrow('offline');
});
it('rejects forged JWS using the actual Apple verifier', async () => {
  const verifier = new SignedDataVerifier([Buffer.from(appleRootG3, 'base64')], false, Environment.PRODUCTION, 'com.yonghee.pokit', 6762331629);
  await expect(verifier.verifyAndDecodeTransaction('eyJhbGciOiJFUzI1NiJ9.eyJwcm9kdWN0SWQiOiJtb250aGx5In0.fake')).rejects.toThrow();
});
it('rejects missing or excessive proofs before verification', async () => {
  const verify = jest.fn();
  for (const proofs of [null, [], Array(9).fill('x'), ['x'.repeat(24001)]]) expect(await authorizeApplePurchase(proofs, 'Production', verify, async () => '')).toBe(false);
  expect(verify).not.toHaveBeenCalled();
});

it('reports retryable verification failures as unavailable instead of no subscription', async () => {
  const failure = Object.assign(new Error('OCSP unavailable'), { retryable: true });
  await expect(authorizeApplePurchase(['proof'], 'Production', async () => { throw failure; }, async () => 'unused')).rejects.toBe(failure);
});

describe('App Review purchase verification', () => {
  const mismatch = new Error('verified_environment_mismatch');
  const factory = (transaction = { ...valid, environment: 'Sandbox' }) => {
    const production = { verify: jest.fn(async (_proof: string) => { throw mismatch; }), latest: jest.fn(async () => 'production-latest') };
    const sandbox = { verify: jest.fn(async (_proof: string) => transaction), latest: jest.fn(async () => 'sandbox-latest') };
    return { production, sandbox, get: jest.fn((environment: string) => environment === 'Production' ? production : sandbox) };
  };
  it('supports a signed Sandbox review purchase on the production route', async () => {
    const deps = factory();
    expect(await authorizeApplePurchaseWithReviewSupport(['proof'], 'Production', true, deps.get, e => e === mismatch)).toBe(true);
    expect(deps.sandbox.latest).toHaveBeenCalledWith('123');
    expect(deps.sandbox.verify).toHaveBeenLastCalledWith('sandbox-latest');
    expect(deps.production.latest).not.toHaveBeenCalled();
  });
  it('keeps real production purchases on the production API', async () => {
    const production = { verify: jest.fn(async () => valid), latest: jest.fn(async () => 'production-latest') };
    const get = jest.fn(() => production);
    expect(await authorizeApplePurchaseWithReviewSupport(['proof'], 'Production', true, get, () => false)).toBe(true);
    expect(production.latest).toHaveBeenCalledWith('123');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('Production');
  });
  it.each(['forged signature', 'wrong bundle', 'OCSP unavailable'])('never retries Sandbox for %s', async message => {
    const get = jest.fn(() => ({ verify: async () => { throw new Error(message); }, latest: async () => '' }));
    expect(await authorizeApplePurchaseWithReviewSupport(['forged'], 'Production', true, get, e => e === mismatch)).toBe(false);
    expect(get.mock.calls).toHaveLength(1);
  });
  it('does not upgrade the sandbox-only route to production', async () => {
    const deps = factory();
    expect(await authorizeApplePurchaseWithReviewSupport(['proof'], 'Sandbox', false, () => deps.production, e => e === mismatch)).toBe(false);
    expect(deps.sandbox.verify).not.toHaveBeenCalled();
  });
  it.each([{ expiresDate: 1 }, { revocationDate: 1 }, { bundleId: 'other' }, { environment: 'Xcode' }])('rejects invalid review purchases %j', async change => {
    const deps = factory({ ...valid, environment: 'Sandbox', ...change });
    expect(await authorizeApplePurchaseWithReviewSupport(['proof'], 'Production', true, deps.get, e => e === mismatch)).toBe(false);
    expect(deps.sandbox.latest).not.toHaveBeenCalled();
  });
  it('rejects latest Sandbox transactions with a different environment', async () => {
    const deps = factory();
    deps.sandbox.verify.mockResolvedValueOnce({ ...valid, environment: 'Sandbox' }).mockResolvedValueOnce(valid);
    expect(await authorizeApplePurchaseWithReviewSupport(['proof'], 'Production', true, deps.get, e => e === mismatch)).toBe(false);
  });
  it('denies unbounded input before selecting an environment', async () => {
    const deps = factory();
    for (const proofs of [[], Array(9).fill('x'), ['x'.repeat(24001)]]) {
      expect(await authorizeApplePurchaseWithReviewSupport(proofs, 'Production', true, deps.get, () => true)).toBe(false);
    }
    expect(deps.get).not.toHaveBeenCalled();
  });
});

it('rejects a review purchase revoked in the latest Apple response', async () => {
  const mismatch = new Error('environment');
  const sandbox = { ...valid, environment: 'Sandbox' };
  let calls = 0;
  const get = (environment: string) => ({
    verify: async () => { if (environment === 'Production') throw mismatch; return ++calls === 1 ? sandbox : { ...sandbox, revocationDate: 1 }; },
    latest: async () => 'latest',
  });
  expect(await authorizeApplePurchaseWithReviewSupport(['proof'], 'Production', true, get, e => e === mismatch)).toBe(false);
});
it('propagates temporary Sandbox verification failure instead of granting access', async () => {
  const mismatch = new Error('environment');
  const outage = Object.assign(new Error('OCSP'), { retryable: true });
  await expect(authorizeApplePurchaseWithReviewSupport(['proof'], 'Production', true, environment => ({
    verify: async () => { throw environment === 'Production' ? mismatch : outage; },
    latest: async () => '',
  }), e => e === mismatch)).rejects.toBe(outage);
});
