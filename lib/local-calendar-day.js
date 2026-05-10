/**
 * Local-calendar YYYY-MM-DD in the user's timezone.
 * Matches the bucketing used for `qalb_time_tracking.byDay` (formerly duplicated in useGamification).
 */

export function toLocalDayKey(input = new Date()) {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const offsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offsetMs).toISOString().slice(0, 10);
}

/** Bucket API / DB ISO timestamps onto the user's local calendar day. */
export function bucketDayKeyLocal(iso) {
  return toLocalDayKey(new Date(iso));
}
