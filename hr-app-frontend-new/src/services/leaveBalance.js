// Mirrors the server rule in LeaveRequestService.GuardSufficientBalance so the form can
// warn before submitting. The server stays the authority; this only explains the outcome early.
const DAY = 24 * 60 * 60 * 1000;

// Date inputs give "YYYY-MM-DD"; read them as UTC calendar days so no timezone shifts a day.
const toDay = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

const fmt = (n) => (Number.isInteger(+n) ? String(+n) : (+n).toFixed(1));
const plural = (n, word) => `${fmt(n)} ${word}${+n === 1 ? '' : 's'}`;

export const inclusiveDays = (start, end) => Math.floor((toDay(end) - toDay(start)) / DAY) + 1;

// Days of [start, end] that fall inside `year` — a request over New Year is charged to both.
export const daysInYear = (start, end, year) => {
  const from = Math.max(toDay(start), Date.UTC(year, 0, 1));
  const to = Math.min(toDay(end), Date.UTC(year, 11, 31));
  return to < from ? 0 : Math.floor((to - from) / DAY) + 1;
};

export const yearsSpanned = (start, end) => {
  const years = [];
  for (let y = +start.slice(0, 4); y <= +end.slice(0, 4); y++) years.push(y);
  return years;
};

/**
 * @param balancesByYear { [year]: LeaveBalanceResponseDto[] }
 * @returns { ok: boolean, reason: 'ok' | 'none' | 'short', message: string, years: [...] }
 */
export const checkAllowance = (balancesByYear, start, end, leaveType) => {
  const type = leaveType.toLowerCase();
  const total = inclusiveDays(start, end);
  const years = yearsSpanned(start, end).map((year) => {
    const need = daysInYear(start, end, year);
    const b = (balancesByYear[year] || []).find((x) => x.leaveType?.toLowerCase() === type);
    if (!b || !b.isTracked) return { year, need, tracked: false };
    const remaining = +b.daysRemaining;
    return { year, need, tracked: true, remaining, total: +b.totalAvailable, fits: need <= remaining };
  });

  const missing = years.find((y) => !y.tracked);
  if (missing) {
    return {
      ok: false,
      reason: 'none',
      years,
      message: `You don't have a ${type} leave allowance for ${missing.year}, so this request can't be submitted. Ask HR to set one up.`,
    };
  }

  const short = years.find((y) => !y.fits);
  if (short) {
    const span = years.length > 1 ? ` in ${short.year}` : '';
    const left = short.remaining <= 0
      ? `you have no ${type} days left${span}`
      : `you only have ${plural(short.remaining, 'day')} of ${type} leave left${span}`;
    return {
      ok: false,
      reason: 'short',
      years,
      message: `This request needs ${plural(short.need, 'day')}${span}, but ${left}. Shorten it or ask HR about your allowance.`,
    };
  }

  const summary = years
    .map((y) => `${plural(y.remaining - y.need, 'day')} left in ${y.year}`)
    .join(', ');
  return {
    ok: true,
    reason: 'ok',
    years,
    message: `Uses ${plural(total, 'day')} of ${type} leave. You'll have ${summary} after this request.`,
  };
};
