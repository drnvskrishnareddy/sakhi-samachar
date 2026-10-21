// Google sign-in for the web link, using Google Identity Services (GIS).
// The browser gets a short-lived Drive access token (about one hour). It is kept in this
// browser only, and renewed when the member taps "Reconnect" — browsers block Google's
// window unless it opens from a tap.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DRIVE_SCOPE, GoogleAccount, GoogleAuth, GoogleError } from './google.types';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const KEY = 'sakhi.google.v1';
const SCOPES = `openid email profile ${DRIVE_SCOPE}`;

interface Saved { email: string; name: string | null; token: string; expires: number }
interface TokenResponse { access_token?: string; expires_in?: number; error?: string; error_description?: string }
interface Gis {
  accounts: { oauth2: {
    initTokenClient(cfg: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type: string }) => void }): { requestAccessToken(o?: { prompt?: string; login_hint?: string }): void };
    hasGrantedAllScopes(r: TokenResponse, ...scopes: string[]): boolean;
    revoke(token: string, done?: () => void): void;
  } };
}

const w = globalThis as unknown as { google?: Gis; document?: Document };
let loading: Promise<Gis> | null = null;
let client: ReturnType<Gis['accounts']['oauth2']['initTokenClient']> | null = null;
let pending: { resolve: (r: TokenResponse) => void; reject: (e: Error) => void } | null = null;
let saved: Saved | null = null;

function loadGis(): Promise<Gis> {
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const doc = w.document;
    if (!doc) { reject(new GoogleError('unavailable', 'No browser document')); return; }
    const s = doc.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new GoogleError('unavailable', 'Google script did not load')));
    s.onerror = () => { loading = null; reject(new Error('network: could not reach Google')); };
    doc.head.appendChild(s);
  });
  return loading;
}

function tokenClient(g: Gis) {
  if (client) return client;
  client = g.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (r) => { const p = pending; pending = null; p?.resolve(r); },
    error_callback: (e) => {
      const p = pending; pending = null;
      p?.reject(new GoogleError(e.type === 'popup_failed_to_open' ? 'popup_blocked' : 'cancelled', e.type));
    },
  });
  return client;
}

// Load Google's script early so a tap can open the window immediately.
if (CLIENT_ID) loadGis().catch(() => {});

async function persist(s: Saved | null) {
  saved = s;
  if (s) await AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
  else await AsyncStorage.removeItem(KEY).catch(() => {});
}

async function requestToken(hint?: string): Promise<{ token: string; expires: number }> {
  if (!CLIENT_ID) throw new GoogleError('not_configured', 'Missing EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');
  const g = w.google?.accounts?.oauth2 ? w.google : await loadGis();
  const r = await new Promise<TokenResponse>((resolve, reject) => {
    pending = { resolve, reject };
    tokenClient(g).requestAccessToken({ prompt: '', login_hint: hint });
  });
  if (r.error || !r.access_token) throw new GoogleError('cancelled', r.error_description || r.error || 'Sign-in cancelled');
  if (!g.accounts.oauth2.hasGrantedAllScopes(r, DRIVE_SCOPE)) throw new GoogleError('no_drive_permission', 'Drive permission not granted');
  return { token: r.access_token, expires: Date.now() + (r.expires_in ?? 3600) * 1000 };
}

export const googleAuth: GoogleAuth = {
  configured: !!CLIENT_ID,

  async restore() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      saved = raw ? (JSON.parse(raw) as Saved) : null;
    } catch { saved = null; }
    return saved ? { email: saved.email, name: saved.name } : null;
  },

  async signIn(): Promise<GoogleAccount> {
    const { token, expires } = await requestToken(saved?.email);
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Could not read your Google account details. Try again.');
    const info = (await res.json()) as { email?: string; name?: string };
    if (!info.email) throw new Error('Google did not share an email address. Try again.');
    await persist({ email: info.email, name: info.name ?? null, token, expires });
    return { email: info.email, name: info.name ?? null };
  },

  async getToken(interactive) {
    if (saved && saved.expires - Date.now() > 60_000) return saved.token;
    if (!interactive || !saved) return null;
    const { token, expires } = await requestToken(saved.email);
    await persist({ ...saved, token, expires });
    return token;
  },

  async signOut() { await persist(null); },

  async revoke() {
    const t = saved?.token;
    if (t && w.google?.accounts?.oauth2) await new Promise<void>((done) => w.google!.accounts.oauth2.revoke(t, () => done()));
    else if (t) await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(t)}`, { method: 'POST' }).catch(() => {});
    await persist(null);
  },
};
