import { ThemedText } from '@shared/ui/themed-text';

/** 목표 상세 — 액티브 세션 카드 미리보기용 고정 예시 구간·진행도 */
export const SESSION_PREVIEW_TOTAL_SEC = 45 * 60;
export const SESSION_PREVIEW_PROGRESS01 = 0.35;

export function sessionPreviewRemainingSec(): number {
  return Math.max(0, Math.round(SESSION_PREVIEW_TOTAL_SEC * (1 - SESSION_PREVIEW_PROGRESS01)));
}

export function SessionPreviewFootnote({ rhythmTitle }: { rhythmTitle: string }) {
  const t = typeof rhythmTitle === 'string' ? rhythmTitle.trim() : '';
  return (
    <ThemedText
      style={{ fontSize: 12, fontWeight: '600', paddingHorizontal: 2 }}
      lightColor="#52525b"
      darkColor="rgba(255,255,255,0.45)">
      {t
        ? `「${t}」 플로우를 시작하면 앱 세션에서 위 레이아웃이에요. (예시 타이머·진행도)`
        : '플로우를 시작하면 앱 세션에서 위 레이아웃이에요. (예시 타이머·진행도)'}
    </ThemedText>
  );
}
