import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CONFIG } from '../config';
import { QuranRepository } from '../lib/quran-api';
import storage, { STORAGE_KEYS } from '../lib/storage';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../theme';

const RECITERS = [
  { id: 7, name: 'Mishari Alafasy' },
  { id: 3, name: 'Abdul Rahman Al-Sudais' },
  { id: 2, name: 'AbdulBaset (Murattal)' },
  { id: 1, name: 'AbdulBaset (Mujawwad)' },
  { id: 6, name: 'Mahmoud Al-Husary' },
  { id: 10, name: 'Saud Al-Shuraym' },
];

const FALLBACK_IDS = [7, 2, 1];

function fmtTime(secs) {
  if (!secs || isNaN(secs)) return '0:00';
  const s = Math.floor(secs);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function AudioPlayer({
  verseKey,
  onPlaybackStatusChange,
  compact = false,
  autoPlayToken = 0,
}) {
  const player = useAudioPlayer(null, { updateInterval: 120 });
  const status = useAudioPlayerStatus(player);
  const [loadStatus, setLoadStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [reciterId, setReciterId] = useState(CONFIG.DEFAULT_RECITER_ID);
  const [showPicker, setShowPicker] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const playbackCallbackRef = useRef(onPlaybackStatusChange);
  const lastAutoPlayTokenRef = useRef(autoPlayToken);

  useEffect(() => {
    playbackCallbackRef.current = onPlaybackStatusChange;
  }, [onPlaybackStatusChange]);

  // Load saved reciter on mount
  useEffect(() => {
    storage.get(STORAGE_KEYS.RECITER_ID).then((id) => {
      if (id && RECITERS.some((r) => r.id === id)) setReciterId(id);
    });
  }, []);

  // Fetch audio URL and load into player when verseKey or reciterId changes
  useEffect(() => {
    if (!verseKey) return;
    let cancelled = false;

    async function loadAudio() {
      setLoadStatus('loading');

      const tryIds = [reciterId, ...FALLBACK_IDS.filter((id) => id !== reciterId)];
      let audioUrl = null;

      for (const id of tryIds) {
        try {
          const data = await QuranRepository.getVerseAudio(verseKey, id);
          const file = data?.audio_files?.[0];
          const raw = file?.url ?? file?.audio_url;
          if (raw) {
            const u = String(raw).trim();
            audioUrl =
              u.startsWith("http://") || u.startsWith("https://")
                ? u
                : u.startsWith("//")
                  ? `https:${u}`
                  : `https://verses.quran.com/${u.replace(/^\/+/, "")}`;
            break;
          }
        } catch {}
      }

      if (cancelled) return;
      if (!audioUrl) {
        setLoadStatus('error');
        setIsSwapping(false);
        return;
      }

      try {
        await setAudioModeAsync({ playsInSilentMode: true });
        player.replace({ uri: audioUrl });
        if (!cancelled) {
          setLoadStatus('ready');
          setIsSwapping(false);
        }
      } catch {
        if (!cancelled) {
          setLoadStatus('error');
          setIsSwapping(false);
        }
      }
    }

    loadAudio();
    return () => { cancelled = true; };
  }, [verseKey, reciterId]);

  // Seek back to start when playback finishes
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish]);

  const handlePlayPause = useCallback(() => {
    if (loadStatus !== 'ready') return;
    if (status.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [status.playing, loadStatus]);

  const handleReciterChange = useCallback(async (id) => {
    setIsSwapping(true);
    setShowPicker(false);
    await storage.set(STORAGE_KEYS.RECITER_ID, id);
    setReciterId(id);
  }, []);

  const progress = status.duration > 0 ? status.currentTime / status.duration : 0;
  const currentReciter = RECITERS.find((r) => r.id === reciterId);

  useEffect(() => {
    playbackCallbackRef.current?.({
      playing: status.playing,
      currentTime: status.currentTime ?? 0,
      duration: status.duration ?? 0,
      progress,
      didJustFinish: !!status.didJustFinish,
    });
  }, [status.playing, status.currentTime, status.duration, progress, status.didJustFinish]);

  useEffect(() => {
    if (!autoPlayToken || autoPlayToken === lastAutoPlayTokenRef.current) return;
    lastAutoPlayTokenRef.current = autoPlayToken;
    if (loadStatus !== 'ready') return;
    player.seekTo(0);
    player.play();
  }, [autoPlayToken, loadStatus]);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {loadStatus === 'loading' && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading recitation…</Text>
        </View>
      )}

      {loadStatus === 'error' && (
        <Text style={styles.errorText}>Audio unavailable for this verse.</Text>
      )}

      {(loadStatus === 'ready' || isSwapping) && (
        <>
          <View style={[styles.controls, compact && styles.controlsCompact]}>
            <TouchableOpacity
              style={[styles.playBtn, compact && styles.playBtnCompact]}
              onPress={handlePlayPause}
              disabled={isSwapping || loadStatus !== 'ready'}
            >
              {isSwapping ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={[styles.playIcon, compact && styles.playIconCompact]}>{status.playing ? '⏸' : '▶'}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progress }]} />
              <View style={{ flex: 1 - progress }} />
            </View>

            <Text style={[styles.time, compact && styles.timeCompact]}>
              {fmtTime(status.currentTime)} / {fmtTime(status.duration)}
            </Text>
          </View>

          {!compact && (
            <TouchableOpacity
              style={styles.reciterRow}
              onPress={() => setShowPicker((v) => !v)}
            >
              <Text style={styles.reciterName}>
                {currentReciter?.name ?? 'Reciter'} {'▾'}
              </Text>
            </TouchableOpacity>
          )}

          {showPicker && !compact && (
            <View style={styles.pickerGrid}>
              {RECITERS.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.reciterChip, r.id === reciterId && styles.reciterChipActive]}
                  onPress={() => handleReciterChange(r.id)}
                >
                  <Text style={[styles.reciterChipText, r.id === reciterId && styles.reciterChipTextActive]}>
                    {r.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 4,
    borderWidth: 1,
    borderColor: `${COLORS.border}80`,
    gap: SPACING.xs,
  },
  containerCompact: {
    padding: SPACING.xs + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  errorText: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
    paddingVertical: SPACING.xs,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  controlsCompact: {
    gap: SPACING.xs,
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnCompact: {
    width: 28,
    height: 28,
  },
  playIcon: {
    color: COLORS.white,
    fontSize: 13,
    marginLeft: 1,
  },
  playIconCompact: {
    fontSize: 11,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  time: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.xs - 1,
    minWidth: 70,
    textAlign: 'right',
  },
  timeCompact: {
    minWidth: 58,
    fontSize: FONT_SIZE.xs - 2,
  },
  reciterRow: {
    paddingTop: SPACING.xs,
  },
  reciterName: {
    color: COLORS.textFaint,
    fontSize: FONT_SIZE.xs,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    paddingTop: SPACING.xs,
  },
  reciterChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.muted,
  },
  reciterChipActive: {
    borderColor: `${COLORS.accent}60`,
    backgroundColor: COLORS.accentDim,
  },
  reciterChipText: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
  },
  reciterChipTextActive: {
    color: COLORS.accent,
  },
});
