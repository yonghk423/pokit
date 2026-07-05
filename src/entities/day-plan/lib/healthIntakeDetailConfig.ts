import {
  getInitialMedicineDataConfig,
  getInitialWaterDataConfig,
  normalizeMedicineDetailConfig,
  normalizeWaterDetailConfig,
  type MedicineDetailDataConfig,
  type WaterDetailDataConfig,
} from './goalCategorySessionConfig';
import { normalizeRoutineDisplayName, readRoutineDisplayNameFromConfig } from './routineDisplayName';
import { normalizeRoutineSummary } from './routineSummary';

export const HEALTH_INTAKE_CATEGORY_KEY = 'healthIntake';
export const HEALTH_INTAKE_LABEL_KO = '건강을 위한 섭취';

/** @deprecated 마이그레이션·히스토리 호환 */
export const LEGACY_WATER_CATEGORY_KEY = 'water';
/** @deprecated 마이그레이션·히스토리 호환 */
export const LEGACY_MEDICINE_CATEGORY_KEY = 'medicine';

export type HealthIntakeDetailDataConfig = {
  displayName: string;
  summary: string;
  water: WaterDetailDataConfig;
  medicine: MedicineDetailDataConfig;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function extractWaterConfigFromRaw(raw: unknown): WaterDetailDataConfig {
  const o = asObj(raw);
  if (o.water != null && typeof o.water === 'object') {
    return normalizeWaterDetailConfig(o.water);
  }
  return normalizeWaterDetailConfig(raw);
}

export function extractMedicineConfigFromRaw(raw: unknown): MedicineDetailDataConfig {
  const o = asObj(raw);
  if (o.medicine != null && typeof o.medicine === 'object') {
    return normalizeMedicineDetailConfig(o.medicine);
  }
  return normalizeMedicineDetailConfig(raw);
}

export function normalizeHealthIntakeDetailConfig(raw: unknown): HealthIntakeDetailDataConfig {
  const o = asObj(raw);
  const displayName = normalizeRoutineDisplayName(o.displayName);
  const summary = normalizeRoutineSummary(o.summary);
  const water = extractWaterConfigFromRaw(raw);
  const medicine = extractMedicineConfigFromRaw(raw);
  return {
    displayName,
    summary,
    water: { ...water, displayName, summary: '' },
    medicine: { ...medicine, displayName, summary: '' },
  };
}

export function getInitialHealthIntakeDataConfig(): HealthIntakeDetailDataConfig {
  return normalizeHealthIntakeDetailConfig({
    displayName: '',
    summary: '',
    water: getInitialWaterDataConfig(),
    medicine: getInitialMedicineDataConfig(),
  });
}

export function mergeLegacyHealthIntakeFromParts(
  waterRaw: unknown,
  medicineRaw: unknown,
): HealthIntakeDetailDataConfig {
  const waterName = readRoutineDisplayNameFromConfig(waterRaw);
  const medicineName = readRoutineDisplayNameFromConfig(medicineRaw);
  const displayName = waterName || medicineName || '';
  const waterSummary = normalizeRoutineSummary(asObj(waterRaw).summary);
  const medicineSummary = normalizeRoutineSummary(asObj(medicineRaw).summary);
  const summary = waterSummary || medicineSummary;
  return normalizeHealthIntakeDetailConfig({
    displayName,
    summary,
    water: waterRaw ?? {},
    medicine: medicineRaw ?? {},
  });
}

export function isHealthIntakeRelatedCategoryKey(key: string | null | undefined): boolean {
  const k = typeof key === 'string' ? key.trim() : '';
  return k === HEALTH_INTAKE_CATEGORY_KEY || k === LEGACY_WATER_CATEGORY_KEY || k === LEGACY_MEDICINE_CATEGORY_KEY;
}

export function resolveHealthIntakeCategoryKey(key: string | null | undefined): string {
  return isHealthIntakeRelatedCategoryKey(key) ? HEALTH_INTAKE_CATEGORY_KEY : (key ?? '').trim();
}

export function normalizeCatalogKeysAfterHealthIntakeMerge(keys: string[]): string[] {
  const out: string[] = [];
  let healthAdded = false;
  for (const raw of keys) {
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (!key) continue;
    if (key === LEGACY_WATER_CATEGORY_KEY || key === LEGACY_MEDICINE_CATEGORY_KEY) {
      if (!healthAdded) {
        out.push(HEALTH_INTAKE_CATEGORY_KEY);
        healthAdded = true;
      }
      continue;
    }
    if (key === HEALTH_INTAKE_CATEGORY_KEY) {
      if (!healthAdded) {
        out.push(HEALTH_INTAKE_CATEGORY_KEY);
        healthAdded = true;
      }
      continue;
    }
    out.push(key);
  }
  return out;
}

export function dedupeCatalogKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of keys) {
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
