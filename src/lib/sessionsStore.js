/**
 * Small module-level cache + de-duped fetch for the signed-in user's
 * assessment list (GET /api/assessments), shared between Navbar
 * (hover/focus-prefetch) and Profile (actual render).
 *
 * Deliberately plain module state, not React state/context: Navbar needs
 * to kick off a fetch for a page the user may never actually navigate to,
 * and Profile needs a *synchronous* read on its very first render (via
 * useState's lazy initializer) so it can skip the loading skeleton
 * entirely when the data's already warm from a hover a moment earlier.
 */

let cachedSessions = null; // array | null - null means "not fetched yet"
let inFlightRequest = null; // Promise | null - de-dupes overlapping calls

/** Synchronous read - used by Profile's useState(() => getCachedSessions())
 * initializer so a hover-prefetched list renders immediately, with no
 * flash of the loading skeleton. */
export function getCachedSessions() {
  return cachedSessions;
}

/**
 * Returns the cached list if we already have one, reuses an in-flight
 * request if one's already running (e.g. Profile mounts a moment after a
 * hover already triggered this - this is what prevents the double-call),
 * otherwise starts a fresh GET.
 *
 * Rejections propagate (only a .finally is attached here, not a .catch),
 * so each caller - Navbar or Profile - can still handle failures its own
 * way; Navbar's hover-triggered call can fail silently while Profile's
 * mount-triggered call still shows its usual error state.
 */
export function prefetchSessions(api) {
  if (cachedSessions) return Promise.resolve(cachedSessions);
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = api
    .get("/api/assessments")
    .then((res) => {
      cachedSessions = res.data;
      return cachedSessions;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

/**
 * Always hits the network, regardless of what's cached, and updates the
 * cache with the result. Use this for an actual Profile visit (as opposed
 * to Navbar's speculative hover): after submitting a new assessment on the
 * Results page, the cache may still be holding the pre-submission list, so
 * Profile needs a guaranteed fresh fetch on every mount rather than
 * trusting whatever's cached.
 *
 * Still de-dupes against a request already in flight (so a hover firing
 * moments before this won't cause two overlapping GETs), but unlike
 * prefetchSessions() it never short-circuits just because *something* is
 * already cached.
 */
export function refreshSessions(api) {
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = api
    .get("/api/assessments")
    .then((res) => {
      cachedSessions = res.data;
      return cachedSessions;
    })
    .finally(() => {
      inFlightRequest = null;
    });

  return inFlightRequest;
}

/** Lets a local mutation (e.g. deleting a session in Profile) keep the
 * cache in sync immediately, without forcing a throwaway refetch the next
 * time someone hovers the Profile link or the page remounts. */
export function setCachedSessions(data) {
  cachedSessions = data;
}

/** Drops the cache entirely. Not wired up automatically anywhere yet -
 * worth calling this on sign-out (e.g. in a Clerk afterSignOut callback)
 * so the next signed-in user on a shared device doesn't briefly see a
 * stale previous user's session list. */
export function invalidateSessionsCache() {
  cachedSessions = null;
  inFlightRequest = null;
}