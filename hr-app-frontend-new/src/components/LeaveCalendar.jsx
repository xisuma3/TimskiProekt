import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const DAY = 24 * 60 * 60 * 1000;
const MAX_LANES = 3; // bars shown per week row before "+N more"
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Bars and legend keys per leave status. The text colour is the bar's accent (its left
// edge and focus ring use currentColor); the label inside stays text-foreground.
const STATUS_BAR = {
  Approved: 'bg-success/20 text-success',
  Pending: 'bg-warning/20 text-warning',
  Rejected: 'bg-destructive/15 text-destructive',
};
const STATUS_KEY = {
  Approved: 'border-success bg-success/20',
  Pending: 'border-warning bg-warning/20',
  Rejected: 'border-destructive bg-destructive/15',
};

// Leave dates are calendar days ("2026-12-21T00:00:00"). Work in whole UTC days so a
// timezone can never move a request onto the wrong date.
const dayNumber = (value) => {
  const s = String(value);
  return Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY);
};
const fromDayNumber = (n) => new Date(n * DAY);
const todayNumber = () => {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY);
};

const fmtDay = (n, opts = { day: 'numeric', month: 'short' }) =>
  fromDayNumber(n).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });

// Weeks (Mon–Sun) covering the month, as arrays of 7 day numbers.
export const monthWeeks = (year, month) => {
  const first = Math.floor(Date.UTC(year, month, 1) / DAY);
  const last = Math.floor(Date.UTC(year, month + 1, 0) / DAY);
  const mondayOffset = (fromDayNumber(first).getUTCDay() + 6) % 7;
  const weeks = [];
  for (let start = first - mondayOffset; start <= last; start += 7) {
    weeks.push(Array.from({ length: 7 }, (_, i) => start + i));
  }
  return weeks;
};

// Clips each request to one week and packs the pieces into lanes so none overlap.
export const layoutWeek = (week, requests) => {
  const weekStart = week[0];
  const weekEnd = week[6];
  const segments = requests
    .map((r) => ({ r, start: dayNumber(r.startDate), end: dayNumber(r.endDate) }))
    .filter((s) => s.start <= weekEnd && s.end >= weekStart)
    .map((s) => ({
      ...s,
      from: Math.max(s.start, weekStart),
      to: Math.min(s.end, weekEnd),
    }))
    .sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from));

  const laneEnds = [];
  for (const seg of segments) {
    let lane = laneEnds.findIndex((end) => end < seg.from);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = seg.to;
    seg.lane = lane;
  }
  return segments;
};

const describe = (r, showNames) =>
  `${showNames ? `${r.employeeName}, ` : ''}${r.leaveType} leave, ${r.status}, ` +
  `${fmtDay(dayNumber(r.startDate))} to ${fmtDay(dayNumber(r.endDate))}`;

const LegendKey = ({ status }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
    <span className={cn('size-3 rounded-[3px] border-l-[3px]', STATUS_KEY[status])} aria-hidden="true" />
    {status}
  </span>
);

const LeaveCalendar = ({ requests, renderDetails, showNames = true }) => {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [showRejected, setShowRejected] = useState(false);
  const [selected, setSelected] = useState(null);   // one request
  const [dayList, setDayList] = useState(null);     // { day, items } for "+N more"

  const visible = useMemo(
    () => requests.filter((r) => showRejected || r.status !== 'Rejected'),
    [requests, showRejected]
  );
  const weeks = useMemo(() => monthWeeks(cursor.year, cursor.month), [cursor]);
  const today = todayNumber();

  const monthStart = Math.floor(Date.UTC(cursor.year, cursor.month, 1) / DAY);
  const monthEnd = Math.floor(Date.UTC(cursor.year, cursor.month + 1, 0) / DAY);
  const inMonth = visible.filter((r) => dayNumber(r.startDate) <= monthEnd && dayNumber(r.endDate) >= monthStart);

  const move = (delta) =>
    setCursor(({ year, month }) => {
      const d = new Date(Date.UTC(year, month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
  };

  const title = new Date(Date.UTC(cursor.year, cursor.month, 1))
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const label = (r) => (showNames ? `${r.employeeName} · ${r.leaveType}` : `${r.leaveType} leave`);

  return (
    <section
      className="overflow-hidden rounded-xl bg-card text-card-foreground shadow-xs ring-1 ring-foreground/10"
      aria-label="Leave calendar"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => move(-1)} aria-label="Previous month">
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => move(1)} aria-label="Next month">
            <ChevronRight aria-hidden="true" />
          </Button>
          <h2 className="mx-1.5 text-base font-semibold sm:min-w-[9.5em] sm:text-lg" aria-live="polite">{title}</h2>
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">{inMonth.length} {inMonth.length === 1 ? 'request' : 'requests'}</span>
          <LegendKey status="Approved" />
          <LegendKey status="Pending" />
          {showRejected && <LegendKey status="Rejected" />}
          <div className="flex items-center gap-2">
            <Switch id="cal-show-rejected" checked={showRejected} onCheckedChange={setShowRejected} />
            <Label htmlFor="cal-show-rejected" className="font-normal">Show rejected</Label>
          </div>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 border-b" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-1 py-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-2.5 sm:py-2 sm:text-left"
            >
              {d}
            </div>
          ))}
        </div>

        {weeks.map((week) => {
          const segments = layoutWeek(week, visible);
          const hiddenPerDay = week.map((day) =>
            segments.filter((s) => s.lane >= MAX_LANES && s.from <= day && s.to >= day).length
          );
          return (
            <div
              key={week[0]}
              // Row 1 holds the dates, then one row per lane (MAX_LANES), then "+N more".
              className="grid grid-cols-7 grid-rows-[30px_repeat(3,20px)_24px] gap-y-[3px] border-b pb-1.5 last:border-b-0 sm:grid-rows-[30px_repeat(3,26px)_24px]"
            >
              {week.map((day, i) => {
                const outside = day < monthStart || day > monthEnd;
                const weekend = i >= 5;
                return (
                  <div
                    key={day}
                    className={cn(
                      'row-span-full -mb-1.5 p-1 sm:px-2 sm:py-1.5',
                      i < 6 && 'border-r',
                      weekend && 'bg-muted/50',
                    )}
                    style={{ gridColumn: i + 1 }}
                    aria-hidden="true"
                  >
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        outside ? 'text-muted-foreground/50' : 'text-muted-foreground',
                        day === today && '-mt-[3px] -ml-1 inline-grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-primary-foreground',
                      )}
                    >
                      {fromDayNumber(day).getUTCDate()}
                    </span>
                  </div>
                );
              })}

              {segments.filter((s) => s.lane < MAX_LANES).map((s) => {
                const col = week.indexOf(s.from) + 1;
                const span = s.to - s.from + 1;
                const continuesBefore = s.start < s.from;
                const continuesAfter = s.end > s.to;
                return (
                  <button
                    key={`${s.r.requestID}-${week[0]}`}
                    type="button"
                    className={cn(
                      'z-[1] flex min-w-0 cursor-pointer items-center rounded-md border-l-[3px] border-current px-1 text-left text-[0.68rem] font-semibold outline-none transition-shadow sm:px-2 sm:text-xs',
                      'hover:ring-2 hover:ring-current hover:ring-offset-2 hover:ring-offset-card focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                      STATUS_BAR[s.r.status],
                      // A bar that carries on into the previous/next week loses its rounded edge on that side.
                      continuesBefore ? 'ml-0 rounded-l-none border-l-0' : 'ml-0.5 sm:ml-1',
                      continuesAfter ? 'mr-0 rounded-r-none' : 'mr-0.5 sm:mr-1',
                    )}
                    style={{ gridColumn: `${col} / span ${span}`, gridRow: s.lane + 2 }}
                    onClick={() => setSelected(s.r)}
                    aria-label={describe(s.r, showNames)}
                    title={describe(s.r, showNames)}
                  >
                    <span className={cn('truncate text-foreground', s.r.status === 'Rejected' && 'line-through')}>{label(s.r)}</span>
                  </button>
                );
              })}

              {hiddenPerDay.map((count, i) => count > 0 && (
                <button
                  key={`more-${week[i]}`}
                  type="button"
                  className="z-[1] mx-1.5 cursor-pointer justify-self-start rounded px-1 text-xs font-semibold text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/50"
                  style={{ gridColumn: i + 1, gridRow: MAX_LANES + 2 }}
                  onClick={() => setDayList({
                    day: week[i],
                    items: segments.filter((s) => s.from <= week[i] && s.to >= week[i]).map((s) => s.r),
                  })}
                >
                  +{count} more
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* One request: reuse the page's own card so its actions (approve/reject) work here too.
          Any button inside closes this dialog first, so a follow-up dialog isn't stacked on it. */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Leave request</DialogTitle>
            <DialogDescription className="sr-only">{selected && describe(selected, showNames)}</DialogDescription>
          </DialogHeader>
          {/* The card sits flat inside the dialog: no second border or padding. */}
          <div
            className="[&_[data-slot=card-content]]:p-0 [&_[data-slot=card]]:shadow-none! [&_[data-slot=card]]:ring-0"
            onClick={(e) => { if (e.target.closest('button')) setSelected(null); }}
          >
            {selected && renderDetails(selected)}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(dayList)} onOpenChange={(open) => { if (!open) setDayList(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dayList && fmtDay(dayList.day, { weekday: 'long', day: 'numeric', month: 'long' })}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {dayList && `${dayList.items.length} ${dayList.items.length === 1 ? 'request' : 'requests'} on this day`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {dayList?.items.map((r) => (
              <button
                key={r.requestID}
                type="button"
                className={cn(
                  'flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-md border-l-[3px] border-current px-3 py-2 text-left text-sm font-semibold outline-none transition-shadow',
                  'hover:ring-2 hover:ring-current hover:ring-offset-2 hover:ring-offset-popover focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                  STATUS_BAR[r.status],
                )}
                onClick={() => { setDayList(null); setSelected(r); }}
              >
                <span className={cn('truncate text-foreground', r.status === 'Rejected' && 'line-through')}>{label(r)}</span>
                <span className="ml-auto whitespace-nowrap text-xs font-normal text-muted-foreground">
                  {fmtDay(dayNumber(r.startDate))} – {fmtDay(dayNumber(r.endDate))}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default LeaveCalendar;
