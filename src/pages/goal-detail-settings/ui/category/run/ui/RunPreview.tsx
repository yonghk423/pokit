import { View } from 'react-native';

import { RunningSessionCard } from '@widgets/active-session-card';

import {
  SESSION_PREVIEW_PROGRESS01,
  SessionPreviewFootnote,
  sessionPreviewRemainingSec,
} from '../../lib/sessionPreviewShared';
import { normalizeRunDetailConfig } from './runConfig';

export function RunPreview({ rhythmTitle, dataConfig }: { rhythmTitle: string; dataConfig: unknown }) {
  const c = normalizeRunDetailConfig(dataConfig);

  return (
    <View style={{ gap: 10 }}>
      <RunningSessionCard
        dataConfig={c}
        remainingSec={sessionPreviewRemainingSec()}
        progress01={SESSION_PREVIEW_PROGRESS01}
        isPaused={false}
      />
      <SessionPreviewFootnote rhythmTitle={rhythmTitle} />
    </View>
  );
}
