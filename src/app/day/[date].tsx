import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton, Btn, Card, Chips, Divider, MultiChips, Stepper, ToggleCard, Txt } from '../../components/ui';
import { diffDays, fmtLong, isValidKey, parseKey, today } from '../../lib/dates';
import { useData } from '../../lib/data';
import { BleedingType, emptyLog, FlowVolume, Product, PRODUCTS } from '../../lib/types';
import { font, usePalette } from '../../theme';

export default function DayScreen() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { logs, saveLog, settings, saveSettings } = useData();
  const valid = isValidKey(date) && diffDays(today(), parseKey(date)) <= 0;
  const log = (valid && logs[date]) || emptyLog(valid ? date : '2000-01-01');
  const [note, setNote] = useState(log.note ?? '');
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { if (noteTimer.current) clearTimeout(noteTimer.current); }, []);

  // Back to the calendar; if the day was opened directly (e.g. a web link), go home instead.
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!valid) {
    return (
      <View style={{ flex: 1, padding: 24, paddingTop: insets.top + 24, gap: 16, backgroundColor: c.bg }}>
        <Txt v="title">Can’t open this day</Txt>
        <Txt muted>Only today and earlier days can be recorded.</Txt>
        <Btn title="Back to calendar" onPress={goBack} />
      </View>
    );
  }

  const set = (patch: Parameters<typeof saveLog>[1]) => saveLog(date, patch);
  const bleedingOptions: [BleedingType | 'none', string][] = [['none', 'None'], ['menses', 'Menses'], ['imb', 'Intermenstrual bleeding']];
  if (settings.on_gonadal_steroids || log.bleeding === 'unscheduled') bleedingOptions.push(['unscheduled', 'Unscheduled bleeding']);
  const help: Record<BleedingType, string> = {
    menses: 'Your menstrual bleeding.',
    imb: 'Bleeding between cyclically regular onset of menses. Recorded separately; it does not count as menses.',
    unscheduled: 'Unscheduled bleeding while on progestin ± estrogen gonadal steroids (birth control pills, rings, patches or injections).',
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: (Platform.OS === 'ios' ? 10 : insets.top + 6), paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.surface, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <BackButton onPress={goBack} />
          <Btn small title="Done" onPress={goBack} />
        </View>
        <Txt v="label">{diffDays(parseKey(date), today()) === 0 ? 'Today' : 'Record day'}</Txt>
        <Txt v="title" accessibilityRole="header">{fmtLong(parseKey(date))}</Txt>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 14, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
        <Card>
          <Txt v="heading">Bleeding</Txt>
          <Chips label="Bleeding" tone={log.bleeding === 'imb' ? 'imb' : log.bleeding === 'unscheduled' ? 'warn' : 'accent'} allowClear={false} options={bleedingOptions} value={log.bleeding ?? 'none'}
            onChange={(v) => set({ bleeding: !v || v === 'none' ? null : v })} />
          {log.bleeding ? <Txt v="small">{help[log.bleeding]}</Txt> : null}
        </Card>

        {log.bleeding === 'menses' ? (
          <Card>
            <Txt v="heading">Flow volume</Txt>
            <Txt v="small">FIGO: flow volume is patient determined. Use your own judgement.</Txt>
            <Chips<FlowVolume> label="Flow volume" options={[['light', 'Light'], ['normal', 'Normal'], ['heavy', 'Heavy']]} value={log.volume} onChange={(v) => set({ volume: v })} />
            <View style={{ marginTop: 6 }}>
              <ToggleCard
                title="HMB · Heavy menstrual bleeding"
                subtitle="Tap if the bleeding is excessive and interferes with your physical, social, emotional and/or material quality of life."
                on={!!log.hmb_qol}
                onPress={() => set(log.hmb_qol ? { hmb_qol: false } : { volume: 'heavy', hmb_qol: true })}
              />
            </View>
          </Card>
        ) : null}

        {log.bleeding ? (
          <Card style={{ gap: 6 }}>
            <Txt v="heading">Sanitary products</Txt>
            <Txt v="small">Tap what you use. Sakhi Samachar remembers your choice for next time.</Txt>
            <MultiChips<Product> label="Sanitary products you use" options={PRODUCTS.map((p) => [p.key, p.chip] as [Product, string])} values={settings.products}
              onToggle={(k) => saveSettings({ products: settings.products.includes(k) ? settings.products.filter((x) => x !== k) : [...settings.products, k] })} />
            <View style={{ marginTop: 6 }}>
              {PRODUCTS.filter((p) => settings.products.includes(p.key) || log[p.key] > 0).map((p) => (
                <Stepper key={p.key} label={p.label} hint={p.hint} value={log[p.key]} onChange={(n) => set({ [p.key]: n })} />
              ))}
            </View>
            <View style={{ height: 4 }} /><Divider /><View style={{ height: 4 }} />
            <Stepper label="Clots passed" hint="Number seen today" value={log.clots} onChange={(n) => set({ clots: n })} />
          </Card>
        ) : null}

        <Card>
          <Txt v="heading">Note</Txt>
          <TextInput
            value={note}
            onChangeText={(v) => { setNote(v); if (noteTimer.current) clearTimeout(noteTimer.current); noteTimer.current = setTimeout(() => set({ note: v.trim() ? v : null }), 500); }}
            onBlur={() => set({ note: note.trim() ? note : null })}
            multiline maxLength={1000} placeholder="Medicines taken, anything unusual" placeholderTextColor={c.muted}
            accessibilityLabel="Note"
            style={{ minHeight: 84, textAlignVertical: 'top', borderWidth: 1.5, borderColor: c.line, borderRadius: 12, padding: 12, fontFamily: font.body, fontSize: 16, color: c.ink, backgroundColor: c.surface }}
          />
        </Card>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn kind="quiet" title="Clear this day" onPress={() => { if (noteTimer.current) clearTimeout(noteTimer.current); setNote(''); saveLog(date, null); }} />
          <Txt v="small">Changes save automatically.</Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
