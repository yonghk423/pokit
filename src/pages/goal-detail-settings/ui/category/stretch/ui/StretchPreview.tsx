import { View } from 'react-native';

import { StretchSessionCard } from '@widgets/active-session-card';

import {
  SESSION_PREVIEW_PROGRESS01,
  SessionPreviewFootnote,
  sessionPreviewRemainingSec,
} from '../../lib/sessionPreviewShared';
import { normalizeStretchDetailConfig } from './stretchConfig';

export function StretchPreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeStretchDetailConfig(dataConfig);

  return (
    <View style={{ gap: 10 }}>
      <StretchSessionCard
        data={c}
        remainingSec={sessionPreviewRemainingSec()}
        progress01={SESSION_PREVIEW_PROGRESS01}
        isPaused={false}
      />
      <SessionPreviewFootnote rhythmTitle={rhythmTitle} />
    </View>
  );
}
