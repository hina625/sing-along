'use client';

import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, X } from 'lucide-react';

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  icon: string | null;
  isRead: boolean;
  timestamp: string;
}

const POLL_MS = 30000;

const formatRelative = (iso: string) => {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
};

const NotificationBell = () => {
  const { user, isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/notifications?user_id=${user.id}&limit=20`, { cache: 'no-store' });
      const data = await res.json();
      if (data?.success) {
        setItems(data.notifications || []);
        setUnread(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('notification fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchNotifications();
    const t = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(t);
  }, [isSignedIn, fetchNotifications]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const markRead = async (id: string) => {
    setItems((cur) => cur.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      });
    } catch (err) {
      console.error('mark read failed', err);
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setItems((cur) => cur.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, markAllRead: true }),
      });
    } catch (err) {
      console.error('mark all read failed', err);
    }
  };

  if (!isSignedIn) return null;

  return (
    <div className="notif-bell-wrap" ref={containerRef}>
      <button
        type="button"
        className="notif-bell-trigger"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
      >
        <Bell size={22} />
        {unread > 0 && <span className="notif-bell-badge">{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-bell-dropdown" role="dialog" aria-label="Notifications">
          <div className="notif-bell-head">
            <span className="notif-bell-title">Notifications</span>
            <div className="notif-bell-head-actions">
              {unread > 0 && (
                <button type="button" onClick={markAllRead} title="Mark all read">
                  <CheckCheck size={16} /> Mark all read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notif-bell-list">
            {loading && items.length === 0 ? (
              <div className="notif-bell-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="notif-bell-empty">
                <Bell size={28} className="opacity-40 mb-2" />
                <p>You're all caught up.</p>
              </div>
            ) : (
              items.map((n) => {
                const Inner = (
                  <>
                    <span className="notif-bell-icon">{n.icon || '🔔'}</span>
                    <div className="notif-bell-body">
                      <div className="notif-bell-row">
                        <span className="notif-bell-line-title">{n.title}</span>
                        <span className="notif-bell-time">{formatRelative(n.timestamp)}</span>
                      </div>
                      {n.body && <div className="notif-bell-line-body">{n.body}</div>}
                    </div>
                    {!n.isRead && <span className="notif-bell-unread-dot" />}
                  </>
                );
                const onActivate = () => {
                  if (!n.isRead) markRead(n._id);
                  setOpen(false);
                };
                if (n.link) {
                  return (
                    <Link
                      key={n._id}
                      href={n.link}
                      onClick={onActivate}
                      className={`notif-bell-item ${n.isRead ? '' : 'is-unread'}`}
                    >
                      {Inner}
                    </Link>
                  );
                }
                return (
                  <button
                    key={n._id}
                    type="button"
                    onClick={onActivate}
                    className={`notif-bell-item notif-bell-item-button ${n.isRead ? '' : 'is-unread'}`}
                  >
                    {Inner}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
