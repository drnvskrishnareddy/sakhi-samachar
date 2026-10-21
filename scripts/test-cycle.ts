// Logic checks for FIGO AUB System 1 summary. Run: npx tsx scripts/test-cycle.ts
import assert from 'node:assert/strict';
import { analyse, frequencyOf, regularityOf, toCSV } from '../src/lib/cycle';
import { addDays, keyOf } from '../src/lib/dates';
import { DayLog, DEFAULT_SETTINGS, emptyLog, Logs } from '../src/lib/types';

const T = new Date(2026, 9, 21); // 21 Oct 2026
const at = (offset: number, patch: Partial<DayLog>): [string, DayLog] => {
  const k = keyOf(addDays(T, offset));
  return [k, { ...emptyLog(k), ...patch }];
};
const put = (logs: Logs, e: [string, DayLog]) => { logs[e[0]] = e[1]; };

// FIGO boundaries
assert.equal(frequencyOf(23), 'frequent');
assert.equal(frequencyOf(24), 'normal');
assert.equal(frequencyOf(38), 'normal');
assert.equal(frequencyOf(39), 'infrequent');
assert.equal(regularityOf(9, 22), 'regular');     // 18–25 y: ≤9
assert.equal(regularityOf(10, 22), 'irregular');
assert.equal(regularityOf(7, 30), 'regular');     // 26–41 y: ≤7
assert.equal(regularityOf(8, 30), 'irregular');
assert.equal(regularityOf(9, 44), 'regular');     // 42–45 y: ≤9
assert.equal(regularityOf(8, null), 'indeterminate');
assert.equal(regularityOf(10, null), 'irregular');
assert.equal(regularityOf(7, null), 'regular');

// four menses, cycles 29, 27, 34 → variation 7
const logs: Logs = {};
const onsets = [-109, -80, -53, -19];
onsets.forEach((s, ci) => {
  const vols = ['normal', 'heavy', 'heavy', 'normal', 'light'] as const;
  vols.forEach((v, i) => put(logs, at(s + i, { bleeding: 'menses', volume: v, hmb_qol: v === 'heavy' ? ci === 3 : null, pads: 3, clots: i === 1 ? 2 : 0 })));
});
put(logs, at(-9, { bleeding: 'imb' }));
put(logs, at(-8, { bleeding: 'imb' }));

const A = analyse(logs, { ...DEFAULT_SETTINGS, birth_year: 1996 }, T);
assert.equal(A.menses.length, 4);
assert.deepEqual(A.cycles.map((c) => c.len), [29, 27, 34]);
assert.equal(A.menses[0].days, 5);
const S = A.summary;
assert.equal(S.frequency.normal, 3);
assert.equal(S.duration.normal, 4);
assert.equal(S.regularity.variation, 7);
assert.equal(S.regularity.limit, 7);           // age 30 → 26–41 band
assert.equal(S.regularity.state, 'regular');
assert.equal(S.volume.hmb, 1);                 // only the last menses reported QoL interference
assert.equal(S.volume.heavy, 4);
assert.equal(S.imb.length, 1);
assert.equal(S.imb[0].days, 2);
assert.equal(S.imb[0].cycleDay, 11);
assert.equal(S.unscheduled, 'not-applicable');
assert.equal(A.menses[3].products.pads, 15);
assert.ok(toCSV(logs).startsWith('date,bleeding,flow_volume_patient_determined'));

// prolonged menses (9 days) and on gonadal steroids with unscheduled bleeding
const B: Logs = {};
for (let i = 0; i < 9; i++) put(B, at(-40 + i, { bleeding: 'menses', volume: 'normal' }));
put(B, at(-5, { bleeding: 'unscheduled' }));
const b = analyse(B, { ...DEFAULT_SETTINGS, on_gonadal_steroids: true }, T);
assert.equal(b.summary.duration.prolonged, 1);
assert.equal(b.summary.unscheduled, 'present');
assert.equal(b.summary.currentInfrequent, true); // 40 days since onset, no new menses
console.log('All FIGO System 1 checks passed.');
