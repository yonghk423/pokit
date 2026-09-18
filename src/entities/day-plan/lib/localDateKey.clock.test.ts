import { clearDevClock, setDevClockNow } from '@shared/lib/time/appClock';

import { getLocalDateKey } from './localDateKey';
import { getLocalMinutesOfDayNow } from './dayPlanTime';

describe('localDateKey follows app clock', () => {
  afterEach(() => {
    clearDevClock();
  });

  it('getLocalDateKey uses the dev clock override', () => {
    setDevClockNow(new Date(2026, 8, 19, 8, 0, 0));
    expect(getLocalDateKey()).toBe('2026-09-19');
    expect(getLocalMinutesOfDayNow()).toBe(8 * 60);
  });
});
