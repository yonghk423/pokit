import Purchases from 'react-native-purchases';
import { configurePurchases, isPurchasesConfigured } from './configurePurchases';

jest.mock('@shared/config/revenueCat', () => ({ REVENUECAT_ENABLED: false, getRevenueCatApiKey: jest.fn() }));
jest.mock('react-native-purchases', () => ({ __esModule: true, default: { configure: jest.fn(), setLogLevel: jest.fn() }, LOG_LEVEL: { DEBUG: 'DEBUG' } }));

it('does not initialize the SDK or enable purchase actions during free operation', async () => {
  expect(await configurePurchases()).toBe(false);
  expect(isPurchasesConfigured()).toBe(false);
  expect(Purchases.configure).not.toHaveBeenCalled();
  expect(Purchases.setLogLevel).not.toHaveBeenCalled();
});
