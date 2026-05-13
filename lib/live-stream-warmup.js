/**
 * Live TV prewarm — re-exports dual Makkah + Madinah loader.
 * @see lib/live-dual-prewarm.js
 */
export {
  attachLiveDualPrewarmToContainer,
  disposeLiveDualPrewarm,
  ensureLiveDualPrewarm,
  getActiveLiveDualVideo,
  getLiveDualHlsQualityPayload,
  getLiveDualPrewarmUrls,
  pauseLiveDualPrewarm,
  resolveMakkahMadinahUrls,
  resumeLiveDualPrewarm,
  setLiveDualHlsLevelIndex,
  setLiveDualPrewarmActive,
  setLiveDualUserMuted,
  setLiveDualVideoObjectFit,
  slotForSelectedUrl,
  subscribeLiveDualHlsQuality,
  warmMakkahLiveStream,
} from "./live-dual-prewarm";

/** @deprecated No-op: prewarm players are reused on /live; use `disposeLiveDualPrewarm` for full teardown. */
export function disposeLiveWarmup() {
  /* no-op */
}
