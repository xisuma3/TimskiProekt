import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getUserInfo } from '../services/authService';
import { fetchNotifications, getReadIds, saveReadIds } from '../services/notificationService';

const POLL_MS = 60 * 1000;

const timeAgo = (date, now = Date.now()) => {
  const s = Math.round((now - new Date(date).getTime()) / 1000);
  // Future-dated records (seeded data, clock skew) show their date rather than "just now".
  if (s < -60) return new Date(date).toLocaleDateString();
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : new Date(date).toLocaleDateString();
};

export const useNotifications = () => {
  const userId = getUserInfo()?.userId;
  const [items, setItems] = useState([]);
  const [readIds, setReadIds] = useState(() => getReadIds(userId));
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setItems(await fetchNotifications());
    } catch {
      // Keep the last good list; the next poll retries.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const tick = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [refresh]);

  const markRead = useCallback((ids) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      saveReadIds(userId, next);
      return next;
    });
  }, [userId]);

  const unread = useMemo(() => items.filter((n) => !readIds.has(n.id)), [items, readIds]);
  return { items, readIds, unreadCount: unread.length, loading, refresh, markRead };
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const { items, readIds, unreadCount, loading, markRead } = useNotifications();
  const badge = unreadCount > 9 ? '9+' : String(unreadCount);

  const open = (n) => {
    markRead([n.id]);
    navigate(n.to);
  };

  return (
    <Dropdown align="end" className="notif">
      <Dropdown.Toggle
        as="button"
        className="btn btn-light theme-toggle notif-toggle"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <i className={`bi ${unreadCount ? 'bi-bell-fill' : 'bi-bell'}`} aria-hidden="true" />
        {unreadCount > 0 && <span className="notif-badge" aria-hidden="true">{badge}</span>}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notif-menu">
        <div className="notif-head">
          <span className="fw-bold">Notifications</span>
          {unreadCount > 0 && (
            <button type="button" className="notif-mark-all" onClick={() => markRead(items.map((n) => n.id))}>
              Mark all as read
            </button>
          )}
        </div>

        <div className="notif-list" role="list">
          {loading && items.length === 0 && (
            <div className="notif-empty"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading…</div>
          )}
          {!loading && items.length === 0 && (
            <div className="notif-empty">
              <i className="bi bi-bell-slash" aria-hidden="true" />
              <div className="fw-semibold">You’re all caught up</div>
              <small>Decisions, new assets and documents will show up here.</small>
            </div>
          )}
          {items.map((n) => {
            const unread = !readIds.has(n.id);
            return (
              <Dropdown.Item
                key={n.id}
                as="button"
                role="listitem"
                className={`notif-item ${unread ? 'is-unread' : ''}`}
                onClick={() => open(n)}
              >
                <span className={`notif-icon tone-${n.tone}`} aria-hidden="true"><i className={`bi ${n.icon}`} /></span>
                <span className="notif-text">
                  <span className="notif-title">{n.title}</span>
                  <span className="notif-body">{n.body}</span>
                  <span className="notif-time">{timeAgo(n.at)}</span>
                </span>
                {unread && <span className="notif-dot"><span className="visually-hidden">Unread</span></span>}
              </Dropdown.Item>
            );
          })}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default NotificationBell;
