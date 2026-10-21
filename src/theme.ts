import { useColorScheme } from 'react-native';

// Soft rose and plum on a blush ground; lavender for intermenstrual bleeding,
// apricot for unscheduled bleeding, sage as the quiet second accent.
const light = {
  bg: '#FBF5F7', surface: '#FFFFFF', sunk: '#F4E9EE', ink: '#3B2535', muted: '#7A6573', line: '#EBDDE4',
  accent: '#A63D66', onAccent: '#FFFFFF', accentSoft: '#FCE8EF', accentMid: '#E596B2', onMid: '#3B2535',
  sage: '#5E9483', sageSoft: '#E3F0EB',
  warn: '#8F521C', warnSoft: '#FCEBDC', ok: '#356F54', okSoft: '#E0F0E7',
  imb: '#6E4FA8', imbSoft: '#EEE6F8', scrim: 'rgba(59,37,53,0.40)',
};
const dark: typeof light = {
  bg: '#1B1419', surface: '#261C24', sunk: '#31252F', ink: '#F6EAF0', muted: '#B59FAD', line: '#3D2F39',
  accent: '#F08DB0', onAccent: '#2A1220', accentSoft: '#4A2436', accentMid: '#8E4262', onMid: '#F6EAF0',
  sage: '#8CC3B2', sageSoft: '#1F3530',
  warn: '#EDB27A', warnSoft: '#3D2C1C', ok: '#8ED3AE', okSoft: '#1E3529',
  imb: '#C3A6F0', imbSoft: '#33284A', scrim: 'rgba(0,0,0,0.6)',
};
export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
export function useIsDark() {
  return useColorScheme() === 'dark';
}

// One typeface across the whole app: Inter (closest open-licence match to Aptos,
// which cannot be embedded in a store app without a paid app licence).
// Headings, the app name and the month titles use Inter Bold.
export const font = {
  display: 'Inter_700Bold',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
