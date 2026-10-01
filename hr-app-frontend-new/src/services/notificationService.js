// Notifications are derived on the client from data the API already returns — there is
// no notification table. That keeps the backend untouched, at two costs worth knowing:
// read/unread state lives in this browser only, and nothing is "pushed"; the bell
// re-derives the list when it polls.
import { authenticatedFetch, isAdmin } from './authService';
import { API_URLS } from '../config/api';

const DAY = 24 * 60 * 60 * 1000;
export const RECENT_DAYS = 30;     // how far back decided/assigned/generated items reach
export const STALE_PENDING_DAYS = 3; // a pending request this old gets flagged as waiting
const MAX_READ_IDS = 300;

const days = (start, end) =>
  Math.round((new Date(end).setHours(0, 0, 0, 0) - new Date(start).setHours(0, 0, 0, 0)) / DAY) + 1;

// Calendar date (YYYY-MM-DD…) shown as e.g. "12 Jun 2030", without timezone drift.
const fmtDay = (value) =>
  value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    })
    : '';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The API now sends instants with a UTC offset ("2026-10-01T10:00:00Z"; see
// HrAppDbContext.ConfigureUtcInstants). This stays as a safety net for any value that
// still arrives offset-less (older cached responses, raw SQL-seeded rows read elsewhere):
// such a timestamp is taken as UTC rather than local. Use it for instants only
// (createdAt, decisionAt, generatedDate) — never for calendar dates like startDate.
export const parseInstant = (value) => {
  if (!value) return null;
  const s = String(value);
  const hasTime = /T\d{2}:\d{2}/.test(s);
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(s);
  return new Date(hasTime && !hasOffset ? `${s}Z` : s);
};

const iso = (date) => (date ? date.toISOString() : null);

const isRecent = (date, now) => Boolean(date) && now - date.getTime() <= RECENT_DAYS * DAY;

const leaveLabel = (r) => `${(r.leaveType || 'Leave').toLowerCase()} leave`;

// Pure: turns API lists into notifications, newest first. Every source is optional so a
// failing endpoint only drops its own items.
export const buildNotifications = (
  { allRequests, teamPending, myRequests, myAssets, myDocuments, employees, delegations, meId },
  { admin = false, now = Date.now() } = {}
) => {
  const items = [];

  // Requests awaiting a decision: org-wide for admins; for everyone else, the people in
  // their reporting line plus anyone whose approvals they're covering.
  const pending = admin ? (allRequests || []).filter((r) => r.status === 'Pending') : teamPending || [];
  for (const r of pending) {
    const created = parseInstant(r.createdAt);
    const waited = created ? Math.max(0, Math.floor((now - created.getTime()) / DAY)) : 0;
    const stale = waited >= STALE_PENDING_DAYS;
    items.push({
      id: `leave-pending:${r.requestID}`,
      kind: 'approval',
      icon: 'bi-hourglass-split',
      tone: stale ? 'red' : 'amber',
      title: `${r.employeeName || 'An employee'} requested ${plural(days(r.startDate, r.endDate), 'day')} of ${leaveLabel(r)}`,
      body: [
        stale ? `Waiting for a decision for ${plural(waited, 'day')}` : 'Waiting for your decision',
        r.approvalRoute && r.approvalRoute !== 'Direct report' ? r.approvalRoute : null,
      ].filter(Boolean).join(' · '),
      at: iso(created),
      to: '/leave-requests',
    });
  }

  // Someone asked me to cover their approvals (active now or starting later).
  for (const d of delegations || []) {
    // Without my own id we can't tell given from received, so say nothing.
    const toMe = Boolean(meId) && d.delegateEmployeeID === meId;
    if (!toMe || (d.status !== 'Active' && d.status !== 'Scheduled')) continue;
    const created = parseInstant(d.createdAt);
    items.push({
      id: `delegation:${d.delegationID}`,
      kind: 'delegation',
      icon: 'bi-person-check',
      tone: 'sky',
      title: `${d.delegatorName || 'A manager'} asked you to cover their approvals`,
      body: `${fmtDay(d.startDate)} – ${fmtDay(d.endDate)}${d.status === 'Scheduled' ? ' · starts later' : ''}`,
      at: iso(created) || new Date(now).toISOString(),
      to: '/approval-cover',
    });
  }

  for (const r of myRequests || []) {
    const decided = parseInstant(r.decisionAt);
    if (r.status === 'Pending' || !isRecent(decided, now)) continue;
    const approved = r.status === 'Approved';
    items.push({
      id: `leave-decided:${r.requestID}:${r.status}`,
      kind: 'decision',
      icon: approved ? 'bi-check-circle' : 'bi-x-circle',
      tone: approved ? 'green' : 'red',
      title: `Your ${leaveLabel(r)} was ${approved ? 'approved' : 'rejected'}`,
      body: [r.approvedByName && `by ${r.approvedByName}`, r.decisionReason && `“${r.decisionReason}”`]
        .filter(Boolean)
        .join(' · ') || `${new Date(r.startDate).toLocaleDateString()} – ${new Date(r.endDate).toLocaleDateString()}`,
      at: iso(decided),
      to: '/leave-requests',
    });
  }

  for (const a of myAssets || []) {
    // assignmentDate is a calendar date (the backend stores .Date), so no UTC fix-up.
    if (!isRecent(a.assignmentDate ? new Date(a.assignmentDate) : null, now)) continue;
    items.push({
      id: `asset-assigned:${a.assetID}:${a.assignmentDate}`,
      kind: 'asset',
      icon: 'bi-laptop',
      tone: 'sky',
      title: `${a.name} was assigned to you`,
      body: a.serialNumber ? `Serial ${a.serialNumber}` : 'Check it in My Assets',
      at: a.assignmentDate,
      to: '/assets',
    });
  }

  for (const d of myDocuments || []) {
    const generated = parseInstant(d.generatedDate);
    if (!isRecent(generated, now)) continue;
    items.push({
      id: `document:${d.documentID}`,
      kind: 'document',
      icon: 'bi-file-earmark-text',
      tone: 'violet',
      title: `New document: ${d.templateName || d.documentType || 'HR document'}`,
      body: 'Ready to view and print',
      at: iso(generated),
      to: '/generated-documents',
    });
  }

  // Admins: people starting within the next two weeks.
  if (admin) {
    for (const e of employees || []) {
      const start = new Date(e.hireDate).getTime();
      if (!(start > now && start - now <= 14 * DAY)) continue;
      items.push({
        id: `starter:${e.employeeID}:${e.hireDate}`,
        kind: 'starter',
        icon: 'bi-person-plus',
        tone: 'indigo',
        title: `${e.firstName} ${e.lastName} starts on ${new Date(e.hireDate).toLocaleDateString()}`,
        body: [e.position, e.departmentName].filter(Boolean).join(' · ') || 'New starter',
        // Surface it as of "now" so it sorts with today's news rather than in the future.
        at: new Date(Math.min(start, now)).toISOString(),
        to: '/employees',
      });
    }
  }

  return items.sort((a, b) => new Date(b.at) - new Date(a.at));
};

// ---- read state (per user, this browser) ----
const readKey = (userId) => `notifications:read:${userId || 'anonymous'}`;

export const getReadIds = (userId) => {
  try {
    const raw = JSON.parse(localStorage.getItem(readKey(userId)) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch {
    return new Set();
  }
};

export const saveReadIds = (userId, ids) => {
  try {
    // Keep the newest ids only; old ones refer to items that have aged out anyway.
    localStorage.setItem(readKey(userId), JSON.stringify([...ids].slice(-MAX_READ_IDS)));
  } catch {
    // Storage blocked: read state just won't persist.
  }
};

// ---- fetching ----
const getJson = async (url) => {
  const res = await authenticatedFetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
};

const settle = (promise) => promise.then((v) => v, () => undefined);

export const fetchNotifications = async () => {
  const admin = isAdmin();
  const [allRequests, teamPending, myRequests, myAssets, myDocuments, employees, delegations, me] = await Promise.all([
    admin ? settle(getJson(API_URLS.LEAVE_REQUESTS.GET_ALL())) : undefined,
    admin ? undefined : settle(getJson(API_URLS.LEAVE_REQUESTS.GET_MY_TEAM(true))),
    settle(getJson(API_URLS.LEAVE_REQUESTS.GET_MY_REQUESTS())),
    settle(getJson(API_URLS.ASSETS.GET_MY_ASSETS())),
    settle(getJson(API_URLS.GENERATED_DOCUMENTS.GET_MY_DOCUMENTS())),
    admin ? settle(getJson(API_URLS.EMPLOYEES.GET_ALL())) : undefined,
    // Cover arranged for or by me; filtered to the ones where I'm the delegate.
    settle(getJson(API_URLS.APPROVAL_DELEGATIONS.GET_MINE())),
    settle(getJson(API_URLS.EMPLOYEES.GET_MY_PROFILE())),
  ]);
  return buildNotifications(
    { allRequests, teamPending, myRequests, myAssets, myDocuments, employees, delegations, meId: me?.employeeID },
    { admin }
  );
};
