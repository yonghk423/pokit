export type MedicineDetailDataConfig = {
  doseLabel: string;
  dosesPerDay: number;
  takenCount: number;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function clampStr(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

export function normalizeMedicineDetailConfig(raw: unknown): MedicineDetailDataConfig {
  const o = asObj(raw);
  const doseLabel = clampStr(o.doseLabel, 48) || '비타민';
  const dosesPerDay = Math.max(1, Math.min(12, Number(o.dosesPerDay) || 3));
  const takenRaw = Number(o.takenCount);
  const takenCount = Math.max(0, Math.min(dosesPerDay, Number.isFinite(takenRaw) ? takenRaw : 0));
  return { doseLabel, dosesPerDay, takenCount };
}

export function getInitialMedicineDataConfig(): MedicineDetailDataConfig {
  return { doseLabel: '비타민', dosesPerDay: 3, takenCount: 0 };
}
