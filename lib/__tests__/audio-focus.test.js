import { beforeEach, describe, expect, it, vi } from "vitest";

const pauseLiveDualPrewarm = vi.fn();
const resumeLiveDualPrewarm = vi.fn();
const setLiveDualUserMuted = vi.fn();
const getLiveDualUserMuted = vi.fn(() => false);

const pauseQuranAudio = vi.fn();
const getQuranAudioState = vi.fn(() => ({ status: "idle" }));
const stopPrayerAdhan = vi.fn();

vi.mock("@/lib/live-dual-prewarm", () => ({
  pauseLiveDualPrewarm,
  resumeLiveDualPrewarm,
  setLiveDualUserMuted,
  getLiveDualUserMuted,
}));

vi.mock("@/lib/quran-audio-player", () => ({
  pauseQuranAudio,
  getQuranAudioState,
}));

vi.mock("@/lib/prayer-adhan", () => ({
  stopPrayerAdhan,
}));

describe("audio-focus", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../audio-focus");
    mod.resetAudioFocusForTests();
  });

  it("onLiveRouteEnter pauses active quran session", async () => {
    getQuranAudioState.mockReturnValue({ status: "playing" });
    const { onLiveRouteEnter } = await import("../audio-focus");
    await onLiveRouteEnter();
    expect(pauseQuranAudio).toHaveBeenCalled();
  });

  it("beforeQuranPlayback mutes live on live route", async () => {
    getLiveDualUserMuted.mockReturnValue(false);
    const { setLiveRouteActive, beforeQuranPlayback } = await import("../audio-focus");
    setLiveRouteActive(true);
    await beforeQuranPlayback();
    expect(stopPrayerAdhan).toHaveBeenCalled();
    expect(setLiveDualUserMuted).toHaveBeenCalledWith(true);
    expect(pauseLiveDualPrewarm).not.toHaveBeenCalled();
  });

  it("beforeQuranPlayback pauses live off live route", async () => {
    const { beforeQuranPlayback } = await import("../audio-focus");
    await beforeQuranPlayback();
    expect(pauseLiveDualPrewarm).toHaveBeenCalled();
    expect(setLiveDualUserMuted).not.toHaveBeenCalled();
  });

  it("afterQuranPlaybackEnd restores live mute snapshot on live route", async () => {
    getLiveDualUserMuted.mockReturnValue(false);
    const { setLiveRouteActive, beforeQuranPlayback, afterQuranPlaybackEnd } = await import("../audio-focus");
    setLiveRouteActive(true);
    await beforeQuranPlayback();
    await afterQuranPlaybackEnd();
    expect(setLiveDualUserMuted).toHaveBeenLastCalledWith(false);
    expect(resumeLiveDualPrewarm).not.toHaveBeenCalled();
  });

  it("afterQuranPlaybackEnd resumes live prewarm off live route", async () => {
    const { beforeQuranPlayback, afterQuranPlaybackEnd } = await import("../audio-focus");
    await beforeQuranPlayback();
    await afterQuranPlaybackEnd();
    expect(resumeLiveDualPrewarm).toHaveBeenCalled();
  });

  it("beforeAdhanPlayback pauses quran and live", async () => {
    getQuranAudioState.mockReturnValue({ status: "playing" });
    const { beforeAdhanPlayback } = await import("../audio-focus");
    await beforeAdhanPlayback();
    expect(pauseQuranAudio).toHaveBeenCalled();
    expect(pauseLiveDualPrewarm).toHaveBeenCalled();
  });
});
