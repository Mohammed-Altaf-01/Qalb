import { DeviceEventEmitter } from "react-native";

export const ACCOUNT_STORAGE_SYNCED_EVENT = "qalb-account-storage-synced";
export const JOURNEY_LOCAL_UPDATED_EVENT = "qalb_journey_local_updated";

export function emitAccountStorageSynced() {
  DeviceEventEmitter.emit(ACCOUNT_STORAGE_SYNCED_EVENT);
}

export function emitJourneyLocalUpdated() {
  DeviceEventEmitter.emit(JOURNEY_LOCAL_UPDATED_EVENT);
}
