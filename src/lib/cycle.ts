import { addDays, diffDays, keyOf, parseKey, today as todayDate } from './dates';
import { BLEEDING_LABEL, DayLog, FlowVolume, Logs, Product, PRODUCTS, Settings, VOLUME_LABEL } from './types';

/*
 * FIGO AUB System 1 (Munro, Critchley, Fraser. Int J Gynecol Obstet 2018;143:393–408, Fig. 1).
 *
 * FIGO definitions used (verbatim limits):
 *   Frequency   Absent (no bleeding) = amenorrhea · Infrequent >38 d · Normal ≥24 to ≤38 d · Frequent <24 d
 *   Duration    Normal ≤8 d · Prolonged >8 d
 *   Regularity  Normal or "Regular": shortest-to-longest cycle variation ≤7–9 d
 *               Irregular: variation ≥8–10 d
 *               Age-specific normal: 18–25 y ≤9 d; 26–41 y ≤7 d; 42–45 y ≤9 d (Harlow 2000)
 *   Flow volume (patient determined): Light · Normal · Heavy
 *   HMB         "Excessive menstrual blood loss which interferes with a woman's physical,
 *               social, emotional and/or material quality of life" (NICE, adopted by FIGO)
 *   IMB         Bleeding between cyclically regular onset of menses: None · Random ·
 *               Cyclic (predictable) – early, mid or late cycle
 *   Unscheduled bleeding on progestin ± estrogen gonadal steroids:
 *               Not applicable · None · Present
 *   Chronic AUB Bleeding from the uterine corpus abnormal in duration, volume, frequency
 *               and/or regularity, present for the majority of the preceding 6 months.
 *
 * App rules that are NOT FIGO definitions (stated wherever they are shown):
 *   R1  Menses days separated by at most one unrecorded day belong to one menses.
 *   R2  The summary uses menses with onset in the preceding 6 months (the period named
 *       in FIGO's definition of chronic AUB).
 */

export const WINDOW_DAYS = 183;

export type Frequency = 'infrequent' | 'normal' | 'frequent';
export type Duration = 'normal' | 'prolonged';
export type Regularity = 'regular' | 'irregular' | 'indeterminate';

export const frequencyOf = (len: number): Frequency => (len > 38 ? 'infrequent' : len < 24 ? 'frequent' : 'normal');
export const durationOf = (days: number): Duration => (days > 8 ? 'prolonged' : 'normal');
export const FREQUENCY_LABEL: Record<Frequency, string> = { infrequent: 'Infrequent (>38 days)', normal: 'Normal (≥24 to ≤38 days)', frequent: 'Frequent (<24 days)' };
export const DURATION_LABEL: Record<Duration, string> = { normal: 'Normal (≤8 days)', prolonged: 'Prolonged (>8 days)' };

/** FIGO age-specific upper limit of normal shortest-to-longest variation, or null when FIGO gives none. */
export function regularityLimit(age: number | null): number | null {
  if (age == null) return null;
  if (age >= 18 && age <= 25) return 9;
  if (age >= 26 && age <= 41) return 7;
  if (age >= 42 && age <= 45) return 9;
  return null;
}
export function regularityOf(variation: number, age: number | null): Regularity {
  const lim = regularityLimit(age);
  if (lim != null) return variation <= lim ? 'regular' : 'irregular';
  if (variation <= 7) return 'regular';
  if (variation >= 10) return 'irregular';
  return 'indeterminate';
}

export interface Menses {
  start: Date; end: Date; days: number;
  volumes: Record<FlowVolume, number>;   // days recorded at each volume
  heavyDays: number;
  hmb: boolean;                          // a heavy day with quality-of-life interference
  products: Record<Product, number>; clots: number;
  ongoing: boolean;
}
export interface Cycle { start: Date; len: number; frequency: Frequency; menses: Menses }
export interface Episode { start: Date; end: Date; days: number; cycleDay: number | null; cycleLen: number | null }

export interface Summary {
  from: Date; to: Date;
  mensesCount: number;
  cyclesCount: number;
  frequency: Record<Frequency, number>;
  currentInterval: number | null;          // days since last onset
  currentInfrequent: boolean;              // current interval already >38 d
  duration: Record<Duration, number>;
  durationRange: [number, number] | null;
  cycleRange: [number, number] | null;
  regularity: { state: Regularity | 'too-few'; variation: number | null; limit: number | null; age: number | null };
  volume: { light: number; normal: number; heavy: number; hmb: number }; // number of menses with ≥1 such day
  imb: Episode[];
  unscheduled: 'not-applicable' | 'none' | 'present';
  unscheduledEpisodes: Episode[];
}

export interface Analysis {
  menses: Menses[];
  cycles: Cycle[];
  last: Menses | null;
  inMenses: boolean;
  cycleDay: number | null;
  imbDays: Set<string>;
  unscheduledDays: Set<string>;
  summary: Summary;
}

const emptyVolumes = (): Record<FlowVolume, number> => ({ light: 0, normal: 0, heavy: 0 });

function groupEpisodes(keys: string[], menses: Menses[]): Episode[] {
  const out: Episode[] = [];
  for (const k of keys) {
    const d = parseKey(k), e = out[out.length - 1];
    if (e && diffDays(e.end, d) <= 2) { e.end = d; e.days++; }
    else out.push({ start: d, end: d, days: 1, cycleDay: null, cycleLen: null });
  }
  for (const e of out) {
    const i = [...menses].reverse().findIndex((m) => diffDays(m.start, e.start) >= 0);
    if (i >= 0) {
      const idx = menses.length - 1 - i;
      e.cycleDay = diffDays(menses[idx].start, e.start) + 1;
      e.cycleLen = menses[idx + 1] ? diffDays(menses[idx].start, menses[idx + 1].start) : null;
    }
  }
  return out;
}

export function analyse(logs: Logs, st: Settings, t: Date = todayDate()): Analysis {
  const keys = Object.keys(logs).sort();

  // menses (rule R1)
  const menses: Menses[] = [];
  for (const k of keys) {
    const l = logs[k];
    if (l.bleeding !== 'menses') continue;
    const d = parseKey(k), m = menses[menses.length - 1];
    if (m && diffDays(m.end, d) <= 2) m.end = d;
    else menses.push({ start: d, end: d, days: 1, volumes: emptyVolumes(), heavyDays: 0, hmb: false, products: { pads: 0, tampons: 0, cups: 0, cloths: 0, underwear: 0 }, clots: 0, ongoing: false });
  }
  for (const m of menses) {
    m.days = diffDays(m.start, m.end) + 1;
    for (let d = m.start; diffDays(d, m.end) >= 0; d = addDays(d, 1)) {
      const l: DayLog | undefined = logs[keyOf(d)];
      if (!l || l.bleeding !== 'menses') continue;
      if (l.volume) m.volumes[l.volume]++;
      if (l.volume === 'heavy') { m.heavyDays++; if (l.hmb_qol) m.hmb = true; }
      for (const p of PRODUCTS) m.products[p.key] += l[p.key] || 0;
      m.clots += l.clots;
    }
  }
  const last = menses.length ? menses[menses.length - 1] : null;
  if (last) last.ongoing = diffDays(last.end, t) <= 1;

  // cycles: onset to next onset
  const cycles: Cycle[] = [];
  for (let i = 0; i < menses.length - 1; i++) {
    const len = diffDays(menses[i].start, menses[i + 1].start);
    cycles.push({ start: menses[i].start, len, frequency: frequencyOf(len), menses: menses[i] });
  }

  // current status (no prediction of future menses)
  let cycleDay: number | null = null, inMenses = false;
  if (last) {
    cycleDay = diffDays(last.start, t) + 1;
    inMenses = last.ongoing;
  }

  // intermenstrual and unscheduled bleeding
  const imbKeys = keys.filter((k) => logs[k].bleeding === 'imb');
  const unschedKeys = keys.filter((k) => logs[k].bleeding === 'unscheduled');
  const imbAll = groupEpisodes(imbKeys, menses);
  const unschedAll = groupEpisodes(unschedKeys, menses);

  // FIGO System 1 summary over the preceding 6 months (rule R2)
  const from = addDays(t, -WINDOW_DAYS);
  const inWin = (d: Date) => diffDays(from, d) >= 0 && diffDays(d, t) >= 0;
  const wMenses = menses.filter((m) => inWin(m.start));
  const wCycles = cycles.filter((c) => inWin(c.start));
  const frequency: Record<Frequency, number> = { infrequent: 0, normal: 0, frequent: 0 };
  wCycles.forEach((c) => frequency[c.frequency]++);
  const currentInterval = last ? diffDays(last.start, t) : null;
  const currentInfrequent = currentInterval != null && currentInterval > 38;
  const finished = wMenses.filter((m) => !m.ongoing);
  const duration: Record<Duration, number> = { normal: 0, prolonged: 0 };
  finished.forEach((m) => duration[durationOf(m.days)]++);
  const age = st.birth_year ? t.getFullYear() - st.birth_year : null; // approximate: calendar-year age
  let regularity: Summary['regularity'] = { state: 'too-few', variation: null, limit: regularityLimit(age), age };
  if (wCycles.length >= 2) {
    const lens = wCycles.map((c) => c.len);
    const variation = Math.max(...lens) - Math.min(...lens);
    regularity = { state: regularityOf(variation, age), variation, limit: regularityLimit(age), age };
  }
  const volume = { light: 0, normal: 0, heavy: 0, hmb: 0 };
  wMenses.forEach((m) => {
    if (m.volumes.light) volume.light++;
    if (m.volumes.normal) volume.normal++;
    if (m.heavyDays) volume.heavy++;
    if (m.hmb) volume.hmb++;
  });
  const imb = imbAll.filter((e) => inWin(e.start));
  const unscheduledEpisodes = unschedAll.filter((e) => inWin(e.start));

  const summary: Summary = {
    from, to: t,
    mensesCount: wMenses.length,
    cyclesCount: wCycles.length,
    frequency, currentInterval, currentInfrequent,
    duration,
    durationRange: finished.length ? [Math.min(...finished.map((m) => m.days)), Math.max(...finished.map((m) => m.days))] : null,
    cycleRange: wCycles.length ? [Math.min(...wCycles.map((c) => c.len)), Math.max(...wCycles.map((c) => c.len))] : null,
    regularity,
    volume,
    imb,
    unscheduled: !st.on_gonadal_steroids ? 'not-applicable' : unscheduledEpisodes.length ? 'present' : 'none',
    unscheduledEpisodes,
  };

  return { menses, cycles, last, inMenses, cycleDay, imbDays: new Set(imbKeys), unscheduledDays: new Set(unschedKeys), summary };
}

export function toCSV(logs: Logs): string {
  const cols = ['date', 'bleeding', 'flow_volume_patient_determined', 'hmb', 'pads_napkins', 'tampons', 'menstrual_cup_emptied', 'cloth', 'period_underwear', 'clots_passed', 'note'];
  const q = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = Object.keys(logs).sort().map((k) => {
    const l = logs[k];
    return [k, l.bleeding ? BLEEDING_LABEL[l.bleeding] : '', l.volume ? VOLUME_LABEL[l.volume] : '', l.hmb_qol ? 'Yes' : '', ...PRODUCTS.map((p) => l[p.key] || ''), l.clots || '', l.note ?? ''].map(q).join(',');
  });
  return [cols.join(','), ...rows].join('\n');
}
