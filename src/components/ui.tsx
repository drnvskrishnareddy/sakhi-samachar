import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle } from 'react-native';
import { haptic } from '../lib/haptics';
import { font, usePalette } from '../theme';

// Every pressable shrinks very slightly while held: a soft, physical feel.
const press = (pressed: boolean) => ({ transform: [{ scale: pressed ? 0.97 : 1 }] });

type TxtVariant = 'display' | 'title' | 'heading' | 'body' | 'strong' | 'small' | 'label';
const sizes: Record<TxtVariant, TextStyle> = {
  display: { fontFamily: font.display, fontSize: 30, lineHeight: 37, letterSpacing: -0.5 },
  title: { fontFamily: font.display, fontSize: 23, lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontFamily: font.display, fontSize: 18, lineHeight: 25, letterSpacing: -0.2 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  strong: { fontFamily: font.bold, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: font.body, fontSize: 14, lineHeight: 20.5 },
  label: { fontFamily: font.semibold, fontSize: 14, lineHeight: 19 },
};

export function Txt({ v = 'body', muted, color, style, children, ...rest }: { v?: TxtVariant; muted?: boolean; color?: string; style?: StyleProp<TextStyle>; children: ReactNode; selectable?: boolean; numberOfLines?: number; accessibilityRole?: 'header' }) {
  const c = usePalette();
  return <Text style={[sizes[v], { color: color ?? (muted || v === 'label' || v === 'small' ? c.muted : c.ink) }, style]} {...rest}>{children}</Text>;
}

type BtnKind = 'primary' | 'ghost' | 'quiet' | 'danger';
export function Btn({ title, onPress, kind = 'primary', busy, disabled, style, small }: { title: string; onPress: () => void; kind?: BtnKind; busy?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const c = usePalette();
  const bg = kind === 'primary' ? c.accent : kind === 'quiet' ? c.sunk : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'quiet' ? c.ink : c.accent;
  const border = kind === 'ghost' ? c.accentMid : kind === 'danger' ? c.accent : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy), busy: !!busy }}
      disabled={disabled || busy}
      onPress={() => { haptic.tap(); onPress(); }}
      style={({ pressed }) => [
        { backgroundColor: bg, borderColor: border, borderWidth: 1.5, borderRadius: 999, paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 16 : 22, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.9 : 1, minHeight: small ? 40 : 50 },
        press(pressed),
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={{ fontFamily: font.bold, fontSize: small ? 14.5 : 16, color: fg }}>{title}</Text>}
    </Pressable>
  );
}

/** "‹ Back" at the top of a screen: returns to where the member came from. */
export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === 'Back' ? 'Go back' : label}
      hitSlop={10}
      onPress={() => { haptic.select(); onPress(); }}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 6, paddingRight: 10, minHeight: 40 }, press(pressed)]}
    >
      <Text style={{ fontFamily: font.bold, fontSize: 24, lineHeight: 26, color: c.accent, marginTop: -2 }}>‹</Text>
      <Text style={{ fontFamily: font.semibold, fontSize: 16, color: c.accent }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = usePalette();
  return <View style={[{ backgroundColor: c.surface, borderColor: c.line, borderWidth: 1, borderRadius: 22, padding: 18, gap: 12 }, style]}>{children}</View>;
}

function Chip({ label, selected, onPress, tone, role }: { label: string; selected: boolean; onPress: () => void; tone: 'accent' | 'imb' | 'warn'; role: 'radio' | 'checkbox' }) {
  const c = usePalette();
  const on = tone === 'imb' ? c.imb : tone === 'warn' ? c.warn : c.accent;
  const onText = tone === 'accent' ? c.onAccent : c.surface;
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { selected } : { checked: selected }}
      onPress={() => { haptic.select(); onPress(); }}
      style={({ pressed }) => [{ borderWidth: 1.5, borderColor: selected ? on : c.line, backgroundColor: selected ? on : c.surface, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }, press(pressed)]}
    >
      <Text style={{ fontFamily: selected ? font.bold : font.semibold, fontSize: 15, color: selected ? onText : c.ink }}>{selected && role === 'checkbox' ? `✓  ${label}` : label}</Text>
    </Pressable>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, tone = 'accent', allowClear = true, label }: { options: [T, string][]; value: T | null; onChange: (v: T | null) => void; tone?: 'accent' | 'imb' | 'warn'; allowClear?: boolean; label: string }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([v, l]) => (
        <Chip key={String(v)} label={l} role="radio" tone={tone} selected={value === v} onPress={() => onChange(value === v && allowClear ? null : v)} />
      ))}
    </View>
  );
}

export function MultiChips<T extends string>({ options, values, onToggle, label }: { options: [T, string][]; values: T[]; onToggle: (v: T) => void; label: string }) {
  return (
    <View accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(([v, l]) => <Chip key={v} label={l} role="checkbox" tone="accent" selected={values.includes(v)} onPress={() => onToggle(v)} />)}
    </View>
  );
}

/** A large on/off button with a title and a short explanation (used for HMB). */
export function ToggleCard({ title, subtitle, on, onPress }: { title: string; subtitle: string; on: boolean; onPress: () => void }) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={() => { if (on) haptic.select(); else haptic.success(); onPress(); }}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: on ? c.accent : c.accentMid, backgroundColor: on ? c.accent : c.accentSoft, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16 }, press(pressed)]}
    >
      <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: on ? c.onAccent : c.accent, backgroundColor: on ? c.onAccent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Text style={{ color: c.accent, fontFamily: font.bold, fontSize: 16, lineHeight: 18 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 17, color: on ? c.onAccent : c.accent }}>{title}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 13.5, lineHeight: 19, color: on ? c.onAccent : c.ink }}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export function Stepper({ label, hint, value, onChange }: { label: string; hint?: string; value: number; onChange: (n: number) => void }) {
  const c = usePalette();
  const btn = (sign: 1 | -1) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sign > 0 ? 'Add one' : 'Remove one'}: ${label}`}
      disabled={sign < 0 && value === 0}
      onPress={() => { haptic.tap(); onChange(Math.max(0, Math.min(50, value + sign))); }}
      hitSlop={6}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: sign > 0 ? c.accentMid : c.line, backgroundColor: sign > 0 ? c.accentSoft : c.surface, alignItems: 'center', justifyContent: 'center', opacity: sign < 0 && value === 0 ? 0.35 : 1 }, press(pressed)]}
    >
      <Text style={{ fontFamily: font.bold, fontSize: 22, lineHeight: 24, color: sign > 0 ? c.accent : c.ink }}>{sign > 0 ? '+' : '−'}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15.5, color: c.ink }}>{label}</Text>
        {hint ? <Text style={{ fontFamily: font.body, fontSize: 13, color: c.muted }}>{hint}</Text> : null}
      </View>
      {btn(-1)}
      <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.bold, fontSize: 19, minWidth: 28, textAlign: 'center', color: c.ink, fontVariant: ['tabular-nums'] }}>{value}</Text>
      {btn(1)}
    </View>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  const c = usePalette();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 14.5, color: c.ink }}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        accessibilityLabel={label}
        style={[{ borderWidth: 1.5, borderColor: c.line, backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: font.body, fontSize: 16.5, color: c.ink }, style]}
        {...rest}
      />
    </View>
  );
}

export function Pill({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'na' | 'accent' | 'sage' | 'imb' }) {
  const c = usePalette();
  const map = { ok: [c.okSoft, c.ok], warn: [c.warnSoft, c.warn], na: [c.sunk, c.muted], accent: [c.accentSoft, c.accent], sage: [c.sageSoft, c.sage], imb: [c.imbSoft, c.imb] } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 3 }}>
      <Text style={{ fontFamily: font.bold, fontSize: 12.5, color: fg }}>{text}</Text>
    </View>
  );
}

export function Divider() {
  const c = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: c.line }} />;
}

export function ErrorText({ text }: { text: string }) {
  const c = usePalette();
  if (!text) return null;
  return <Text accessibilityLiveRegion="assertive" style={{ fontFamily: font.bold, fontSize: 14, color: c.accent }}>{text}</Text>;
}

export function CheckRow({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
  const c = usePalette();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => { haptic.select(); onToggle(); }} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: checked ? c.accent : c.muted, backgroundColor: checked ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        {checked ? <Text style={{ color: c.onAccent, fontFamily: font.bold, fontSize: 14, lineHeight: 16 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

/** The Sakhi Samachar mark: a cycle ring with two accent arcs. */
export function Mark({ size = 34 }: { size?: number }) {
  const c = usePalette();
  const s = size, w = Math.max(3, s * 0.1);
  return (
    <View style={{ width: s, height: s, borderRadius: s / 2, borderWidth: w, borderColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ position: 'absolute', top: -w, left: -w, width: s, height: s, borderRadius: s / 2, borderWidth: w, borderColor: 'transparent', borderTopColor: c.accent, borderRightColor: c.accent, transform: [{ rotate: '-20deg' }] }} />
      <View style={{ position: 'absolute', top: -w, left: -w, width: s, height: s, borderRadius: s / 2, borderWidth: w, borderColor: 'transparent', borderBottomColor: c.sage, transform: [{ rotate: '-35deg' }] }} />
      <View style={{ width: s * 0.22, height: s * 0.22, borderRadius: s, backgroundColor: c.accent }} />
    </View>
  );
}
