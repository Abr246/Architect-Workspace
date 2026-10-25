import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchAvailableFields } from '../services/fieldsApi';
import { fetchAllBookings } from '../services/bookingsApi';
import { fetchAllEscalations } from '../services/escalationsApi';
import { fetchAuditEntries } from '../services/auditTrailApi';
import { buildActivityFeed, buildUpcomingBookingNotifications, ActivityItem } from '../utils/activityFeed';

const READ_STORAGE_KEY = 'goalkick-read-notifications';
export const NOTIFICATIONS_POLL_INTERVAL_MS = 30000;

// Read/unread state lives only in this browser's localStorage - no backend
// concept of "read" exists, and this app has no accounts/sessions to
// attach one to. Best-effort: if storage is unavailable (private browsing,
// blocked), notifications just start unread every time, which is honest
// rather than silently broken.
function loadReadIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((id): id is string => typeof id === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // Best-effort only; read state just won't survive a reload this time.
  }
}

export function useNotifications() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => loadReadIds());
  const [loadFailed, setLoadFailed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(() => {
    Promise.all([
      fetchAvailableFields(),
      fetchAllBookings(),
      fetchAuditEntries('booking'),
      fetchAuditEntries('scheduling_issue'),
      fetchAuditEntries('customer_issue'),
      fetchAllEscalations(),
    ])
      .then(([fields, bookings, bookingEntries, issueEntries, customerIssueEntries, escalations]) => {
        if (!mountedRef.current) return;
        const upcoming = buildUpcomingBookingNotifications(bookings, fields);
        const recent = buildActivityFeed(bookingEntries, issueEntries, customerIssueEntries, escalations, fields);
        setItems([...upcoming, ...recent]);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setLoadFailed(true);
      });
  }, []);

  useEffect(() => {
    load();
    const intervalId = window.setInterval(load, NOTIFICATIONS_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [load]);

  const markAsRead = useCallback((id: string) => {
    setReadIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((current) => {
      const next = new Set(current);
      for (const item of items) next.add(item.id);
      saveReadIds(next);
      return next;
    });
  }, [items]);

  const unreadCount = items.filter((item) => !readIds.has(item.id)).length;

  return { items, readIds, unreadCount, markAsRead, markAllAsRead, loadFailed };
}
