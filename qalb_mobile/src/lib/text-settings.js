import storage, { STORAGE_KEYS } from './storage';

export const TEXT_SIZE_PRESETS = {
  small: { key: 'small', label: 'Small', arabic: 0.9, body: 0.92 },
  medium: { key: 'medium', label: 'Medium', arabic: 1, body: 1 },
  large: { key: 'large', label: 'Large', arabic: 1.12, body: 1.1 },
};

export async function getTextSizePreset() {
  const stored = await storage.get(STORAGE_KEYS.TEXT_SIZE);
  return TEXT_SIZE_PRESETS[stored] ?? TEXT_SIZE_PRESETS.medium;
}

export async function setTextSizePreset(presetKey) {
  const key = TEXT_SIZE_PRESETS[presetKey] ? presetKey : 'medium';
  await storage.set(STORAGE_KEYS.TEXT_SIZE, key);
  return TEXT_SIZE_PRESETS[key];
}
