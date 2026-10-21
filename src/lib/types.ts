/*
 * Vocabulary follows FIGO AUB System 1 only:
 * Munro MG, Critchley HOD, Fraser IS; FIGO Menstrual Disorders Committee.
 * The two FIGO systems for normal and abnormal uterine bleeding symptoms and
 * classification of causes of abnormal uterine bleeding in the reproductive
 * years: 2018 revisions. Int J Gynecol Obstet 2018;143:393–408.
 */

/** What kind of bleeding was recorded on a day. */
export type BleedingType = 'menses' | 'imb' | 'unscheduled';
/** FIGO "Flow volume (patient determined)". */
export type FlowVolume = 'light' | 'normal' | 'heavy';

/** One recorded calendar day. Field names match the `day_logs` table. */
export interface DayLog {
  log_date: string;
  bleeding: BleedingType | null;
  volume: FlowVolume | null;       // menses days only
  hmb_qol: boolean | null;         // asked only when volume is heavy (NICE definition adopted by FIGO)
  pads: number;                    // sanitary pads / napkins changed   (raw counts: no scoring,
  tampons: number;                 // tampons changed                     FIGO sets no limits
  cups: number;                    // menstrual cup emptied               for any of them)
  cloths: number;                  // cloth changed
  underwear: number;               // period underwear changed
  clots: number;                   // clots passed (raw count, no size grading)
  note: string | null;
  updated_at: string;
}

/** Sanitary products a member can count. */
export type Product = 'pads' | 'tampons' | 'cups' | 'cloths' | 'underwear';
export const PRODUCTS: { key: Product; chip: string; label: string; hint: string }[] = [
  { key: 'pads', chip: 'Pads / napkins', label: 'Pads / napkins', hint: 'Number changed today' },
  { key: 'tampons', chip: 'Tampons', label: 'Tampons', hint: 'Number changed today' },
  { key: 'cups', chip: 'Menstrual cup', label: 'Menstrual cup', hint: 'Times emptied today' },
  { key: 'cloths', chip: 'Cloth', label: 'Cloth', hint: 'Number changed today' },
  { key: 'underwear', chip: 'Period underwear', label: 'Period underwear', hint: 'Number changed today' },
];

export interface Settings {
  products: Product[];             // products she uses; their counters show on each bleeding day
  birth_year: number | null;       // optional; only for FIGO age-specific regularity limits
  on_gonadal_steroids: boolean;    // progestin ± estrogen: pills, rings, patches or injections
  consent_at: string | null;
}

export type Logs = Record<string, DayLog>;

export const DEFAULT_SETTINGS: Settings = { products: ['pads'], birth_year: null, on_gonadal_steroids: false, consent_at: null };

export const emptyLog = (date: string): DayLog => ({
  log_date: date,
  bleeding: null,
  volume: null,
  hmb_qol: null,
  pads: 0,
  tampons: 0,
  cups: 0,
  cloths: 0,
  underwear: 0,
  clots: 0,
  note: null,
  updated_at: new Date().toISOString(),
});

export const isEmptyLog = (l: DayLog) => !l.bleeding && !(l.note && l.note.trim()) && !l.clots && PRODUCTS.every((p) => !l[p.key]);

export const BLEEDING_LABEL: Record<BleedingType, string> = {
  menses: 'Menses',
  imb: 'Intermenstrual bleeding',
  unscheduled: 'Unscheduled bleeding',
};
export const VOLUME_LABEL: Record<FlowVolume, string> = { light: 'Light', normal: 'Normal', heavy: 'Heavy' };
