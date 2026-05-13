import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { setAudioModeAsync, useAudioPlayer } from "expo-audio";

const MediaPlaybackContext = createContext(null);

/**
 * Single active MP3/stream for Listen + Radio (expo-audio).
 * Live TV uses `expo-video` in `LiveScreen` and should call `stopAudio()` on mount.
 */
export function MediaPlaybackProvider({ children }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const [label, setLabel] = useState("");

  const stopAudio = useCallback(async () => {
    try {
      player.pause();
      await player.seekTo(0);
    } catch {
      /* ignore */
    }
    setLabel("");
  }, [player]);

  const playFromUri = useCallback(
    async ({ uri, title }) => {
      if (!uri) return;
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: "duckOthers",
        });
      } catch {
        /* ignore */
      }
      try {
        player.pause();
        await player.seekTo(0);
      } catch {
        /* ignore */
      }
      player.replace({ uri });
      player.play();
      setLabel(title ?? "");
    },
    [player],
  );

  const value = useMemo(
    () => ({
      playFromUri,
      stopAudio,
      currentLabel: label,
    }),
    [playFromUri, stopAudio, label],
  );

  return <MediaPlaybackContext.Provider value={value}>{children}</MediaPlaybackContext.Provider>;
}

export function useMediaPlayback() {
  const ctx = useContext(MediaPlaybackContext);
  if (!ctx) throw new Error("useMediaPlayback must be used within MediaPlaybackProvider");
  return ctx;
}
