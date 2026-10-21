import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Gentle feedback on every tap. In the installed app this uses the phone's haptic engine;
// in a browser it uses the Vibration API (Android Chrome supports it, iPhone Safari does not,
// so there it silently does nothing).
const native = Platform.OS === 'ios' || Platform.OS === 'android';
const buzz = (ms: number | number[]) => {
  try {
    const nav = (globalThis as { navigator?: { vibrate?: (p: number | number[]) => boolean } }).navigator;
    nav?.vibrate?.(ms);
  } catch { /* not supported */ }
};

export const haptic = {
  /** Choosing an option (chips, toggles, tabs). */
  select: () => { if (native) Haptics.selectionAsync().catch(() => {}); else buzz(8); },
  /** Pressing a button or a + / − counter. */
  tap: () => { if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); else buzz(12); },
  /** A completed action (account created, menses started). */
  success: () => { if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); else buzz([14, 60, 22]); },
};
