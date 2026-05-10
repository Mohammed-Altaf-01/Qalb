import * as AuthSession from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

import { CONFIG, isVercelConfigured } from '../config';

const JWT_KEY = 'qalb_mobile_session_jwt';

export async function getStoredMobileJwt() {
  try {
    return await SecureStore.getItemAsync(JWT_KEY);
  } catch {
    return null;
  }
}

export async function setStoredMobileJwt(token) {
  try {
    if (token) await SecureStore.setItemAsync(JWT_KEY, token);
    else await SecureStore.deleteItemAsync(JWT_KEY);
  } catch (e) {
    console.warn('[mobile-auth] SecureStore failed', e);
  }
}

/** Best-effort decode of JWT `sub` (no signature verify — server verifies). */
export function decodeJwtSub(jwt) {
  if (!jwt || typeof jwt !== 'string') return null;
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Opens in-app browser: NextAuth sign-in if needed, then deep-link back with JWT.
 * @returns {Promise<{ ok: boolean; error?: string }>}
 */
export async function signInWithHostedNextAuth() {
  if (!isVercelConfigured()) {
    return { ok: false, error: 'Set CONFIG.API_BASE_URL to your deployed Next app URL.' };
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'qalb', path: 'mobile-auth' });
  const base = CONFIG.API_BASE_URL.replace(/\/$/, '');
  const startUrl = `${base}/api/mobile/auth-complete`;

  const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUri);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, error: 'Sign-in cancelled' };
  }

  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: 'Unexpected sign-in response' };
  }

  const parsed = Linking.parse(result.url);
  const token = parsed.queryParams?.token;
  const tokenStr = Array.isArray(token) ? token[0] : token;
  if (!tokenStr || typeof tokenStr !== 'string') {
    return { ok: false, error: 'No token in redirect URL' };
  }

  await setStoredMobileJwt(tokenStr);
  return { ok: true };
}

export async function signOutMobile() {
  await setStoredMobileJwt(null);
}
