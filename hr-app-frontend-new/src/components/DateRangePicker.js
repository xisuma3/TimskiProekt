import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Two-month range picker for leave. Values are "YYYY-MM-DD" strings, the same shape the
// date inputs used, so the form and API payload are unchanged. All maths is in whole UTC
// days so a timezone can never shift a date.
const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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

const DateRangePicker = ({ start, end, onChange, minDate, booked = [] }) => {
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
    <div className="drp">
      <div className="drp-nav">
        <button type="button" className="drp-nav-btn" onClick={() => shift(-1)} disabled={!canGoBack} aria-label="Previous month">
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        <button type="button" className="drp-nav-btn" onClick={() => shift(1)} aria-label="Next month">
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>

      <div className="drp-months" ref={gridRef} onKeyDown={onKeyDown} onMouseLeave={() => setHover(null)}>
        {months.map(({ year, month }, idx) => (
          <div key={`${year}-${month}`} className={`drp-month${idx === 1 ? ' drp-second' : ''}`}>
            <div className="drp-month-title" aria-live={idx === 0 ? 'polite' : undefined}>
              {fmt(Math.floor(Date.UTC(year, month, 1) / DAY), { month: 'long', year: 'numeric' })}
            </div>
            <div className="drp-grid" role="group" aria-label={fmt(Math.floor(Date.UTC(year, month, 1) / DAY), { month: 'long', year: 'numeric' })}>
              {WEEKDAYS.map((w, i) => (
                <abbr key={i} title={WEEKDAY_NAMES[i]} className={`drp-weekday${i >= 5 ? ' is-weekend' : ''}`}>{w}</abbr>
              ))}
              {monthCells(year, month).map((d, i) => {
                if (d === null) return <span key={`pad-${i}`} aria-hidden="true" />;
                const isStart = d === startNum;
                const isEnd = d === rangeEnd && rangeEnd !== null;
                const between = inRange(d);
                const disabled = isDisabled(d);
                const weekday = (i % 7);
                const classes = [
                  'drp-day',
                  weekday >= 5 && 'is-weekend',
                  d === today && 'is-today',
                  between && 'in-range',
                  (isStart || isEnd) && 'is-edge',
                  isStart && rangeEnd !== null && rangeEnd > d && 'is-range-start',
                  isEnd && startNum !== null && d > startNum && 'is-range-end',
                  isEnd && previewEnd !== null && endNum === null && 'is-preview',
                  isBooked(d) && 'is-booked',
                ].filter(Boolean).join(' ');
                const label = fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  + (isBooked(d) ? ', already requested' : '')
                  + (d < min ? ', unavailable' : '');
                return (
                  <button
                    key={d}
                    type="button"
                    data-day={d}
                    className={classes}
                    disabled={disabled}
                    tabIndex={d === focusDay ? 0 : -1}
                    aria-pressed={isStart || (endNum !== null && d === endNum)}
                    aria-label={label}
                    title={isBooked(d) ? 'Already requested' : undefined}
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

      <div className="drp-footer">
        <div className="drp-summary" aria-live="polite">
          {startNum === null && <span className="text-muted">Select the first day of your leave.</span>}
          {startNum !== null && endNum === null && (
            <span>
              <strong>{fmt(startNum, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
              <span className="text-muted"> → select the last day</span>
            </span>
          )}
          {dayCount !== null && (
            <span>
              <strong>{fmt(startNum, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>
              {' → '}
              <strong>{fmt(endNum, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</strong>
              <span className="status-chip is-primary ms-2">{dayCount} {dayCount === 1 ? 'day' : 'days'}</span>
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-3">
          {bookedDays.size > 0 && <span className="drp-key">Already requested</span>}
          {startNum !== null && (
            <button type="button" className="drp-clear" onClick={() => { setNotice(''); onChange({ start: '', end: '' }); }}>
              Clear
            </button>
          )}
        </div>
      </div>
      {notice && <div className="drp-notice" role="alert"><i className="bi bi-exclamation-circle me-2" aria-hidden="true" />{notice}</div>}
    </div>
  );
};

export default DateRangePicker;
