import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { UPDATE_URL } from '../lib/config';
import { IS_DEMO } from '../lib/demo';
import { usePalette } from '../theme';
import { Btn, Txt } from './ui';

/** 1.2.10 > 1.2.9 */
export function isNewer(latest: string, current: string) {
  const a = latest.split('.').map((n) => parseInt(n, 10) || 0), b = current.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

interface Latest { version?: string; android_url?: string; message?: string }

/**
 * Shown on installed Android apps when version.json (published with the web app) names a
 * newer version than this build. The web version never needs it: it is always current.
 */
export function UpdateBanner() {
  const c = usePalette();
  const [latest, setLatest] = useState<Latest | null>(null);
  const current = Constants.expoConfig?.version ?? '0.0.0';

  useEffect(() => {
    if (Platform.OS !== 'android' || IS_DEMO || !UPDATE_URL) return;
    let live = true;
    fetch(`${UPDATE_URL}?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j) setLatest(j as Latest); }, () => {});
    return () => { live = false; };
  }, []);

  if (!latest?.version || !latest.android_url || !isNewer(latest.version, current)) return null;
  return (
    <View style={{ backgroundColor: c.sageSoft, borderRadius: 20, padding: 16, gap: 10 }} accessibilityRole="alert">
      <Txt v="strong">A new version of Sakhi Samachar is available ({latest.version})</Txt>
      {latest.message ? <Txt v="small" color={c.ink}>{latest.message}</Txt> : null}
      <Txt v="small">Your diary stays safe in your Google Drive.</Txt>
      <Btn small title="Download update" onPress={() => Linking.openURL(latest.android_url!)} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}
