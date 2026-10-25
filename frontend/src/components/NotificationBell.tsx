import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { ActivityItem, notificationNavigationTarget } from '../utils/activityFeed';

type NotificationTarget = 'bookings' | 'scheduling-issues' | 'interactions';

interface Props {
  onNavigate: (view: NotificationTarget) => void;
}

// A booking event's own time, shown the way a person would say it - "Today
// at 7:00 PM" reads better than a full date, and still disambiguates once
// it's more than a day or two out.
function formatRelativeBookingTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(date) - startOfDay(now)) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return `Today at ${timeStr}`;
  if (diffDays === 1) return `Tomorrow at ${timeStr}`;
  if (diffDays === -1) return `Yesterday at ${timeStr}`;
  if (diffDays > 1 && diffDays < 7) return `${date.toLocaleDateString(undefined, { weekday: 'long' })} at ${timeStr}`;
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${timeStr}`;
}

// "Upcoming booking" notifications are a countdown, not a calendar time -
// that's what makes them feel like a reminder rather than a log entry.
function formatCountdown(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'Starting now';
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 60) return `In ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
  const diffHours = Math.round(diffMinutes / 60);
  return `In ${diffHours} hour${diffHours === 1 ? '' : 's'}`;
}

function subtitleFor(item: ActivityItem): string {
  if (item.category === 'upcoming_booking' && item.relevantTime && item.fieldName) {
    return `${item.fieldName} • ${formatCountdown(item.relevantTime)}`;
  }
  if (item.relevantTime && item.fieldName) {
    return `${item.fieldName} • ${formatRelativeBookingTime(item.relevantTime)}`;
  }
  return item.subtitleText ?? '';
}

export function NotificationBell({ onNavigate }: Props) {
  const { items, readIds, unreadCount, markAsRead, markAllAsRead, loadFailed } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleItemClick(item: ActivityItem) {
    markAsRead(item.id);
    setOpen(false);
    onNavigate(notificationNavigationTarget(item.category));
  }

  return (
    <div className="gk-notifications" ref={containerRef}>
      <button
        type="button"
        className="gk-notifications__bell"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        🔔
        {unreadCount > 0 && (
          <span className="gk-notifications__badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="gk-notifications__panel" aria-label="Notifications">
          <div className="gk-notifications__header">
            <span className="gk-notifications__title">Notifications</span>
            <button
              type="button"
              className="gk-notifications__mark-all"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>

          {items.length === 0 ? (
            <p className="gk-notifications__empty">
              {loadFailed ? "Couldn't load notifications right now." : "You're all caught up."}
            </p>
          ) : (
            <ul className="gk-notifications__list">
              {items.map((item) => {
                const isRead = readIds.has(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`gk-notifications__item ${
                        isRead ? 'gk-notifications__item--read' : 'gk-notifications__item--unread'
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      <span className="gk-notifications__item-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="gk-notifications__item-body">
                        <span className="gk-notifications__item-title">{item.title}</span>
                        <span className="gk-notifications__item-subtitle">{subtitleFor(item)}</span>
                      </span>
                      {!isRead && <span className="gk-notifications__dot" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
