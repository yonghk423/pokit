import { Alert, Linking, Share } from 'react-native';

import {
  getSupportMailBody,
  getSupportMailSubject,
  SUPPORT_EMAIL,
} from './supportMailContent';

function showSupportMailFallback() {
  const subject = getSupportMailSubject();
  const body = getSupportMailBody();
  const message = `받는 주소: ${SUPPORT_EMAIL}\n제목: ${subject}\n\n${body}`;
  Alert.alert(
    '메일을 바로 열 수 없어요',
    '기기에 메일 계정이 없거나, 시뮬레이터 환경일 수 있어요. 공유로 보내거나 주소를 복사해 주세요. 실제 기기에서 메일을 설정하면 시스템 메일 작성 화면이 열립니다.',
    [
      {
        text: '공유하기',
        onPress: () => {
          void Share.share({ message, title: subject });
        },
      },
      {
        text: '주소 복사',
        onPress: async () => {
          try {
            const Clipboard = await import('expo-clipboard');
            await Clipboard.setStringAsync(SUPPORT_EMAIL);
            Alert.alert('복사했어요', '메일 앱에서 받는 사람란에 붙여넣기 해 주세요.');
          } catch {
            Alert.alert('복사 실패', `아래 주소를 직접 입력해 주세요.\n${SUPPORT_EMAIL}`);
          }
        },
      },
      { text: '닫기', style: 'cancel' },
    ],
  );
}

/** POKIT 고객센터: 네이티브 메일 작성 → mailto → 공유/복사 순으로 시도 */
export async function openSupportMailComposer(): Promise<void> {
  const subject = getSupportMailSubject();
  const body = getSupportMailBody();
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    const MailComposer = await import('expo-mail-composer');
    if (await MailComposer.isAvailableAsync()) {
      await MailComposer.composeAsync({
        recipients: [SUPPORT_EMAIL],
        subject,
        body,
      });
      return;
    }
  } catch {
    // 네이티브 모듈 미포함 등
  }

  try {
    await Linking.openURL(mailto);
    return;
  } catch {
    // mailto 실패
  }

  showSupportMailFallback();
}
