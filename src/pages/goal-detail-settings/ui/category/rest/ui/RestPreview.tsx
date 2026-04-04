import { View } from 'react-native';

import { RestSessionCard } from '@widgets/active-session-card';

import {
  SESSION_PREVIEW_PROGRESS01,
  SessionPreviewFootnote,
  sessionPreviewRemainingSec,
} from '../../lib/sessionPreviewShared';
import { normalizeRestDetailConfig } from './restConfig';

export function RestPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeRestDetailConfig(dataConfig);

  return (
    <View style={{ gap: 10 }}>
      <RestSessionCard
        data={c}
        remainingSec={sessionPreviewRemainingSec()}
        progress01={SESSION_PREVIEW_PROGRESS01}
        isPaused={false}
      />
      <SessionPreviewFootnote rhythmTitle={rhythmTitle} />
    </View>
  );
}
