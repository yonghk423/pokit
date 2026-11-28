import { PokitStoryWebViewProgressLoader } from './PokitStoryWebViewProgressLoader';
import { useRef } from 'react';
import { Platform, View } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import { WebViewScreen } from '@shared/ui/web-view';
import { useTranslation } from '@shared/lib/i18n';
import { POKIT_STORY_URL, resolveDaylightLibraryUrl } from '../config/pokitStoryUrl';

export type LibrarySelection = {
  source: 'yes24' | 'apple-books';
  book: { itemId: number; title: string; author: string; coverUrl: string; link: string; totalPages?: number };
};

function safeUrl(value: unknown, domain: string) {
  if (typeof value !== 'string' || value.length > 2048) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === domain || url.hostname.endsWith('.' + domain)) ? url.href : '';
  } catch { return ''; }
}

function parseSelection(data: unknown): LibrarySelection | null {
  if (!data || typeof data !== 'object') return null;
  const msg = data as Record<string, unknown>;
  if (msg.type !== 'daylight.selectBook.v1' || (msg.source !== 'yes24' && msg.source !== 'apple-books')) return null;
  const b = msg.book as Partial<LibrarySelection['book']> | null;
  if (!b || typeof b.itemId !== 'number' || !Number.isSafeInteger(b.itemId) || b.itemId < 1 || !b.title || typeof b.title !== 'string') return null;
  const link = safeUrl(b.link, msg.source === 'yes24' ? 'yes24.com' : 'books.apple.com');
  if (!link) return null;
  return { source: msg.source, book: {
    itemId: b.itemId, title: b.title.slice(0, 500), author: typeof b.author === 'string' ? b.author.slice(0, 300) : '',
    link, coverUrl: safeUrl(b.coverUrl, msg.source === 'yes24' ? 'yes24.com' : 'mzstatic.com'),
    totalPages: typeof b.totalPages === 'number' && Number.isSafeInteger(b.totalPages) && b.totalPages > 0 ? b.totalPages : undefined,
  } };
}

// Mount one picker per presentation so duplicate selection events are consumed only once.
export function LibraryPicker({ section, onSelect, onClose }: {
  section: 'search' | 'categories' | 'browse'; onSelect: (selection: LibrarySelection) => void; onClose: () => void;
}) {
  const { locale } = useTranslation();
  const consumed = useRef(false);
  const uri = resolveDaylightLibraryUrl(locale) + '&picker=1' + (section === 'browse' ? '' : '#library-' + section);
  return <AppModal visible nativeAnimation="slide" presentationStyle="pageSheet" allowSwipeDismissal onRequestClose={onClose}>
    <View style={{ flex: 1 }}>
      {Platform.OS === 'ios' && <View accessible={false} style={{ alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: '#C9C5BF', marginVertical: 4 }} />}
      <WebViewScreen
      renderInitialLoading={progress => <PokitStoryWebViewProgressLoader library progress={progress} />} uri={uri} topInset={Platform.OS !== 'ios'} pullToRefreshEnabled={false} allowedHostSuffixes={['www.pokitstory.com']} onMessage={(data, sender) => {
        if (consumed.current) return;
        const url = new URL(sender);
        if (url.origin !== POKIT_STORY_URL || !/^\/(ko|en|ja|zh-TW)\/app\/library\/?$/.test(url.pathname)) return;
        const selection = parseSelection(data);
        if (!selection) return;
        consumed.current = true;
        onSelect(selection);
        onClose();
      }} />
    </View>
  </AppModal>;
}
