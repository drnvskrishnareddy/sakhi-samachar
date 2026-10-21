// Demo mode (EXPO_PUBLIC_DEMO=1): no server, no account. Sample entries live only on
// this device so people can try the app before it is connected to Supabase.
import { addDays, keyOf, today } from './dates';
import { DayLog, emptyLog, FlowVolume, Logs, Settings } from './types';

export const IS_DEMO = process.env.EXPO_PUBLIC_DEMO === '1';
export const DEMO_UID = '00000000-0000-4000-8000-00000000demo';
export const DEMO_EMAIL = 'sample@sakhi-samachar.app';

export function demoLogs(): Logs {
  const t = today(), logs: Logs = {};
  const put = (offset: number, patch: Partial<DayLog>) => {
    const k = keyOf(addDays(t, offset));
    logs[k] = { ...emptyLog(k), ...patch };
  };
  const vols: FlowVolume[] = ['normal', 'heavy', 'heavy', 'normal', 'light'];
  [-109, -80, -53, -19].forEach((start, ci) => {
    vols.forEach((v, i) => put(start + i, {
      bleeding: 'menses', volume: v,
      hmb_qol: v === 'heavy' ? ci === 3 : null,
      pads: [3, 5, 5, 3, 2][i], tampons: ci === 3 && i < 3 ? 1 : 0,
      clots: i === 1 ? 2 : i === 2 ? 1 : 0,
      note: ci === 3 && i === 1 ? 'Sample note: took a pain reliever' : null,
    }));
  });
  put(-9, { bleeding: 'imb', pads: 1, note: 'Sample note: brown discharge' });
  put(-8, { bleeding: 'imb' });
  return logs;
}

export const demoSettings = (): Settings => ({ products: ['pads', 'tampons'], birth_year: 1994, on_gonadal_steroids: false, consent_at: new Date().toISOString() });
