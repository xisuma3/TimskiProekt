import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import StatusBadge from './app/StatusBadge';

// Two-month range picker for leave. Values are "YYYY-MM-DD" strings, the same shape the
// date inputs used, so the form and API payload are unchanged. All maths is in whole UTC
// days so a timezone can never shift a date.
const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Diagonal hatching for days that are already requested (and the legend swatch for them).
const HATCH = 'bg-[image:repeating-linear-gradient(135deg,transparent_0_4px,var(--color-border)_4px_8px)]';

export const toDayNum = (s) => Math.floor(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / DAY);
export const toIso = (n) => new Date(n * DAY).toISOString().slice(0, 10);
const todayNum = () => {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY);
};
const fmt = (n, opts) => new Date(n * DAY).toLocaleDateString(undefined, { timeZone: 'UTC', ...opts });

// Month grid as day numbers, padded with nulls so the 1st lands on its weekday (Mon-first).
export const monthCells = (year, month) => {
  const first = Math.floor(Date.UTC(year, month, 1) / DAY);
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (new Date(first * DAY).getUTCDay() + 6) % 7;
  return [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => first + i)];
};

// Picking the end: the range may not run across a booked day.
export const firstBlockedBetween = (from, to, isBlocked) => {
  for (let d = from; d <= to; d++) if (isBlocked(d)) return d;
  return null;
};

const DateRangePicker = ({
  start, end, onChange, minDate, booked = [],
  // Wording for the summary line, so the picker reads right outside leave (e.g. cover).
  startPrompt = 'Select the first day of your leave.',
  endPrompt = 'select the last day',
}) => {
  const min = minDate ? toDayNum(minDate) : todayNum();
  const startNum = start ? toDayNum(start) : null;
  const endNum = end ? toDayNum(end) : null;

  const initial = new Date((startNum ?? min) * DAY);
  const [view, setView] = useState({ year: initial.getUTCFullYear(), month: initial.getUTCMonth() });
  const [hover, setHover] = useState(null);
  const [focusDay, setFocusDay] = useState(startNum ?? Math.max(min, todayNum()));
  const [notice, setNotice] = useState('');
  const gridRef = useRef(null);

  // Booked ranges -> a set of day numbers (pending/approved requests the server would refuse).
  const bookedDays = useMemo(() => {
    const set = new Set();
    for (const b of booked) {
      for (let d = toDayNum(b.startDate); d <= toDayNum(b.endDate); d++) set.add(d);
    }
    return set;
  }, [booked]);
  const isBooked = (d) => bookedDays.has(d);
  const isDisabled = (d) => d < min || isBooked(d);

  const months = [0, 1].map((offset) => {
    const dt = new Date(Date.UTC(view.year, view.month + offset, 1));
    return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() };
  });
  const visibleFirst = Math.floor(Date.UTC(months[0].year, months[0].month, 1) / DAY);
  const visibleLast = Math.floor(Date.UTC(months[1].year, months[1].month + 1, 0) / DAY);

  const shift = useCallback((delta) =>
    setView(({ year, month }) => {
      const dt = new Date(Date.UTC(year, month + delta, 1));
      return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() };
    }), []);
  const canGoBack = Date.UTC(view.year, view.month, 1) / DAY > min;

  // Keep keyboard focus on a visible day: page the months when arrowing past the edge.
  useEffect(() => {
    if (focusDay < visibleFirst) shift(-1);
    else if (focusDay > visibleLast) shift(1);
  }, [focusDay, visibleFirst, visibleLast, shift]);

  useEffect(() => {
    const el = gridRef.current?.querySelector(`[data-day="${focusDay}"]`);
    if (el && gridRef.current.contains(document.activeElement)) el.focus();
  }, [focusDay, view]);

  const pick = (d) => {
    if (isDisabled(d)) return;
    setNotice('');
    // Start a new range when there is none yet, a range is complete, or the click is before the start.
    if (startNum === null || endNum !== null || d < startNum) {
      onChange({ start: toIso(d), end: '' });
      return;
    }
    const blocked = firstBlockedBetween(startNum, d, isBooked);
    if (blocked !== null) {
      setNotice(`${fmt(blocked, { day: 'numeric', month: 'short' })} is already requested — a range can't include it.`);
      return;
    }
    onChange({ start, end: toIso(d) });
  };

  const onKeyDown = (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (step) {
      e.preventDefault();
      setFocusDay((d) => Math.max(min, d + step));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      shift(e.key === 'PageUp' ? -1 : 1);
    }
  };

  // While choosing the end, preview the range up to the hovered/focused day.
  const previewEnd = startNum !== null && endNum === null && hover !== null && hover >= startNum ? hover : null;
  const rangeEnd = endNum ?? previewEnd;
  const inRange = (d) => startNum !== null && rangeEnd !== null && d > startNum && d < rangeEnd;

  const today = todayNum();
  const dayCount = startNum !== null && endNum !== null ? endNum - startNum + 1 : null;

  return (
    <div className="relative rounded-xl border bg-card px-2.5 pt-3 pb-2.5 sm:px-4 sm:pt-3.5 sm:pb-3">
      <div className="pointer-events-none absolute inset-x-3 top-2.5 flex justify-between">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="pointer-events-auto"
          onClick={() => shift(-1)}
          disabled={!canGoBack}
          aria-label="Previous month"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="pointer-events-auto"
          onClick={() => shift(1)}
          aria-label="Next month"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>

      <div className="grid gap-7 md:grid-cols-2" ref={gridRef} onKeyDown={onKeyDown} onMouseLeave={() => setHover(null)}>
        {months.map(({ year, month }, idx) => (
          // Narrow screens show one month; the second returns from md up.
          <div key={`${year}-${month}`} className={cn(idx === 1 && 'hidden md:block')}>
            <div
              className="mb-1.5 flex h-8 items-center justify-center text-sm font-semibold uppercase tracking-wide text-muted-foreground"
              aria-live={idx === 0 ? 'polite' : undefined}
            >
              {fmt(Math.floor(Date.UTC(year, month, 1) / DAY), { month: 'long', year: 'numeric' })}
            </div>
            <div
              className="grid grid-cols-7 gap-y-1"
              role="group"
              aria-label={fmt(Math.floor(Date.UTC(year, month, 1) / DAY), { month: 'long', year: 'numeric' })}
            >
              {WEEKDAYS.map((w, i) => (
                <abbr
                  key={i}
                  title={WEEKDAY_NAMES[i]}
                  className={cn(
                    'cursor-default pb-1.5 text-center text-xs font-semibold no-underline',
                    i >= 5 ? 'text-muted-foreground/60' : 'text-muted-foreground',
                  )}
                >
                  {w}
                </abbr>
              ))}
              {monthCells(year, month).map((d, i) => {
                if (d === null) return <span key={`pad-${i}`} aria-hidden="true" />;
                const isStart = d === startNum;
                const isEnd = d === rangeEnd && rangeEnd !== null;
                const between = inRange(d);
                const disabled = isDisabled(d);
                const booked = isBooked(d);
                const weekday = (i % 7);
                const edge = isStart || isEnd;
                const preview = isEnd && previewEnd !== null && endNum === null;
                const label = fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  + (booked ? ', already requested' : '')
                  + (d < min ? ', unavailable' : '');
                return (
                  <button
                    key={d}
                    type="button"
                    data-day={d}
                    className={cn(
                      'relative h-9 rounded-lg text-sm font-medium outline-none transition-colors sm:h-[38px]',
                      'focus-visible:z-20 focus-visible:ring-3 focus-visible:ring-ring/50',
                      weekday >= 5 ? 'text-muted-foreground' : 'text-foreground',
                      !disabled && !edge && 'cursor-pointer hover:bg-primary/10',
                      disabled && 'cursor-not-allowed text-muted-foreground/50',
                      booked && cn('line-through', HATCH),
                      // The range: a continuous band between the two ends, square where it joins them.
                      between && 'rounded-none bg-primary/15 text-primary',
                      edge && 'z-10 bg-primary font-bold text-primary-foreground',
                      preview && 'bg-primary/35 font-medium text-foreground',
                      isStart && rangeEnd !== null && rangeEnd > d && 'rounded-r-none',
                      isEnd && startNum !== null && d > startNum && 'rounded-l-none',
                      // Today: a dot under the date, light on a filled edge.
                      d === today && 'after:absolute after:bottom-[5px] after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full',
                      d === today && (edge && !preview ? 'after:bg-primary-foreground' : 'after:bg-primary'),
                    )}
                    disabled={disabled}
                    tabIndex={d === focusDay ? 0 : -1}
                    aria-pressed={isStart || (endNum !== null && d === endNum)}
                    aria-label={label}
                    title={booked ? 'Already requested' : undefined}
                    onClick={() => pick(d)}
                    onMouseEnter={() => setHover(d)}
                    onFocus={() => { setFocusDay(d); setHover(d); }}
                  >
                    {new Date(d * DAY).getUTCDate()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t pt-3 text-sm">
        <div aria-live="polite">
          {startNum === null && <span className="text-muted-foreground">{startPrompt}</span>}
          {startNum !== null && endNum === null && (
            <span>
              <strong>{fmt(startNum, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
              <span className="text-muted-foreground"> → {endPrompt}</span>
            </span>
          )}
          {dayCount !== null && (
            <span>
              <strong>{fmt(startNum, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
              {' → '}
              <strong>{fmt(endNum, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>
              <StatusBadge tone="primary" className="ml-2">{dayCount} {dayCount === 1 ? 'day' : 'days'}</StatusBadge>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {bookedDays.size > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn('size-3.5 rounded-sm border', HATCH)} aria-hidden="true" />
              Already requested
            </span>
          )}
          {startNum !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="font-semibold text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => { setNotice(''); onChange({ start: '', end: '' }); }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>
      {notice && (
        <div className="mt-2.5 flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {notice}
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
