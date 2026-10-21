import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, CheckRow, ErrorText, Mark, Txt } from '../components/ui';
import { PRIVACY_URL } from '../lib/config';
import { useData } from '../lib/data';
import { googleAuth } from '../lib/google';
import { font, usePalette } from '../theme';

export default function Welcome() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { signIn } = useData();
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Google's window must open straight from the tap, so nothing slow runs before signIn().
  const go = () => {
    if (!consent) { setErr('Tick the box to agree to how your diary is stored.'); return; }
    setErr(''); setBusy(true);
    signIn().then((m) => { if (m) setErr(m); }).finally(() => setBusy(false));
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 40, paddingHorizontal: 20, gap: 22, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Mark size={46} />
        <View>
          <Txt v="display" accessibilityRole="header">Sakhi Samachar</Txt>
          <Txt v="label">Menstrual health diary</Txt>
        </View>
      </View>
      <Txt muted>Record your menses, flow volume, sanitary products, clots and intermenstrual bleeding. Your diary is saved in your own Google Drive and syncs to every phone you sign in on.</Txt>

      {!googleAuth.configured ? (
        <Card style={{ backgroundColor: c.warnSoft, borderColor: c.warnSoft }}>
          <Txt v="strong" color={c.warn}>Google sign-in not set up</Txt>
          <Txt v="small" color={c.ink}>This build has no Google client ID. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as described in the README, then rebuild.</Txt>
        </Card>
      ) : null}

      <Card style={{ gap: 18 }}>
        <Txt v="heading">Sign in with your Google account</Txt>
        <View style={{ gap: 10 }}>
          <Point text="Your diary is kept in a folder called “Sakhi Samachar” in your own Google Drive." />
          <Point text="You can open it, see it and download it from Google Drive at any time." />
          <Point text="Sakhi Samachar can only see the files it creates, not the rest of your Drive." />
          <Point text="The app’s developer never receives your diary." />
        </View>
        <CheckRow checked={consent} onToggle={() => setConsent(!consent)}>
          <Txt v="small" color={c.ink}>I agree that my diary is saved in a “Sakhi Samachar” folder in my own Google Drive. I can delete it at any time.</Txt>
          {PRIVACY_URL ? <Text onPress={() => Linking.openURL(PRIVACY_URL)} style={{ fontFamily: font.semibold, color: c.accent, fontSize: 13.5, marginTop: 4, textDecorationLine: 'underline' }}>Read the privacy policy</Text> : null}
        </CheckRow>
        <ErrorText text={err} />
        <Btn title="Continue with Google" busy={busy} disabled={!googleAuth.configured} onPress={go} />
        <Txt v="small">Google will ask you to choose an account and to let Sakhi Samachar save its own files in your Drive. Please allow that.</Txt>
      </Card>

      <View style={{ backgroundColor: c.sageSoft, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, gap: 4 }}>
        <Txt v="small" color={c.ink}>Sakhi Samachar is a diary, not medical advice.</Txt>
        <Txt v="small" color={c.ink}>Not validated for contraceptive advice.</Txt>
      </View>
    </ScrollView>
  );
}

function Point({ text }: { text: string }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent, marginTop: 7 }} />
      <Txt v="small" color={c.ink} style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}
