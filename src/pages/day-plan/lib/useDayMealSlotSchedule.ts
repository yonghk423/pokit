import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import {
  loadDayMealSlotSchedule,
  saveDayMealSlotSchedule,
  type DayMealSlotSchedule,
} from '@shared/lib/storage';

export function useDayMealSlotSchedule() {
  const [schedule, setSchedule] = useState(() => loadDayMealSlotSchedule());
  const [revision, setRevision] = useState(0);

  const reloadSchedule = useCallback(() => {
    setSchedule(loadDayMealSlotSchedule());
    setRevision((n) => n + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reloadSchedule();
    }, [reloadSchedule]),
  );

  const persistSchedule = useCallback(
    (next: DayMealSlotSchedule) => {
      const saved = saveDayMealSlotSchedule(next);
      setSchedule(saved);
      setRevision((n) => n + 1);
      return saved;
    },
    [],
  );

  return { schedule, persistSchedule, reloadSchedule, revision };
}
