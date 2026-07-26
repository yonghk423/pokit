import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { syncRoutineStartNotifications } from '@features/day-plan-notifications';
import {
  loadDayMealSlotSchedule,
  saveDayMealSlotSchedule,
  syncDayMealSlotScheduleWithPriorityWindow,
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
      void syncRoutineStartNotifications();
      return saved;
    },
    [],
  );

  const syncWithPriorityWindow = useCallback(
    (priorityStart: string, priorityEnd: string, spansNextDay = false) => {
      const saved = syncDayMealSlotScheduleWithPriorityWindow(
        priorityStart,
        priorityEnd,
        spansNextDay,
      );
      setSchedule((prev) => {
        if (
          prev.dawn === saved.dawn &&
          prev.morning === saved.morning &&
          prev.lunch === saved.lunch &&
          prev.dinner === saved.dinner &&
          prev.night === saved.night
        ) {
          return prev;
        }
        setRevision((n) => n + 1);
        void syncRoutineStartNotifications();
        return saved;
      });
      return saved;
    },
    [],
  );

  return { schedule, persistSchedule, reloadSchedule, syncWithPriorityWindow, revision };
}
