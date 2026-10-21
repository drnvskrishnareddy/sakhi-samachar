import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Disclaimer } from '../../components/Disclaimer';
import { MonthCalendar } from '../../components/MonthCalendar';
import { UpdateBanner } from '../../components/UpdateBanner';
import { Btn, Mark, Pill, Txt } from '../../components/ui';
import { diffDays, fmt, fmtY, keyOf, today } from '../../lib/dates';
import { useData } from '../../lib/data';
import { IS_DEMO } from '../../lib/demo';
import { haptic } from '../../lib/haptics';
import { font, usePalette } from '../../theme';

export default function CalendarScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { logs, analysis: A, sync, pendingCount, syncNow, saveLog, reconnect } = useData();
  const t = today(), tk = keyOf(t);
  const [month, setMonth] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const [refreshing, setRefreshing] = useState(false);

  const shift = (n: number) => { const d = new Date(month.y, month.m + n, 1); setMonth({ y: d.getFullYear(), m: d.getMonth() }); };
  const openDay = (k: string) => router.push({ pathname: '/day/[date]', params: { date: k } });

  // status headline (descriptive only; no FIGO category is assigned on this card)
  let head: string, sub: string;
  const pills: { text: string; tone: 'accent' | 'warn' }[] = [];
  if (!A.last) {
    head = 'Start your diary';
    sub = 'Tap the first day of your last menses on the calendar.';
  } else if (A.inMenses) {
    head = `Menses · day ${A.cycleDay}`;
    sub = 'Record flow volume and sanitary products each day.';
    pills.push({ text: 'Menses', tone: 'accent' });
  } else {
    head = `Cycle day ${A.cycleDay}`;
    sub = `Day 1 was the onset of your last menses, ${fmt(A.last.start)}.`;
    if ((A.cycleDay ?? 0) - 1 > 38) pills.push({ text: 'Interval over 38 days', tone: 'warn' });
  }
  const bleedingToday = !!logs[tk]?.bleeding;
  const syncText = IS_DEMO ? 'Demo' : sync === 'syncing' ? 'Saving…' : sync === 'reconnect' ? 'Reconnect' : pendingCount ? (sync === 'offline' ? 'Offline · will save' : 'Waiting to save') : sync === 'error' ? 'Save problem' : sync === 'offline' ? 'Offline' : 'Saved to Drive';

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 32, paddingHorizontal: 16, gap: 16, maxWidth: 600, width: '100%', alignSelf: 'center' }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={c.accent} onRefresh={async () => { setRefreshing(true); await syncNow().catch(() => {}); setRefreshing(false); }} />}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Mark size={28} />
          <Txt v="title">Sakhi Samachar</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${syncText}. Sync now`} onPress={() => (sync === 'reconnect' ? reconnect() : syncNow()).catch(() => {})} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.sunk, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: sync === 'error' ? c.accent : pendingCount || sync === 'offline' || sync === 'reconnect' ? c.warn : c.ok }} />
          <Text style={{ fontFamily: font.semibold, fontSize: 12.5, color: c.ink }}>{syncText}</Text>
        </Pressable>
      </View>

      <UpdateBanner />
      {sync === 'reconnect' ? (
        <View style={{ backgroundColor: c.warnSoft, borderRadius: 20, padding: 16, gap: 10 }} accessibilityRole="alert">
          <Txt v="strong">Reconnect to Google Drive</Txt>
          <Txt v="small" color={c.ink}>Google asks you to confirm again from time to time. Your entries are safe on this phone and will be saved to your Drive as soon as you reconnect.</Txt>
          <Btn small title="Reconnect" onPress={() => { reconnect(); }} style={{ alignSelf: 'flex-start' }} />
        </View>
      ) : null}
      {IS_DEMO ? (
        <View style={{ backgroundColor: c.sageSoft, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 16 }}>
          <Txt v="small" color={c.ink}>Demo with sample data. Entries stay in this browser only; nothing is sent anywhere.</Txt>
        </View>
      ) : null}

      <View style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 24, padding: 20, gap: 10, overflow: 'hidden' }}>
        <CycleRing progress={A.last ? Math.min(1, ((A.cycleDay ?? 1) - 1) / 38) : 0} late={!!A.last && (A.cycleDay ?? 0) - 1 > 38} />
        <Txt v="label">Today · {fmtY(t)}</Txt>
        <Txt v="display" style={{ maxWidth: '70%' }} accessibilityRole="header">{head}</Txt>
        <Txt muted style={{ maxWidth: '78%' }}>{sub}</Txt>
        {pills.length ? <View style={{ flexDirection: 'row', gap: 8 }}>{pills.map((p) => <Pill key={p.text} text={p.text} tone={p.tone} />)}</View> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
          {bleedingToday
            ? <Btn title="Update today" onPress={() => openDay(tk)} />
            : <Btn title="Menses started today" onPress={() => { haptic.success(); saveLog(tk, { bleeding: 'menses' }); openDay(tk); }} />}
          {!bleedingToday ? <Btn kind="ghost" title="Other bleeding" onPress={() => openDay(tk)} /> : null}
        </View>
      </View>

      <MonthCalendar year={month.y} month={month.m} logs={logs} analysis={A} onPressDay={(k) => {
        if (diffDays(t, new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10))) > 0) return;
        openDay(k);
      }} onPrev={() => shift(-1)} onNext={() => shift(1)} onToday={() => setMonth({ y: t.getFullYear(), m: t.getMonth() })} />

      <View style={{ gap: 6, paddingHorizontal: 4 }}>
        <Txt v="small">Tap any day up to today to record it. Cycle length is counted from the onset of one menses to the onset of the next.</Txt>
      </View>
      <Disclaimer />
    </ScrollView>
  );
}

function CycleRing({ progress, late }: { progress: number; late: boolean }) {
  const c = usePalette();
  // 24 dots around a circle; filled dots show how far through the cycle you are
  const n = 24, r = 58, size = 150;
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', right: -34, top: -34, width: size, height: size }}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        const on = i / n < progress;
        return <View key={i} style={{ position: 'absolute', left: size / 2 + r * Math.cos(a) - 4, top: size / 2 + r * Math.sin(a) - 4, width: 8, height: 8, borderRadius: 4, backgroundColor: on ? (late ? c.warn : c.accent) : c.sunk }} />;
      })}
    </View>
  );
}
