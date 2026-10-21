import { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Disclaimer } from '../../components/Disclaimer';
import { Card, Divider, Pill, Txt } from '../../components/ui';
import { DURATION_LABEL, durationOf, Episode, FREQUENCY_LABEL } from '../../lib/cycle';
import { fmt, fmtY, plural } from '../../lib/dates';
import { useData } from '../../lib/data';
import { PRODUCTS } from '../../lib/types';
import { font, usePalette } from '../../theme';

export default function Insights() {
  const c = usePalette();
  const insets = useSafeAreaInsets();
  const { analysis: A, settings } = useData();
  const S = A.summary;
  const n = (x: number) => (x ? String(x) : '');
  const reg = S.regularity;
  const ageBand = reg.limit != null ? `age ${reg.age}: normal ≤${reg.limit} days` : reg.age != null ? `age ${reg.age}: FIGO gives no age-specific limit` : 'age not given';

  // newest first: each menses with the cycle that began with it
  const rows = [...A.menses].reverse().slice(0, 12).map((m) => {
    const i = A.menses.indexOf(m);
    return { m, cycle: A.cycles[i] ?? null };
  });

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 32, paddingHorizontal: 16, gap: 14, maxWidth: 600, width: '100%', alignSelf: 'center' }}>
      <View style={{ gap: 4 }}>
        <Txt v="title" accessibilityRole="header">Insights</Txt>
        <Txt v="small">Preceding 6 months · {fmtY(S.from)} – {fmtY(S.to)} · {S.mensesCount} menses, {plural(S.cyclesCount, 'complete cycle')}</Txt>
      </View>

      <Card style={{ gap: 14 }}>
        <View style={{ gap: 2 }}>
          <Txt v="heading">FIGO AUB System 1</Txt>
          <Txt v="small">Symptom parameters, from your entries. Ticks show which categories your cycles fall into; numbers are counts.</Txt>
        </View>

        <Param title="Frequency" note={S.cycleRange ? `Cycle lengths ${S.cycleRange[0]}–${S.cycleRange[1]} days.` : 'Needs two recorded onsets of menses.'}>
          <Opt label="Absent (no bleeding) = amenorrhea" checked={false} value="" />
          <Opt label={FREQUENCY_LABEL.infrequent} checked={S.frequency.infrequent > 0 || S.currentInfrequent} value={n(S.frequency.infrequent) + (S.currentInfrequent ? `${S.frequency.infrequent ? ' + ' : ''}current` : '')} />
          <Opt label={FREQUENCY_LABEL.normal} checked={S.frequency.normal > 0} value={n(S.frequency.normal)} />
          <Opt label={FREQUENCY_LABEL.frequent} checked={S.frequency.frequent > 0} value={n(S.frequency.frequent)} />
          {S.currentInterval != null ? <Txt v="small">Current interval since last onset: {plural(S.currentInterval, 'day')}. FIGO does not give a duration for amenorrhea, so the app never ticks it.</Txt> : null}
        </Param>

        <Divider />
        <Param title="Duration" note={S.durationRange ? `Menses lasted ${S.durationRange[0] === S.durationRange[1] ? S.durationRange[0] : `${S.durationRange[0]}–${S.durationRange[1]}`} days.` : 'Needs one completed menses.'}>
          <Opt label={DURATION_LABEL.normal} checked={S.duration.normal > 0} value={n(S.duration.normal)} />
          <Opt label={DURATION_LABEL.prolonged} checked={S.duration.prolonged > 0} value={n(S.duration.prolonged)} />
        </Param>

        <Divider />
        <Param title="Regularity" note={reg.variation != null ? `Shortest to longest cycle variation: ${plural(reg.variation, 'day')} (${ageBand}).` : 'Needs at least two complete cycles in the preceding 6 months.'}>
          <Opt label={'Normal or “Regular” (variation ≤7–9 days)'} checked={reg.state === 'regular'} value="" />
          <Opt label="Irregular (variation ≥8–10 days)" checked={reg.state === 'irregular'} value="" />
          {reg.state === 'indeterminate' ? <Txt v="small" color={c.warn}>A variation of 8–9 days is regular or irregular depending on age (18–25 and 42–45 years: normal ≤9 days; 26–41 years: normal ≤7 days). Add year of birth in Settings.</Txt> : null}
        </Param>

        <Divider />
        <Param title="Flow volume (patient determined)" note="Number of menses with at least one day at each volume, as you judged it.">
          <Opt label="Light" checked={S.volume.light > 0} value={n(S.volume.light)} />
          <Opt label="Normal" checked={S.volume.normal > 0} value={n(S.volume.normal)} />
          <Opt label="Heavy" checked={S.volume.heavy > 0} value={n(S.volume.heavy)} />
          <View style={{ paddingLeft: 30 }}>
            <Opt label="HMB: interferes with quality of life" checked={S.volume.hmb > 0} value={n(S.volume.hmb)} />
          </View>
        </Param>

        <Divider />
        <Param title="Intermenstrual bleeding (IMB)" note="Bleeding between cyclically regular onset of menses.">
          <Opt label="None" checked={S.imb.length === 0} value="" />
          <Opt label="Present: random or cyclic (early, mid or late cycle)" checked={S.imb.length > 0} value={n(S.imb.length)} />
          {S.imb.length ? <Txt v="small">Random or cyclic is left to your doctor: FIGO gives no numeric rule for it. The cycle day of each episode is listed below.</Txt> : null}
        </Param>

        <Divider />
        <Param title="Unscheduled bleeding on progestin ± estrogen gonadal steroids" note="Birth control pills, rings, patches or injections.">
          <Opt label="Not applicable (not on gonadal steroid medication)" checked={S.unscheduled === 'not-applicable'} value="" />
          <Opt label="None (on gonadal steroid medication)" checked={S.unscheduled === 'none'} value="" />
          <Opt label="Present" checked={S.unscheduled === 'present'} value={n(S.unscheduledEpisodes.length)} />
        </Param>
      </Card>

      <Card>
        <Txt v="heading">Menses</Txt>
        {rows.length ? rows.map(({ m, cycle }, i) => (
          <View key={m.start.toISOString()} style={{ gap: 6 }}>
            {i > 0 ? <View style={{ marginBottom: 6 }}><Divider /></View> : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 15, color: c.ink }}>{fmtY(m.start)}{m.ongoing ? ' · ongoing' : ''}</Text>
              {m.hmb ? <Pill text="HMB" tone="accent" /> : null}
            </View>
            <Txt v="small" color={c.ink}>
              Duration {plural(m.days, 'day')}{m.ongoing ? ' so far' : ` · ${durationOf(m.days) === 'prolonged' ? 'Prolonged' : 'Normal'}`}
              {cycle ? `  ·  Cycle ${cycle.len} days · ${cycle.frequency === 'normal' ? 'Normal' : cycle.frequency === 'infrequent' ? 'Infrequent' : 'Frequent'}` : ''}
            </Txt>
            <Txt v="small">
              Flow: {[m.volumes.light ? `light ${m.volumes.light} d` : '', m.volumes.normal ? `normal ${m.volumes.normal} d` : '', m.volumes.heavy ? `heavy ${m.volumes.heavy} d` : ''].filter(Boolean).join(', ') || 'not recorded'}
              {PRODUCTS.filter((p) => m.products[p.key]).map((p) => `  ·  ${p.label} ${m.products[p.key]}`).join('')}{m.clots ? `  ·  ${plural(m.clots, 'clot')}` : ''}
            </Txt>
          </View>
        )) : <Txt v="small">Your menses will appear here once you record one.</Txt>}
      </Card>

      <EpisodeCard title="Intermenstrual bleeding" items={[...A.summary.imb].reverse()} empty="None recorded in the preceding 6 months." tone="imb" />
      {settings.on_gonadal_steroids || S.unscheduledEpisodes.length ? <EpisodeCard title="Unscheduled bleeding" items={[...S.unscheduledEpisodes].reverse()} empty="None recorded in the preceding 6 months." tone="warn" /> : null}

      <View style={{ gap: 8, paddingHorizontal: 4 }}>
        <Txt v="small">Terms and limits: FIGO AUB System 1, 2018 revision (Munro, Critchley, Fraser. Int J Gynecol Obstet 2018;143:393–408).</Txt>
        <Txt v="small">HMB (heavy menstrual bleeding): “excessive menstrual blood loss which interferes with a woman’s physical, social, emotional and/or material quality of life”, the NICE definition adopted by FIGO. It is a symptom, not a diagnosis.</Txt>
        <Txt v="small">App rules that are not FIGO definitions: menses days separated by one unrecorded day count as one menses; the summary covers menses starting in the preceding 6 months; age is taken as this year minus year of birth. Sanitary product and clot counts are recorded for your doctor; FIGO sets no limits for them.</Txt>
        <Txt v="small" color={c.ink} style={{ fontFamily: font.semibold }}>This summary describes symptoms only. Abnormal uterine bleeding is confirmed by a doctor after excluding pregnancy and bleeding from outside the uterus.</Txt>
      </View>
      <Disclaimer />
    </ScrollView>
  );
}

function Param({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt v="strong">{title}</Txt>
      <View style={{ gap: 6 }}>{children}</View>
      {note ? <Txt v="small">{note}</Txt> : null}
    </View>
  );
}

function Opt({ label, checked, value }: { label: string; checked: boolean; value: string }) {
  const c = usePalette();
  return (
    <View accessible accessibilityLabel={`${label}: ${checked ? 'yes' : 'no'}${value ? ', ' + value : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: checked ? c.accent : c.line, backgroundColor: checked ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <Text style={{ color: c.onAccent, fontFamily: font.bold, fontSize: 12, lineHeight: 14 }}>✓</Text> : null}
      </View>
      <Text style={{ flex: 1, fontFamily: checked ? font.semibold : font.body, fontSize: 14.5, color: checked ? c.ink : c.muted }}>{label}</Text>
      {value ? <Text style={{ fontFamily: font.bold, fontSize: 14.5, color: c.ink, fontVariant: ['tabular-nums'] }}>{value}</Text> : null}
    </View>
  );
}

function EpisodeCard({ title, items, empty, tone }: { title: string; items: Episode[]; empty: string; tone: 'imb' | 'warn' }) {
  const c = usePalette();
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Txt v="heading">{title}</Txt>
        <Pill text={items.length ? plural(items.length, 'episode') : 'None'} tone={items.length ? tone : 'ok'} />
      </View>
      {items.length ? items.slice(0, 10).map((e) => (
        <Text key={e.start.toISOString()} style={{ fontFamily: font.body, fontSize: 14.5, color: c.ink }}>
          {fmtY(e.start)}{e.days > 1 ? ` – ${fmt(e.end)}` : ''}
          <Text style={{ color: c.muted }}>{`  ·  ${plural(e.days, 'day')}${e.cycleDay ? ` · cycle day ${e.cycleDay}${e.cycleLen ? ` of ${e.cycleLen}` : ''}` : ''}`}</Text>
        </Text>
      )) : <Txt v="small">{empty}</Txt>}
    </Card>
  );
}
