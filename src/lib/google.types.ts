// Shared shape of Google sign-in on every platform.
//   google.ts      — Android / iOS builds (native Google Sign-In)
//   google.web.ts  — web link (Google Identity Services in the browser)

/** Only files this app creates or opens: Google classes it as non-sensitive. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export interface GoogleAccount { email: string; name: string | null }

export type GoogleErrorCode = 'cancelled' | 'no_drive_permission' | 'not_configured' | 'unavailable' | 'popup_blocked';
export class GoogleError extends Error {
  constructor(public code: GoogleErrorCode, message: string) { super(message); }
}

export interface GoogleAuth {
  /** True when a Google client ID was supplied at build time. */
  configured: boolean;
  /** Previously signed-in account on this device, without any prompt. */
  restore(): Promise<GoogleAccount | null>;
  /** Interactive sign-in. Call it directly from a button press. */
  signIn(): Promise<GoogleAccount>;
  /**
   * A valid access token for Google Drive. With interactive=false it never shows UI and
   * returns null when the member has to tap "Reconnect" (web tokens last about an hour).
   */
  getToken(interactive: boolean): Promise<string | null>;
  signOut(): Promise<void>;
  /** Removes Sakhi Samachar's access to the Google account. */
  revoke(): Promise<void>;
}

export const googleMessage = (e: unknown): string => {
  const code = (e as GoogleError)?.code;
  if (code === 'cancelled') return '';
  if (code === 'no_drive_permission') return 'Sakhi Samachar needs permission to save your diary in your Google Drive. Tap “Continue with Google” again and tick the Google Drive box.';
  if (code === 'not_configured') return 'Google sign-in is not set up in this build yet. Follow Step 1 of the README.';
  if (code === 'popup_blocked') return 'Your browser blocked the Google window. Allow pop-ups for this site and try again.';
  if (code === 'unavailable') return 'Google sign-in is not available on this phone. Check that Google Play services are up to date.';
  const m = (e as Error)?.message ?? String(e);
  if (/network|fetch/i.test(m)) return 'No connection. Check the internet and try again.';
  return m;
};
