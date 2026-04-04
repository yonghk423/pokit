import { View } from 'react-native';

import { MedicineSessionCard } from '@widgets/active-session-card';

import {
  SESSION_PREVIEW_PROGRESS01,
  SessionPreviewFootnote,
  sessionPreviewRemainingSec,
} from '../../lib/sessionPreviewShared';
import { normalizeMedicineDetailConfig } from './medicineConfig';

export function MedicinePreview({
  rhythmTitle,
  dataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
}) {
  const c = normalizeMedicineDetailConfig(dataConfig);

  return (
    <View style={{ gap: 10 }}>
      <MedicineSessionCard
        data={c}
        remainingSec={sessionPreviewRemainingSec()}
        progress01={SESSION_PREVIEW_PROGRESS01}
        isPaused={false}
      />
      <SessionPreviewFootnote rhythmTitle={rhythmTitle} />
    </View>
  );
}
