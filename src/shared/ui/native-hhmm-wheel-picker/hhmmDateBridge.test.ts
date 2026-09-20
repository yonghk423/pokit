import { hhmmToPickerDate, pickerDateToHhmm } from './hhmmDateBridge';

describe('hhmmDateBridge', () => {
  it('maps HH:mm to picker Date hours/minutes', () => {
    const d = hhmmToPickerDate('07:00');
    expect(d.getHours()).toBe(7);
    expect(d.getMinutes()).toBe(0);
  });

  it('maps 24:00 to midnight for the picker', () => {
    const d = hhmmToPickerDate('24:00');
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('maps picker Date back to HH:mm', () => {
    const d = new Date();
    d.setHours(23, 0, 0, 0);
    expect(pickerDateToHhmm(d)).toBe('23:00');
  });

  it('maps midnight to 24:00 when mapMidnightToEndOfDay', () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    expect(pickerDateToHhmm(d, true)).toBe('24:00');
    expect(pickerDateToHhmm(d, false)).toBe('00:00');
  });
});
