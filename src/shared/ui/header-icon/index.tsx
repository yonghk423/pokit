import { Image } from 'react-native';

const SOURCES = {
  daily: require('../../../../assets/header-icons/daily.webp'),
  'lock-memo': require('../../../../assets/header-icons/lock-memo.webp'),
  note: require('../../../../assets/header-icons/note.webp'),
  reading: require('../../../../assets/header-icons/reading.webp'),
  settings: require('../../../../assets/header-icons/settings.webp'),
  calendar: require('../../../../assets/header-icons/calendar.webp'),
  clock: require('../../../../assets/header-icons/clock.webp'),
  list: require('../../../../assets/header-icons/list.webp'),
} as const;

export type HeaderIconName = keyof typeof SOURCES;

/** Explicit point sizes keep generated artwork inside the existing toolbar buttons. */
export function HeaderIcon({ name, size = 22 }: { name: HeaderIconName; size?: number }) {
  return (
    <Image
      source={SOURCES[name]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
