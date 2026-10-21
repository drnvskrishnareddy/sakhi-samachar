import * as Linking from 'expo-linking';
import { useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Disclaimer } from '../../components/Disclaimer';
import { Btn, Card, Chips, ErrorText, Field, Txt } from '../../components/ui';
import { toCSV } from '../../lib/cycle';
import { keyOf, today } from '../../lib/dates';
import { useData } from '../../lib/data';
import { IS_DEMO } from '../../lib/demo';
import { PRIVACY_URL } from '../../lib/config';
import { usePalette } from '../../theme';


export default function SettingsScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { account, email, settings, saveSettings, logs, sync, syncError, pendingCount, syncNow, reconnect, signOut, deleteAccount, folderUrl } = useData();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<'' | 'sync' | 'out' | 'delete'>('');
  const [err, setErr] = useState('');
  const [year, setYear] = useState(settings.birth_year ? String(settings.birth_year) : '');
  const [yearErr, setYearErr] = useState('');
  const saveYear = () => {
    if (!year) { if (settings.birth_year != null) saveSettings({ birth_year: null }); return; }
    const y = Number(year), now = today().getFullYear();
    if (!(y >= 1940 && y <= now - 8)) { setYearErr(`Enter a year between 1940 and ${now - 8}.`); return; }
    if (y !== settings.birth_year) saveSettings({ birth_year: y });
  };

  const exportCSV = async () => {
    setErr('');
    try {
      await Share.share({ title: `Sakhi Samachar diary ${keyOf(today())}.csv`, message: toCSV(logs) });
    } catch { setErr('Sharing isn’t available on this device.'); }
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 16, gap: 14, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
      <Txt v="title" accessibilityRole="header">Settings</Txt>

      <Card>
        <Txt v="heading">Account</Txt>
        {IS_DEMO ? (
          <>
            <Txt>Demo with sample data</Txt>
            <Txt v="small">Nothing here is sent anywhere. Resetting brings back the original sample entries.</Txt>
            <Btn small kind="ghost" title="Reset sample data" onPress={() => signOut()} style={{ alignSelf: 'flex-start' }} />
          </>
        ) : (
          <>
            {account?.name ? <Txt>{account.name}</Txt> : null}
            <Txt selectable muted={!!account?.name}>{email}</Txt>
            <Txt v="small" color={sync === 'error' || sync === 'reconnect' ? c.warn : undefined}>
              {sync === 'syncing' ? 'Saving to your Google Drive…'
                : sync === 'reconnect' ? 'Google needs you to reconnect. Your entries are safe on this phone until then.'
                : pendingCount ? (sync === 'offline' ? 'Offline. Your latest changes will be saved to Google Drive when you are back online.' : 'Your latest changes are waiting to be saved to Google Drive.')
                : sync === 'error' ? `Could not save to Google Drive. ${syncError}`
                : 'Everything is saved in your Google Drive.'}
            </Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {sync === 'reconnect'
                ? <Btn small title="Reconnect" onPress={() => { reconnect(); }} />
                : <Btn small kind="quiet" title="Save now" busy={busy === 'sync'} onPress={() => { setBusy('sync'); syncNow().catch(() => {}).finally(() => setBusy('')); }} />}
              <Btn small kind="ghost" title="Sign out" busy={busy === 'out'} onPress={async () => { setBusy('out'); await signOut(); }} />
            </View>
          </>
        )}
      </Card>

      {!IS_DEMO ? (
        <Card>
          <Txt v="heading">Your diary in Google Drive</Txt>
          <Txt v="small">Saved in the folder “Sakhi Samachar” in your Google Drive, as “Sakhi Samachar diary.json” (used by the app) and “Sakhi Samachar diary.csv” (a table you can open in Google Sheets). Please don’t delete these files; if you do, the app saves them again from this phone.</Txt>
          <Btn small kind="ghost" title="Open folder in Google Drive" onPress={() => Linking.openURL(folderUrl)} style={{ alignSelf: 'flex-start' }} />
        </Card>
      ) : null}

      <Card>
        <Txt v="heading">About you</Txt>
        <Field label="Year of birth (optional)" value={year} onChangeText={(v) => { setYear(v.replace(/[^0-9]/g, '').slice(0, 4)); setYearErr(''); }}
          onBlur={saveYear} keyboardType="number-pad" maxLength={4} placeholder="e.g. 1996" />
        <ErrorText text={yearErr} />
        <Txt v="small">Used only to apply FIGO’s age-specific limit for cycle regularity (18–25 and 42–45 years: normal variation ≤9 days; 26–41 years: ≤7 days).</Txt>
        <View style={{ gap: 8, marginTop: 6 }}>
          <Txt v="strong">Are you taking progestin ± estrogen (birth control pills, rings, patches or injections)?</Txt>
          <Chips label="Gonadal steroid medication" allowClear={false} options={[['no', 'No'], ['yes', 'Yes']]} value={settings.on_gonadal_steroids ? 'yes' : 'no'} onChange={(v) => saveSettings({ on_gonadal_steroids: v === 'yes' })} />
          <Txt v="small">If yes, days can be recorded as “Unscheduled bleeding”, as FIGO lists it separately.</Txt>
        </View>
      </Card>

      <Card>
        <Txt v="heading">Share with your doctor</Txt>
        <Txt v="small">Exports every recorded day as a CSV table (opens in Excel or Google Sheets). Share it only with people you choose.</Txt>
        <Btn small title="Export diary" onPress={exportCSV} style={{ alignSelf: 'flex-start' }} />
        <ErrorText text={err} />
      </Card>

      <Card>
        <Txt v="heading">Privacy</Txt>
        <Txt v="small">Your diary is stored only in your own Google Drive and on the phones you sign in on. Sakhi Samachar can see only the files it created, and its developer never receives your diary. Signing out keeps your diary in Google Drive.</Txt>
        {PRIVACY_URL ? <Btn small kind="ghost" title="Privacy policy" onPress={() => Linking.openURL(PRIVACY_URL)} style={{ alignSelf: 'flex-start' }} /> : null}
        {!confirmDelete ? (
          <Btn small kind="danger" title="Delete my diary and disconnect" onPress={() => setConfirmDelete(true)} style={{ alignSelf: 'flex-start' }} />
        ) : (
          <View style={{ backgroundColor: c.accentSoft, borderRadius: 12, padding: 14, gap: 10 }}>
            <Txt v="strong">Delete your diary and disconnect Sakhi Samachar?</Txt>
            <Txt v="small" color={c.ink}>This permanently deletes the “Sakhi Samachar” folder and its files from your Google Drive, removes the copy on this phone, and removes the app’s access to your Google account. It can’t be undone. Export your diary first if you want a copy.</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Btn small title="Delete permanently" busy={busy === 'delete'} onPress={async () => { setBusy('delete'); const e = await deleteAccount(); setBusy(''); if (e) setErr(e); }} />
              <Btn small kind="quiet" title="Keep my diary" onPress={() => setConfirmDelete(false)} />
            </View>
            <ErrorText text={err} />
          </View>
        )}
      </Card>

      <Disclaimer />
    </ScrollView>
  );
}
