import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'agp-pending-registration:';

export type PendingRegistration = {
  nombre: string;
  apellidos: string;
  codigo: string;
};

export async function savePendingRegistration(email: string, data: PendingRegistration) {
  await AsyncStorage.setItem(KEY_PREFIX + email.trim().toLowerCase(), JSON.stringify(data));
}

export async function getPendingRegistration(email: string): Promise<PendingRegistration | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + email.trim().toLowerCase());
  return raw ? (JSON.parse(raw) as PendingRegistration) : null;
}

export async function clearPendingRegistration(email: string) {
  await AsyncStorage.removeItem(KEY_PREFIX + email.trim().toLowerCase());
}
