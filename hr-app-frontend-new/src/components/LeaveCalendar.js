import React, { useMemo, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';

const DAY = 24 * 60 * 60 * 1000;
const MAX_LANES = 3; // bars shown per week row before "+N more"
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS_CLASS = { Approved: 'is-approved', Pending: 'is-pending', Rejected: 'is-rejected' };

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
    <section className="cal" aria-label="Leave calendar">
      <div className="cal-toolbar">
        <div className="d-flex align-items-center gap-2">
          <Button variant="light" className="btn-icon" onClick={() => move(-1)} aria-label="Previous month">
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </Button>
          <Button variant="light" className="btn-icon" onClick={() => move(1)} aria-label="Next month">
            <i className="bi bi-chevron-right" aria-hidden="true" />
          </Button>
          <h2 className="cal-title" aria-live="polite">{title}</h2>
          <Button variant="light" size="sm" onClick={goToday}>Today</Button>
        </div>
        <div className="cal-legend">
          <span className="text-muted small">{inMonth.length} {inMonth.length === 1 ? 'request' : 'requests'}</span>
          <span className="cal-key is-approved">Approved</span>
          <span className="cal-key is-pending">Pending</span>
          {showRejected && <span className="cal-key is-rejected">Rejected</span>}
          <Form.Check
            type="switch"
            id="cal-show-rejected"
            label="Show rejected"
            checked={showRejected}
            onChange={(e) => setShowRejected(e.target.checked)}
            className="mb-0 small"
          />
        </div>
      </div>

      <div className="cal-grid">
        <div className="cal-weekdays" aria-hidden="true">
          {WEEKDAYS.map((d) => <div key={d} className="cal-weekday">{d}</div>)}
        </div>

        {weeks.map((week) => {
          const segments = layoutWeek(week, visible);
          const hiddenPerDay = week.map((day) =>
            segments.filter((s) => s.lane >= MAX_LANES && s.from <= day && s.to >= day).length
          );
          return (
            <div key={week[0]} className="cal-week">
              {week.map((day, i) => {
                const outside = day < monthStart || day > monthEnd;
                const weekend = i >= 5;
                return (
                  <div
                    key={day}
                    className={`cal-day${outside ? ' is-outside' : ''}${weekend ? ' is-weekend' : ''}${day === today ? ' is-today' : ''}`}
                    style={{ gridColumn: i + 1 }}
                    aria-hidden="true"
                  >
                    <span className="cal-date">{fromDayNumber(day).getUTCDate()}</span>
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
                    className={`cal-event ${STATUS_CLASS[s.r.status] || ''}${continuesBefore ? ' cont-before' : ''}${continuesAfter ? ' cont-after' : ''}`}
                    style={{ gridColumn: `${col} / span ${span}`, gridRow: s.lane + 2 }}
                    onClick={() => setSelected(s.r)}
                    aria-label={describe(s.r, showNames)}
                    title={describe(s.r, showNames)}
                  >
                    <span className="cal-event-text">{label(s.r)}</span>
                  </button>
                );
              })}

              {hiddenPerDay.map((count, i) => count > 0 && (
                <button
                  key={`more-${week[i]}`}
                  type="button"
                  className="cal-more"
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
      <Modal show={Boolean(selected)} onHide={() => setSelected(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Leave request</Modal.Title>
        </Modal.Header>
        <Modal.Body
          className="cal-detail"
          onClick={(e) => { if (e.target.closest('button')) setSelected(null); }}
        >
          {selected && renderDetails(selected)}
        </Modal.Body>
      </Modal>

      <Modal show={Boolean(dayList)} onHide={() => setDayList(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {dayList && fmtDay(dayList.day, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex flex-column gap-2">
            {dayList?.items.map((r) => (
              <button
                key={r.requestID}
                type="button"
                className={`cal-event cal-event-row ${STATUS_CLASS[r.status] || ''}`}
                onClick={() => { setDayList(null); setSelected(r); }}
              >
                <span className="cal-event-text">{label(r)}</span>
                <span className="ms-auto small">{fmtDay(dayNumber(r.startDate))} – {fmtDay(dayNumber(r.endDate))}</span>
              </button>
            ))}
          </div>
        </Modal.Body>
      </Modal>
    </section>
  );
};

export default LeaveCalendar;
