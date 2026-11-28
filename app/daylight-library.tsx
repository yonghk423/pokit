import { PokitStoryWebViewProgressLoader } from '@pages/pokit-story/ui/PokitStoryWebViewProgressLoader';
import { POKIT_STORY_ALLOWED_HOST_SUFFIXES, resolveDaylightLibraryUrl } from '@pages/pokit-story/config/pokitStoryUrl';
import { useTranslation } from '@shared/lib/i18n';
import { WebViewScreen } from '@shared/ui/web-view';

export default function DaylightLibraryScreen() {
  const { locale } = useTranslation();

  return (
    <WebViewScreen
      renderInitialLoading={progress => <PokitStoryWebViewProgressLoader library progress={progress} />}
      uri={resolveDaylightLibraryUrl(locale)}
      allowedHostSuffixes={POKIT_STORY_ALLOWED_HOST_SUFFIXES}
    />
  );
}
