/**
 * AudioPlayer — React Native / expo-av version.
 *
 * Adapted from web AudioPlayer.js:
 *  - HTML5 <audio> → expo-av Audio.Sound
 *  - localStorage → AsyncStorage (via storage.js)
 *  - CSS → StyleSheet
 *  - Reciter picker shown as tappable chips (same 6 reciters as web)
 *
 * Audio URL is fetched directly from Quran Foundation API via QuranRepository.
 * Falls back through reciter IDs [7, 2, 1] if primary reciter has no audio.
 */

import { Audio } from 'expo-av';
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

function fmtTime(ms) {
  if (!ms || isNaN(ms)) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function AudioPlayer({ verseKey }) {
  const soundRef = useRef(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [reciterId, setReciterId] = useState(CONFIG.DEFAULT_RECITER_ID);
  const [showPicker, setShowPicker] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  // Load saved reciter on mount
  useEffect(() => {
    storage.get(STORAGE_KEYS.RECITER_ID).then((id) => {
      if (id && RECITERS.some((r) => r.id === id)) setReciterId(id);
    });
  }, []);

  // Load audio when verseKey or reciterId changes
  useEffect(() => {
    if (!verseKey) return;
    let cancelled = false;

    async function loadAudio() {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      setIsPlaying(false);
      setPositionMs(0);
      setDurationMs(0);

      // Try primary reciter, then fallbacks
      const tryIds = [reciterId, ...FALLBACK_IDS.filter((id) => id !== reciterId)];
      let audioUrl = null;

      for (const id of tryIds) {
        try {
          const data = await QuranRepository.getVerseAudio(verseKey, id);
          const file = data?.audio_files?.[0];
          if (file?.url) {
            audioUrl = `https://verses.quran.com/${file.url}`;
            break;
          }
        } catch {}
      }

      if (cancelled) return;
      if (!audioUrl) {
        setStatus('error');
        setIsSwapping(false);
        return;
      }

      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: false },
          (s) => {
            if (!cancelled) {
              setIsPlaying(s.isPlaying);
              setPositionMs(s.positionMillis ?? 0);
              setDurationMs(s.durationMillis ?? 0);
              if (s.didJustFinish) {
                setIsPlaying(false);
                setPositionMs(0);
                sound.setPositionAsync(0).catch(() => {});
              }
            }
          },
        );
        if (!cancelled) {
          soundRef.current = sound;
          setStatus('ready');
          setIsSwapping(false);
        } else {
          await sound.unloadAsync().catch(() => {});
        }
      } catch (e) {
        if (!cancelled) {
          setStatus('error');
          setIsSwapping(false);
        }
      }
    }

    loadAudio();
    return () => {
      cancelled = true;
    };
  }, [verseKey, reciterId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!soundRef.current || status !== 'ready') return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch (e) {
      setStatus('error');
    }
  }, [isPlaying, status]);

  const handleReciterChange = useCallback(async (id) => {
    setIsSwapping(true);
    setStatus('loading');
    setShowPicker(false);
    await storage.set(STORAGE_KEYS.RECITER_ID, id);
    setReciterId(id);
  }, []);

  const progress = durationMs > 0 ? positionMs / durationMs : 0;
  const currentReciter = RECITERS.find((r) => r.id === reciterId);

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading recitation…</Text>
        </View>
      )}

      {status === 'error' && (
        <Text style={styles.errorText}>Audio unavailable for this verse.</Text>
      )}

      {(status === 'ready' || isSwapping) && (
        <>
          {/* Controls row */}
          <View style={styles.controls}>
            {/* Play/Pause */}
            <TouchableOpacity
              style={styles.playBtn}
              onPress={handlePlayPause}
              disabled={isSwapping || status !== 'ready'}
            >
              {isSwapping ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
              )}
            </TouchableOpacity>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { flex: progress }]} />
              <View style={{ flex: 1 - progress }} />
            </View>

            {/* Time */}
            <Text style={styles.time}>
              {fmtTime(positionMs)} / {fmtTime(durationMs)}
            </Text>
          </View>

          {/* Reciter selector */}
          <TouchableOpacity
            style={styles.reciterRow}
            onPress={() => setShowPicker((v) => !v)}
          >
            <Text style={styles.reciterName}>
              {currentReciter?.name ?? 'Reciter'} {'▾'}
            </Text>
          </TouchableOpacity>

          {showPicker && (
            <View style={styles.pickerGrid}>
              {RECITERS.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.reciterChip,
                    r.id === reciterId && styles.reciterChipActive,
                  ]}
                  onPress={() => handleReciterChange(r.id)}
                >
                  <Text
                    style={[
                      styles.reciterChipText,
                      r.id === reciterId && styles.reciterChipTextActive,
                    ]}
                  >
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
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: COLORS.white,
    fontSize: 13,
    marginLeft: 1,
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
    borderColor: `${COLORS.border}`,
    backgroundColor: `${COLORS.muted}`,
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
