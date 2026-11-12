import { authenticatedFetch } from './authService';
import { API_URLS } from '../config/api';

// Several parts of a page load the same "my …" data as it opens: the dashboard and the
// notification bell both want my profile, assets and leave requests, and React's dev mode
// mounts each of them twice. GETs for the same URL made while one is in flight share that
// request; once it settles the next call fetches afresh, so nothing is ever served stale.
// Every caller gets its own copy of the body, so one sorting or editing it can't affect
// another.
const inFlight = new Map();

const shared = (url) => {
  if (!inFlight.has(url)) {
    inFlight.set(url, Promise.resolve(authenticatedFetch(url))
      .then(async (res) => ({ ok: res.ok, status: res.status, body: res.ok ? await res.json() : null }))
      .finally(() => { inFlight.delete(url); }));
  }
  return inFlight.get(url).then((r) => ({ ...r, body: structuredClone(r.body) }));
};

// The parsed body; rejects (with the status as the message) when the response isn't OK.
export const getJsonShared = async (url) => {
  const r = await shared(url);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.body;
};

// The caller's employee record, or null when the account has none (404).
export const getMyProfile = async () => (await shared(API_URLS.EMPLOYEES.GET_MY_PROFILE())).body;
