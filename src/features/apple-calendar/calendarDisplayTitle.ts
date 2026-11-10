/** Some device calendars expose a UUID as their actual title. Keep identity in the suffix. */
export function calendarDisplayTitle(title: string, ko: boolean) {
  const value = title.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return `${ko ? '이름 미지정 캘린더' : 'Unnamed calendar'} · ${value.slice(-4).toUpperCase()}`;
  }
  return value || (ko ? '이름 미지정 캘린더' : 'Unnamed calendar');
}
