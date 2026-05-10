import { CONFIG, isVercelConfigured } from '../config';
import { getStoredMobileJwt } from './mobile-auth';

/**
 * Fetch against deployed Next `API_BASE_URL`, attaching mobile Bearer JWT when present.
 */
export async function apiFetch(path, init = {}) {
  if (!isVercelConfigured()) {
    throw new Error('API_BASE_URL not configured');
  }
  const base = CONFIG.API_BASE_URL.replace(/\/$/, '');
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = { ...(init.headers || {}) };
  const jwt = await getStoredMobileJwt();
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (!headers.Accept) headers.Accept = 'application/json';
  return fetch(url, { ...init, headers });
}
