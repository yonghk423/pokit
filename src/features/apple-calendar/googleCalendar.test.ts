import { connectGoogleCalendar, selectGoogleCalendar, useGoogleCalendar } from './googleCalendar';
import { googleSdk } from '../googleSignin';

jest.mock('../googleSignin', () => ({ googleSdk: jest.fn() }));
jest.mock('@shared/lib/storage/localStorageClient', () => ({
  localStorageClient: { getJson: () => null, setJson: jest.fn() },
}));

const scope = 'https://www.googleapis.com/auth/calendar.events.readonly';
const tasksScope = 'https://www.googleapis.com/auth/tasks.readonly';
const email = 'calendar@example.com';
const login = { type: 'success', data: { scopes: [], user: { email } } };
const sdk = { hasPlayServices: jest.fn(), signIn: jest.fn(), signInSilently: jest.fn(), addScopes: jest.fn() };
beforeEach(() => {
  selectGoogleCalendar(null);
  jest.mocked(googleSdk).mockReturnValue(sdk as unknown as ReturnType<typeof googleSdk>);
  sdk.signIn.mockResolvedValue(login);
});

it('connects after calendar read access is granted and can disconnect locally', async () => {
  sdk.addScopes.mockResolvedValue({ ...login, data: { ...login.data, scopes: [scope, tasksScope] } });
  await connectGoogleCalendar();
  expect(sdk.addScopes).toHaveBeenCalledWith({ scopes: [scope, tasksScope] });
  expect(useGoogleCalendar.getState()).toMatchObject({ email, tasksEmail: email });
  selectGoogleCalendar(null);
  expect(useGoogleCalendar.getState().email).toBeNull();
});

it('keeps the calendar disconnected when consent is cancelled', async () => {
  sdk.addScopes.mockResolvedValue({ type: 'cancelled' });
  await connectGoogleCalendar();
  expect(useGoogleCalendar.getState().email).toBeNull();
});

it('upgrades a legacy connection without losing calendar access if cancelled', async () => {
  selectGoogleCalendar(email);
  sdk.signInSilently.mockResolvedValue({ ...login, data: { ...login.data, scopes: [scope] } });
  sdk.addScopes.mockResolvedValueOnce({ type: 'cancelled' });
  await connectGoogleCalendar();
  expect(sdk.addScopes).toHaveBeenLastCalledWith({ scopes: [tasksScope] });
  expect(useGoogleCalendar.getState()).toMatchObject({ email, tasksEmail: null });
});
