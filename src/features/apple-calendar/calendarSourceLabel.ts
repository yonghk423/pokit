/** Never infer Apple or Google merely from a generic CalDAV account type. */
export function calendarSourceLabel(name = '', type = '', ko = true) {
  if (/google|gmail|googlemail/i.test(name)) return ko ? 'Google 캘린더' : 'Google Calendar';
  if (/icloud|apple|@(?:me|mac)\.com/i.test(name) || type === 'mobileme') return ko ? 'Apple 캘린더' : 'Apple Calendar';
  if (/^(default|local|on my iphone)$/i.test(name.trim()) || /^local$/i.test(type)) return ko ? 'Apple 캘린더 (iPhone 저장)' : 'Apple Calendar (On My iPhone)';
  if (/exchange/i.test(type) || /outlook|exchange/i.test(name)) return ko ? 'Outlook 캘린더' : 'Outlook Calendar';
  return name.trim() || (ko ? '연결된 캘린더' : 'Connected Calendar');
}
