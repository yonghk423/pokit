import { POKIT_STORY_ALLOWED_HOST_SUFFIXES, resolveDaylightLibraryUrl } from '@pages/pokit-story/config/pokitStoryUrl';
import { useTranslation } from '@shared/lib/i18n';
import { WebViewScreen } from '@shared/ui/web-view';

export default function DaylightLibraryScreen() {
  const { locale } = useTranslation();

  return (
    <WebViewScreen
      uri={resolveDaylightLibraryUrl(locale)}
      allowedHostSuffixes={POKIT_STORY_ALLOWED_HOST_SUFFIXES}
    />
  );
}
