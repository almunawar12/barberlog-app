import * as SecureStore from 'expo-secure-store';

// The device token lives only in the Android Keystore-backed store, never in plain storage.
const TOKEN_KEY = 'barberlog_token';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // An unreadable keystore means we have no usable credential; the owner signs in again.
    return null;
  }
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
