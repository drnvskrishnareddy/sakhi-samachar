// Public addresses set at build time (see .env.example). None of them are secrets.
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? '';
/** version.json published with the web app; tells installed Android apps about updates. */
export const UPDATE_URL = process.env.EXPO_PUBLIC_UPDATE_URL ?? '';
