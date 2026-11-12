import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CircleCheck, CircleX, FileText, Hourglass, Laptop, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getUserInfo } from '../services/authService';
import { fetchNotifications, getReadIds, saveReadIds } from '../services/notificationService';

const POLL_MS = 60 * 1000;

// notificationService names its icons; anything unknown falls back to the bell.
const ICONS = { Hourglass, UserCheck, CircleCheck, CircleX, Laptop, FileText, UserPlus };
const TONES = {
  red: 'bg-destructive/10 text-destructive',
  amber: 'bg-warning/15 text-warning',
  green: 'bg-success/15 text-success',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  indigo: 'bg-primary/10 text-primary',
};

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white"
            >
              {badge}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="link" size="xs" className="h-auto p-0" onClick={() => markRead(items.map((n) => n.id))}>
              Mark all as read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />

        {loading && items.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner /> Loading…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-1 px-6 py-8 text-center">
            <BellOff className="mb-1 size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">You’re all caught up</p>
            <p className="text-xs text-muted-foreground">Decisions, new assets and documents will show up here.</p>
          </div>
        )}
        {items.length > 0 && (
          <ScrollArea className="max-h-96">
            <div className="p-1" role="list">
              {items.map((n) => {
                const unread = !readIds.has(n.id);
                const Icon = ICONS[n.icon] || Bell;
                return (
                  <DropdownMenuItem
                    key={n.id}
                    role="listitem"
                    onSelect={() => open(n)}
                    className={cn('items-start gap-3 py-2.5', unread && 'bg-primary/5')}
                  >
                    <span
                      className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full', TONES[n.tone] || TONES.indigo)}
                      aria-hidden="true"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="grid min-w-0 flex-1 gap-0.5">
                      <span className={cn('text-sm leading-snug', unread && 'font-medium')}>{n.title}</span>
                      <span className="text-xs text-muted-foreground">{n.body}</span>
                      <span className="text-xs text-muted-foreground/80">{timeAgo(n.at)}</span>
                    </span>
                    {unread && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
                        <span className="sr-only">Unread</span>
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
