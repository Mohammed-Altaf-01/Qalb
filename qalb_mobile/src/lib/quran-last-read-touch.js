import { dedupeLastReadsByHref, MAX_QURAN_LAST_READS } from '../../../lib/qalb-last-reads';

import storage, { STORAGE_KEYS } from './storage';
import { schedulePushReadingHistory } from './user-app-sync';

/** Append / refresh Quran entry in `qalb_last_reads` (parity with web HomeClient `saveLastRead`). */
export async function touchQuranLastReadChapter(chapter) {
  if (!chapter?.id) return;
  const lastReads = (await storage.get(STORAGE_KEYS.QALB_LAST_READS)) ?? [];
  const href = `/read?surah=${chapter.id}`;
  const updated = dedupeLastReadsByHref(
    [
      {
        href,
        label: chapter.name_simple,
        sub: chapter.translated_name?.name ?? '',
        type: 'surah',
        timestamp: Date.now(),
      },
      ...lastReads.filter((r) => r.href !== href),
    ],
    MAX_QURAN_LAST_READS,
  );
  await storage.set(STORAGE_KEYS.QALB_LAST_READS, updated);
  schedulePushReadingHistory();
}
