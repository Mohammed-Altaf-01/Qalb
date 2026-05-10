/**
 * Pick default murattal entry from mp3quran `reciter.moshaf[]` (schema evolves often).
 * Prefer legacy `moshaf_type === 0`, then canonical Hafs murattal (`rewaya_id === 1`).
 */
export function preferredMoshafEntry(moshafList) {
  const list = Array.isArray(moshafList) ? moshafList : [];
  return (
    list.find((m) => Number(m?.moshaf_type) === 0) ||
    list.find((m) => Number(m?.rewaya_id) === 1) ||
    list[0] ||
    null
  );
}
