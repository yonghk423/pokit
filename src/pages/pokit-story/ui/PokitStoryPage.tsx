import {
  POKIT_STORY_ALLOWED_HOST_SUFFIXES,
  POKIT_STORY_URL,
} from '../config/pokitStoryUrl';
import { WebViewScreen } from '@shared/ui/web-view';

/** POKIT 공식 웹사이트(pokitstory.com) WebView 탭 */
export function PokitStoryPage() {
  return (
    <WebViewScreen
      uri={POKIT_STORY_URL}
      allowedHostSuffixes={POKIT_STORY_ALLOWED_HOST_SUFFIXES}
    />
  );
}
