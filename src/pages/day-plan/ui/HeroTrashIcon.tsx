import { DiaryItemImage } from './DiaryItemImage';
import { useEffect, useState } from 'react';
import { TrashIcon } from '@shared/ui/icon-symbol/TrashIcon';
import { useDiaryTheme } from '../model/diaryTheme';
import { useHeroTrashBinStyle } from '../model/heroTrashBinStyle';
import { diaryImages, installDiaryItem } from '../lib/calendarStoreDownload';

// Both mounted diary views can request the upgrade for an older empty-only download.
const upgrades = new Map<string, Promise<void>>();
function upgrade(id: string) {
  const pending = upgrades.get(id);
  if (pending) return pending;
  const request = installDiaryItem(id).finally(() => upgrades.delete(id));
  upgrades.set(id, request);
  return request;
}

export function HeroTrashIcon(props: Parameters<typeof TrashIcon>[0]) {
  const selectedStyle = useHeroTrashBinStyle();
  const theme = useDiaryTheme('trash');
  const id = theme?.id;
  const filledUri = id && diaryImages(id)?.filled;
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!id || filledUri) return;
    let mounted = true;
    void upgrade(id).then(() => { if (mounted) refresh(value => value + 1); }).catch(() => {});
    return () => { mounted = false; };
  }, [id, filledUri, props.filled]);
  if (!theme) return <TrashIcon {...props} variant={props.variant ?? selectedStyle} />;
  const size = props.size ?? 29;
  return <DiaryItemImage accessible={false} source={props.filled && filledUri ? { uri: filledUri } : theme.source}
    contentFit="contain" style={{ width: size, height: size }} />;
}
