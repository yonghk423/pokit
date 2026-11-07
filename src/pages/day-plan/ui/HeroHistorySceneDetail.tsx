import { CloseIcon } from '@shared/ui/icon-symbol/CloseIcon';
import { View, Pressable } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComicDayScene } from '../lib/heroDayStorage';
import { HeroPolaroidPreview } from './HeroPolaroidPreview';
import { HeroImageActions } from './HeroImageActions';

/** History owns this detail; opening it never activates a diary on the main tab. */
export function HeroHistorySceneDetail({ scene, source, date, onClose }: {
  scene: ComicDayScene; source: ImageSourcePropType | undefined; date: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const paper = scene.paper ?? '#F7F6F4';
  const ink = scene.pen ?? '#292E28';
  return <AppModal visible animationType="fade" onRequestClose={onClose}>
    <View testID="history-scene-detail" style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12, paddingHorizontal: 12, backgroundColor: '#00000033' }}>
      <View style={{ flex: 1, width: '100%', maxWidth: 580, alignSelf: 'center', backgroundColor: paper, borderRadius: 16, overflow: 'hidden' }}>
        <PaperGrain />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, minHeight: 54 }}>
          <View />
          <Pressable accessibilityLabel={t('common.close')} onPress={onClose} style={{ padding: 10 }}><CloseIcon color={ink} /></Pressable>
        </View>
        <View style={{ flex: 1, minHeight: 0 }}>
          <HeroPolaroidPreview date={date} source={source} title={scene.title} pen={ink} fontId={scene.fontId} />

        </View>
          <View style={{ padding: 18, gap: 16 }}>
            <HeroImageActions directDownload uri={scene.artworkUri} source={typeof source === 'number' ? source : undefined} title={scene.title} memo={scene.memo} paper={paper} pen={ink} fontId={scene.fontId} exportDate={date} />
          </View>
        <Pressable onPress={onClose} style={{ alignSelf: 'flex-end', padding: 14, margin: 16 }}><ThemedText style={{ color: ink }}>{t('common.close')}</ThemedText></Pressable>
      </View>
    </View>
  </AppModal>;
}
