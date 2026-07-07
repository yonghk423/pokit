import {
  formatMeasurementDelta,
  formatMeasurementValue,
  measurementQuickDeltas,
  measurementValuePrecision,
  resolveMeasurementUnitLabel,
  roundMeasurementValue,
} from './measurementUnits';

describe('measurementUnits', () => {
  it('formats values with unit-specific precision', () => {
    expect(formatMeasurementValue(68.5, 'kg')).toBe('68.5');
    expect(formatMeasurementValue(120, 'mmHg')).toBe('120');
    expect(formatMeasurementValue(8523, 'steps')).toBe('8523');
    expect(formatMeasurementValue(1.5, 'L')).toBe('1.5');
  });

  it('resolves custom unit label', () => {
    expect(resolveMeasurementUnitLabel('custom', '잔')).toBe('잔');
    expect(resolveMeasurementUnitLabel('kg')).toBe('kg');
    expect(resolveMeasurementUnitLabel('none')).toBe('');
  });

  it('returns unit-aware quick deltas', () => {
    expect(measurementQuickDeltas('ml')).toEqual([-250, -100, 100, 250]);
    expect(measurementQuickDeltas('steps')).toEqual([-1000, -500, 500, 1000]);
  });

  it('formats signed delta with precision', () => {
    expect(formatMeasurementDelta(120, 125, 'mmHg')).toBe('-5');
    expect(formatMeasurementDelta(68.5, 68.9, 'kg')).toBe('-0.4');
  });

  it('rounds saved values by unit precision', () => {
    expect(roundMeasurementValue(68.56, 'kg')).toBe(68.6);
    expect(roundMeasurementValue(120.4, 'mmHg')).toBe(120);
    expect(measurementValuePrecision('bpm')).toBe(0);
  });
});
