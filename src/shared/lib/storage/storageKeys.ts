export const StorageKeys = {
  routines: 'lockflow:routines',
  routineExecutions: 'lockflow:routine-executions',
  settings: 'lockflow:settings',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

