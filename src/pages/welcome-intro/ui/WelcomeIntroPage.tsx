import { Redirect } from 'expo-router';

/** Keep old links valid without reopening the retired tutorial. */
export function WelcomeIntroPage() {
  return <Redirect href="/(tabs)" />;
}
