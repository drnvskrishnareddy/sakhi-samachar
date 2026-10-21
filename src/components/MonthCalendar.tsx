import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Analysis } from '../lib/cycle';
import { haptic } from '../lib/haptics';
import { diffDays, keyOf, MONTHS, today } from '../lib/dates';
import { BLEEDING_LABEL, Logs, VOLUME_LABEL } from '../lib/types';
import { font, usePalette } from '../theme';

interface Props { year: number; month: number; logs: Logs; analysis: Analysis; onPressDay: (key: string) => void; onPrev: () => void; onNext: () => void; onToday: () => void }

export function MonthCalendar({ year, month, logs, analysis: A, onPressDay, onPrev, onNext, onToday }: Props) {
  const c = usePalette();
  const t = today(), tk = keyOf(t);
  const first = new Date(year, month, 1);
  const dim = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7) cells.push(null);
  const isThisMonth = year === t.getFullYear() && month === t.getMonth();

  const navBtn = (label: string, glyph: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { haptic.select(); onPress(); }} hitSlop={6}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontSize: 20, lineHeight: 22, color: c.ink, fontFamily: font.semibold }}>{glyph}</Text>
    </Pressable>
  );

  return (
    <View style={{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 22, paddingHorizontal: 10, paddingTop: 14, paddingBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 10 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontFamily: font.display, fontSize: 20, letterSpacing: -0.3, color: c.ink }}>{MONTHS[month]} {year}</Text>
        {!isThisMonth ? (
          <Pressable accessibilityRole="button" onPress={onToday} style={{ backgroundColor: c.sunk, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: c.ink }}>Today</Text>
          </Pressable>
        ) : null}
        {navBtn('Previous month', '‹', onPrev)}
        {navBtn('Next month', '›', onNext)}
      </View>
      <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={{ width: `${100 / 7}%`, textAlign: 'center', fontFamily: font.semibold, fontSize: 12.5, color: c.muted, paddingBottom: 6 }}>{d}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((date, i) => {
          if (!date) return <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const k = keyOf(date), l = logs[k];
          const future = diffDays(t, date) > 0;
          const desc: string[] = [];
          let bg = 'transparent', fg = future ? c.muted : c.ink, ring: string | null = null, weight = font.medium;
          if (l?.bleeding === 'menses') {
            const v = l.volume;
            bg = v === 'heavy' ? c.accent : v === 'light' ? c.accentSoft : c.accentMid;
            fg = v === 'light' ? c.accent : v === 'heavy' ? c.onAccent : c.onMid; weight = font.bold;
            desc.push(`Menses${v ? ', ' + VOLUME_LABEL[v].toLowerCase() + ' flow' : ''}`);
            if (l.hmb_qol) desc.push('HMB');
          } else if (l?.bleeding === 'imb') {
            bg = c.imbSoft; fg = c.imb; ring = c.imb; weight = font.bold; desc.push(BLEEDING_LABEL.imb);
          } else if (l?.bleeding === 'unscheduled') {
            bg = c.warnSoft; fg = c.warn; ring = c.warn; weight = font.bold; desc.push(BLEEDING_LABEL.unscheduled);
          }
          const dot = !!l && (l.hmb_qol === true || !!l.note);
          if (l?.note) desc.push('note');
          const isToday = k === tk;
          return (
            <Pressable
              key={k}
              accessibilityRole="button"
              accessibilityLabel={`${isToday ? 'Today, ' : ''}${date.getDate()} ${MONTHS[month]}${desc.length ? ', ' + desc.join(', ') : ''}`}
              onPress={() => { haptic.select(); onPressDay(k); }}
              style={({ pressed }) => ({ width: `${100 / 7}%`, aspectRatio: 1, padding: 2.5, opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ flex: 1, borderRadius: 999, backgroundColor: bg, borderWidth: ring ? 2 : isToday ? 1.5 : 0, borderColor: ring ?? c.ink, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: isToday ? font.bold : weight, fontSize: 15, color: fg, fontVariant: ['tabular-nums'], textDecorationLine: isToday ? 'underline' : 'none' }}>{date.getDate()}</Text>
                {dot ? <View style={{ position: 'absolute', bottom: '13%', width: 5, height: 5, borderRadius: 3, backgroundColor: l?.bleeding === 'menses' && l.volume === 'heavy' ? c.onAccent : l?.bleeding === 'menses' && l.volume !== 'light' ? c.onMid : c.accent }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 8, marginTop: 12, paddingTop: 12, paddingHorizontal: 4, borderTopWidth: 1, borderTopColor: c.line }}>
        <Legend swatch={<View style={{ flexDirection: 'row', gap: 2 }}>{[c.accentSoft, c.accentMid, c.accent].map((x) => <View key={x} style={{ width: 10, height: 14, borderRadius: 3, backgroundColor: x }} />)}</View>} text="Menses: light, normal, heavy" />
        <Legend swatch={<View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.imbSoft, borderWidth: 2, borderColor: c.imb }} />} text="Intermenstrual bleeding" />
        <Legend swatch={<View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.warnSoft, borderWidth: 2, borderColor: c.warn }} />} text="Unscheduled bleeding" />
        <Legend swatch={<View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, margin: 4 }} />} text="HMB or note" />
      </View>
    </View>
  );
}

function Legend({ swatch, text }: { swatch: ReactNode; text: string }) {
  const c = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      {swatch}
      <Text style={{ fontFamily: font.body, fontSize: 13, color: c.muted }}>{text}</Text>
    </View>
  );
}
