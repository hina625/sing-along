'use client';

import { useMemo, useState } from 'react';
import { Calendar, Download, Check, Copy } from 'lucide-react';
import { CalendarEvent, googleCalendarUrl, outlookCalendarUrl, yahooCalendarUrl } from '@/lib/calendar';

/**
 * Adds a meeting/service to popular calendars via deep links + an .ics download.
 * Use anywhere a host or invitee needs to "save the date".
 */
interface CalendarShareProps {
  /**
   * Meeting room id — used to point the .ics download at the server endpoint.
   * Optional: if absent, the .ics button is hidden (deep links still work since
   * we build the event payload client-side).
   */
  roomId?: string;
  title: string;
  /** Meeting URL. Used as both `location` and inside the description body. */
  meetingUrl: string;
  /** ISO 8601 start time. */
  startISO: string;
  /** ISO 8601 end time. If omitted, default = start + 60 minutes. */
  endISO?: string;
  /** Optional description body — appended after the join link. */
  description?: string;
  /** className passthrough so this fits inside any modal/card. */
  className?: string;
}

const CalendarShare = ({
  roomId,
  title,
  meetingUrl,
  startISO,
  endISO,
  description,
  className = '',
}: CalendarShareProps) => {
  const [copied, setCopied] = useState(false);

  const event: CalendarEvent = useMemo(() => {
    const end = endISO || new Date(new Date(startISO).getTime() + 60 * 60 * 1000).toISOString();
    const body = `Join here: ${meetingUrl}${description ? `\n\n${description}` : ''}`;
    return {
      title,
      description: body,
      location: meetingUrl,
      startISO,
      endISO: end,
    };
  }, [title, meetingUrl, startISO, endISO, description]);

  const links = useMemo(() => ({
    google: googleCalendarUrl(event),
    outlook: outlookCalendarUrl(event),
    yahoo: yahooCalendarUrl(event),
  }), [event]);

  const copyShareText = async () => {
    try {
      const ts = new Date(startISO).toLocaleString();
      await navigator.clipboard.writeText(`${title}\n${ts}\n${meetingUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`cal-share ${className}`}>
      <div className="cal-share-head">
        <Calendar size={16} className="text-deep-gold" />
        <span className="cal-share-title">Add to calendar</span>
      </div>
      <div className="cal-share-buttons">
        <a href={links.google} target="_blank" rel="noopener" className="cal-share-btn cal-share-btn-google">
          Google
        </a>
        <a href={links.outlook} target="_blank" rel="noopener" className="cal-share-btn cal-share-btn-outlook">
          Outlook
        </a>
        <a href={links.yahoo} target="_blank" rel="noopener" className="cal-share-btn cal-share-btn-yahoo">
          Yahoo
        </a>
        {roomId && (
          <a
            href={`/api/v1/meeting/${encodeURIComponent(roomId)}/ics`}
            download={`singalong-${roomId}.ics`}
            className="cal-share-btn cal-share-btn-ics"
          >
            <Download size={14} /> .ics
          </a>
        )}
        <button type="button" onClick={copyShareText} className="cal-share-btn cal-share-btn-copy">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="cal-share-foot">
        Reminder set for 15 minutes before — works with Google, Outlook, Apple Calendar, and any iCal app.
      </p>
    </div>
  );
};

export default CalendarShare;
