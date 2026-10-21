// Google sign-in for the Android and iPhone apps (native Google Sign-In).
// Tokens are refreshed by Google's SDK, so members stay connected without extra taps.
// Needs a development or store build: it is not part of Expo Go.
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { DRIVE_SCOPE, GoogleAccount, GoogleAuth, GoogleError } from './google.types';

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
let configured = false;

function setup() {
  if (configured) return;
  GoogleSignin.configure({
    scopes: [DRIVE_SCOPE],
    ...(WEB_CLIENT_ID ? { webClientId: WEB_CLIENT_ID } : {}),
    ...(IOS_CLIENT_ID ? { iosClientId: IOS_CLIENT_ID } : {}),
  });
  configured = true;
}

const toAccount = (u: { user: { email: string; name: string | null } }): GoogleAccount => ({ email: u.user.email, name: u.user.name });

async function ensureDriveScope(scopes: string[]) {
  if (scopes.includes(DRIVE_SCOPE)) return;
  const r = await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
  if (!r || !isSuccessResponse(r) || !r.data.scopes.includes(DRIVE_SCOPE)) throw new GoogleError('no_drive_permission', 'Drive permission not granted');
}

export const googleAuth: GoogleAuth = {
  configured: true,

  async restore() {
    setup();
    try {
      const r = await GoogleSignin.signInSilently();
      return r.type === 'success' ? toAccount(r.data) : null;
    } catch { return null; }
  },

  async signIn() {
    setup();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const r = await GoogleSignin.signIn();
      if (!isSuccessResponse(r)) throw new GoogleError('cancelled', 'Sign-in cancelled');
      await ensureDriveScope(r.data.scopes);
      return toAccount(r.data);
    } catch (e) {
      if (e instanceof GoogleError) throw e;
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS) throw new GoogleError('cancelled', e.message);
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new GoogleError('unavailable', e.message);
      }
      throw e;
    }
  },

  async getToken(interactive) {
    setup();
    try {
      return (await GoogleSignin.getTokens()).accessToken;
    } catch {
      if (!interactive) return null;
      const r = await GoogleSignin.signInSilently();
      if (r.type !== 'success') return null;
      return (await GoogleSignin.getTokens()).accessToken;
    }
  },

  async signOut() { setup(); await GoogleSignin.signOut().catch(() => null); },
  async revoke() { setup(); await GoogleSignin.revokeAccess().catch(() => null); await GoogleSignin.signOut().catch(() => null); },
};
