import { View } from 'react-native';

import { MeditationSessionCard } from '@widgets/active-session-card';

import {
  SESSION_PREVIEW_PROGRESS01,
  SessionPreviewFootnote,
  sessionPreviewRemainingSec,
} from '../../lib/sessionPreviewShared';
import { normalizeMeditationDetailConfig } from './meditationConfig';

export function MeditationPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeMeditationDetailConfig(dataConfig);

  return (
    <View style={{ gap: 10 }}>
      <MeditationSessionCard
        data={c}
        remainingSec={sessionPreviewRemainingSec()}
        progress01={SESSION_PREVIEW_PROGRESS01}
        isPaused={false}
      />
      <SessionPreviewFootnote rhythmTitle={rhythmTitle} />
    </View>
  );
}
