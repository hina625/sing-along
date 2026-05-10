/**
 * Calendar deep-link + ICS helpers.
 *
 * Zero OAuth, zero API keys — every major calendar provider accepts a templated
 * URL or an .ics file. Hosts click one button → their calendar opens with the
 * service pre-filled. Invitees use the same buttons or import the .ics.
 */

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;          // typically the meeting URL
  startISO: string;            // ISO 8601 — '2025-12-25T14:00:00.000Z'
  endISO: string;
}

// ---- Time formatters --------------------------------------------------------

// Google / Outlook / Yahoo all accept this format: 20251225T140000Z
const toCalendarStamp = (iso: string): string => {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]|\.\d{3}/g, '');
};

// ---- Provider URL builders --------------------------------------------------

export const googleCalendarUrl = (e: CalendarEvent): string => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${toCalendarStamp(e.startISO)}/${toCalendarStamp(e.endISO)}`,
  });
  if (e.description) params.set('details', e.description);
  if (e.location) params.set('location', e.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const outlookCalendarUrl = (e: CalendarEvent): string => {
  // Outlook web (outlook.live.com works for personal; outlook.office.com for M365)
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: e.title,
    startdt: e.startISO,
    enddt: e.endISO,
  });
  if (e.description) params.set('body', e.description);
  if (e.location) params.set('location', e.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

export const yahooCalendarUrl = (e: CalendarEvent): string => {
  const params = new URLSearchParams({
    v: '60',
    title: e.title,
    st: toCalendarStamp(e.startISO),
    et: toCalendarStamp(e.endISO),
  });
  if (e.description) params.set('desc', e.description);
  if (e.location) params.set('in_loc', e.location);
  return `https://calendar.yahoo.com/?${params.toString()}`;
};

// ---- ICS generator ----------------------------------------------------------

// RFC 5545 line folding: any line longer than 75 octets is wrapped with CRLF + space.
const fold = (line: string): string => {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    chunks.push((i === 0 ? '' : ' ') + line.slice(i, i + 73));
    i += 73;
  }
  return chunks.join('\r\n');
};

// Escape special chars per ICS TEXT type.
const escape = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export const icsContent = (e: CalendarEvent, uid?: string): string => {
  const dtStamp = toCalendarStamp(new Date().toISOString());
  const uniqueId = uid || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}@singalong`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Singalong//Worship & Meeting Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uniqueId}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${toCalendarStamp(e.startISO)}`,
    `DTEND:${toCalendarStamp(e.endISO)}`,
    fold(`SUMMARY:${escape(e.title)}`),
    e.description ? fold(`DESCRIPTION:${escape(e.description)}`) : '',
    e.location ? fold(`LOCATION:${escape(e.location)}`) : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(e.title)} starts in 15 minutes`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
};
