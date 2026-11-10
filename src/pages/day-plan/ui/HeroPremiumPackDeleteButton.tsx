import { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { SettingsPenIcon } from '../../settings/lib/settingsPen';
import { deletePremiumPack } from '../lib/heroPremiumPack';

export function HeroPremiumPackDeleteButton({ ink, onDeleted }: { ink: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel="시티팝 레트로 다운로드 삭제" disabled={busy} accessibilityState={{ disabled: busy, busy }} hitSlop={6} onPress={event => {
    event.stopPropagation();
    Alert.alert('시티팝 레트로 다운로드 삭제', '다운로드한 시티팝 레트로을 기기에서 삭제할까요? 일기에 사용한 사진은 유지됩니다. Pro 구독 중에는 횟수 제한 없이 다시 다운로드할 수 있어요.', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => {
        setBusy(true);
        void deletePremiumPack().then(onDeleted).catch(() => Alert.alert('삭제 실패', '잠시 후 다시 시도해주세요.')).finally(() => setBusy(false));
      } },
    ]);
  }} style={{ minHeight: 28, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, opacity: busy ? 0.45 : 1 }}><SettingsPenIcon name="trash.fill" size={22} color={ink} /></Pressable>;
}
