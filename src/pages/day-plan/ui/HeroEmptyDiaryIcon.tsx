import { HeroCreateDiaryIcon } from './HeroCreateDiaryIcon';

/** A larger comic page invites the first story; the list toolbar uses a stack. */
export function HeroEmptyDiaryIcon({ color = '#30362B', size = 104 }: { color?: string; size?: number }) {
  return <HeroCreateDiaryIcon testID="comic-empty-diary-icon" variant="page" color={color} size={size} />;
}
