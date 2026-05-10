/**
 * Live TV prewarm — re-exports dual Makkah + Madinah loader.
 * @see lib/live-dual-prewarm.js
 */
export {
  attachLiveDualPrewarmToContainer,
  disposeLiveDualPrewarm,
  ensureLiveDualPrewarm,
  getActiveLiveDualVideo,
  getLiveDualPrewarmUrls,
  pauseLiveDualPrewarm,
  resolveMakkahMadinahUrls,
  resumeLiveDualPrewarm,
  setLiveDualPrewarmActive,
  setLiveDualUserMuted,
  slotForSelectedUrl,
  warmMakkahLiveStream,
} from "./live-dual-prewarm";

/** @deprecated No-op: prewarm players are reused on /live; use `disposeLiveDualPrewarm` for full teardown. */
export function disposeLiveWarmup() {
  /* no-op */
}
