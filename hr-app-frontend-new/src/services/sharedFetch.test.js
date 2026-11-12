import { getJsonShared, getMyProfile } from './sharedFetch';
import { authenticatedFetch } from './authService';

vi.mock('./authService', () => ({ authenticatedFetch: vi.fn() }));

const ok = (body) => ({ ok: true, status: 200, json: async () => body });

beforeEach(() => { authenticatedFetch.mockReset(); });

test('calls for the same URL made while one is in flight share it', async () => {
  let resolve;
  authenticatedFetch.mockReturnValue(new Promise((r) => { resolve = r; }));

  const a = getMyProfile();
  const b = getMyProfile();
  resolve(ok({ employeeID: 'me' }));

  expect(await a).toEqual({ employeeID: 'me' });
  expect(await b).toEqual({ employeeID: 'me' });
  expect(authenticatedFetch).toHaveBeenCalledTimes(1);
});

test('each caller gets its own copy, so sorting one does not reorder the other', async () => {
  authenticatedFetch.mockResolvedValue(ok([{ n: 2 }, { n: 1 }]));

  const [a, b] = await Promise.all([getJsonShared('/x'), getJsonShared('/x')]);
  a.sort((p, q) => p.n - q.n);

  expect(b.map((i) => i.n)).toEqual([2, 1]);
  expect(authenticatedFetch).toHaveBeenCalledTimes(1);
});

test('a later call fetches afresh; a missing profile is null and a failed GET rejects', async () => {
  authenticatedFetch.mockResolvedValueOnce(ok({ employeeID: 'me' }));
  await getMyProfile();
  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
  expect(await getMyProfile()).toBeNull();
  expect(authenticatedFetch).toHaveBeenCalledTimes(2);

  authenticatedFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
  await expect(getJsonShared('/admin-only')).rejects.toThrow('403');
});
