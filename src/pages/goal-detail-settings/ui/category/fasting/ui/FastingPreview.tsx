import { View } from 'react-native';

import { FastingSessionCard } from '@widgets/active-session-card';

import {
  SESSION_PREVIEW_PROGRESS01,
  SessionPreviewFootnote,
  sessionPreviewRemainingSec,
} from '../../lib/sessionPreviewShared';
import { normalizeFastingDetailConfig } from './fastingConfig';

export function FastingPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeFastingDetailConfig(dataConfig);

  return (
    <View style={{ gap: 10 }}>
      <FastingSessionCard
        data={c}
        remainingSec={sessionPreviewRemainingSec()}
        progress01={SESSION_PREVIEW_PROGRESS01}
        isPaused={false}
      />
      <SessionPreviewFootnote rhythmTitle={rhythmTitle} />
    </View>
  );
}
