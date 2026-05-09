/**
 * Same-tab localStorage updates do not fire the native `storage` event.
 * Journey/history UIs listen for this so entries appear as soon as AI flows finish.
 */
export const JOURNEY_LOCAL_UPDATED_EVENT = "qalb_journey_local_updated";

export function emitJourneyLocalUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(JOURNEY_LOCAL_UPDATED_EVENT));
}
