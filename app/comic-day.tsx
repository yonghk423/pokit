import { Redirect } from 'expo-router';

/** Compatibility for existing widget links; normal launch renders the home tab directly. */
export default function LegacyComicDayLink() {
  return <Redirect href="/(tabs)" />;
}
