import { buildNotifications, getReadIds, saveReadIds } from './notificationService';

jest.mock('./authService', () => ({ authenticatedFetch: jest.fn(), isAdmin: () => false }));

const now = new Date('2026-10-01T12:00:00Z').getTime();
const daysAgo = (n) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

const pending = (id, createdDaysAgo, name = 'Ana Trajkovska') => ({
  requestID: id,
  employeeName: name,
  status: 'Pending',
  leaveType: 'Vacation',
  startDate: '2026-10-12',
  endDate: '2026-10-16',
  createdAt: daysAgo(createdDaysAgo),
});

test('admins see every pending request; stale ones are flagged', () => {
  const items = buildNotifications(
    { allRequests: [pending('a', 1), pending('b', 5), { ...pending('c', 1), status: 'Approved' }] },
    { admin: true, now }
  );
  expect(items.map((n) => n.id)).toEqual(['leave-pending:a', 'leave-pending:b']);
  expect(items[0].title).toBe('Ana Trajkovska requested 5 days of vacation leave');
  expect(items[0].tone).toBe('amber');
  expect(items[1].body).toBe('Waiting for a decision for 5 days');
  expect(items[1].tone).toBe('red');
});

test('managers see their team, not the whole organisation', () => {
  const items = buildNotifications(
    { allRequests: [pending('org', 1)], teamPending: [pending('team', 1)] },
    { admin: false, now }
  );
  expect(items.map((n) => n.id)).toEqual(['leave-pending:team']);
});

test('employees hear about recent decisions, assets and documents only', () => {
  const items = buildNotifications(
    {
      myRequests: [
        { requestID: 'r1', status: 'Approved', leaveType: 'Sick', decisionAt: daysAgo(2), approvedByName: 'Bob Smith', startDate: '2026-09-01', endDate: '2026-09-01' },
        { requestID: 'r2', status: 'Rejected', leaveType: 'Vacation', decisionAt: daysAgo(45), startDate: '2026-08-01', endDate: '2026-08-02' },
        { requestID: 'r3', status: 'Pending', leaveType: 'Vacation', createdAt: daysAgo(1), startDate: '2026-11-01', endDate: '2026-11-02' },
      ],
      myAssets: [
        { assetID: 'x', name: 'ThinkPad X1', serialNumber: 'SN-1', assignmentDate: daysAgo(3) },
        { assetID: 'y', name: 'Old phone', assignmentDate: daysAgo(400) },
      ],
      myDocuments: [{ documentID: 'd', templateName: 'Employment Contract', generatedDate: daysAgo(4) }],
    },
    { admin: false, now }
  );
  expect(items.map((n) => n.id)).toEqual([
    'leave-decided:r1:Approved',
    'asset-assigned:x:' + daysAgo(3),
    'document:d',
  ]);
  expect(items[0].title).toBe('Your sick leave was approved');
  expect(items[0].body).toBe('by Bob Smith');
});

test('a re-decided request is a new notification', () => {
  const base = { requestID: 'r', leaveType: 'Vacation', decisionAt: daysAgo(1), startDate: '2026-09-01', endDate: '2026-09-02' };
  const approved = buildNotifications({ myRequests: [{ ...base, status: 'Approved' }] }, { now });
  const rejected = buildNotifications({ myRequests: [{ ...base, status: 'Rejected' }] }, { now });
  expect(approved[0].id).not.toBe(rejected[0].id);
});

test('missing sources are skipped rather than failing', () => {
  expect(buildNotifications({}, { admin: true, now })).toEqual([]);
});

test('read state is stored per user', () => {
  localStorage.clear();
  saveReadIds('user-1', new Set(['a', 'b']));
  expect([...getReadIds('user-1')]).toEqual(['a', 'b']);
  expect(getReadIds('user-2').size).toBe(0);
});

test('offset-less API timestamps are read as UTC; calendar dates and offsets are untouched', () => {
  const { parseInstant } = require('./notificationService');
  expect(parseInstant('2026-10-01T10:00:00').toISOString()).toBe('2026-10-01T10:00:00.000Z');
  expect(parseInstant('2026-10-01T10:00:00.123').toISOString()).toBe('2026-10-01T10:00:00.123Z');
  expect(parseInstant('2026-10-01T10:00:00+02:00').toISOString()).toBe('2026-10-01T08:00:00.000Z');
  expect(parseInstant('2026-10-01T10:00:00Z').toISOString()).toBe('2026-10-01T10:00:00.000Z');
  expect(parseInstant(null)).toBeNull();
});

test('delegations to me become notices; ones I gave, or that ended, do not', () => {
  const base = { delegatorName: 'Mia Manager', startDate: '2026-10-05T00:00:00', endDate: '2026-10-09T00:00:00', createdAt: daysAgo(1) };
  const items = buildNotifications(
    {
      meId: 'me',
      delegations: [
        { ...base, delegationID: 'a', delegateEmployeeID: 'me', status: 'Active' },
        { ...base, delegationID: 'b', delegateEmployeeID: 'me', status: 'Scheduled' },
        { ...base, delegationID: 'c', delegateEmployeeID: 'me', status: 'Revoked' },
        { ...base, delegationID: 'd', delegateEmployeeID: 'someone-else', delegatorEmployeeID: 'me', status: 'Active' },
      ],
    },
    { now }
  );
  expect(items.map((n) => n.id).sort()).toEqual(['delegation:a', 'delegation:b']);
  const active = items.find((n) => n.id === 'delegation:a');
  expect(active.title).toBe('Mia Manager asked you to cover their approvals');
  expect(active.to).toBe('/approval-cover');
  expect(items.find((n) => n.id === 'delegation:b').body).toMatch(/starts later/);
});

test('without my own id, delegations are not announced', () => {
  const items = buildNotifications(
    { delegations: [{ delegationID: 'a', delegateEmployeeID: 'x', status: 'Active', startDate: '2026-10-05', endDate: '2026-10-06' }] },
    { now }
  );
  expect(items).toEqual([]);
});

test('indirect and delegated team requests say why they reached me', () => {
  const items = buildNotifications(
    {
      teamPending: [
        { ...pending('direct', 1), approvalRoute: 'Direct report' },
        { ...pending('deleg', 1), approvalRoute: 'Delegated by Mia Manager' },
      ],
    },
    { admin: false, now }
  );
  expect(items.find((n) => n.id === 'leave-pending:direct').body).toBe('Waiting for your decision');
  expect(items.find((n) => n.id === 'leave-pending:deleg').body).toBe('Waiting for your decision · Delegated by Mia Manager');
});
