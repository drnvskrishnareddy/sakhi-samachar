// Checks the Google Drive storage against an in-memory fake Drive. Run: npm run test:drive
import assert from 'node:assert/strict';
import { DiaryDoc, DriveAuthError, DriveStore, emptyDoc, mergeDocs, sameDoc } from '../src/lib/drive';
import { emptyLog } from '../src/lib/types';

// ---------- a tiny fake of the Drive v3 endpoints the app uses ----------
interface FakeFile { id: string; name: string; mimeType: string; parents?: string[]; appProperties?: Record<string, string>; trashed: boolean; content: string; description?: string }
function fakeDrive() {
  const files = new Map<string, FakeFile>();
  let n = 0, expired = false;
  const calls: string[] = [];
  const resp = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
  const http = async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) => {
    const method = init.method ?? 'GET';
    calls.push(`${method} ${url.replace('https://www.googleapis.com', '').split('?')[0]}`);
    if (expired) return resp(401, 'expired');
    assert.match(init.headers?.Authorization ?? '', /^Bearer tok/);
    const u = new URL(url);
    const idMatch = u.pathname.match(/\/files\/([^/]+)$/);
    if (u.pathname === '/drive/v3/files' && method === 'GET') {
      const q = u.searchParams.get('q') ?? '';
      const tag = q.match(/value='(\w+)'/)?.[1];
      const out = [...files.values()].filter((f) => f.appProperties?.sakhi === tag && !f.trashed);
      return resp(200, { files: out.map((f) => ({ id: f.id })) });
    }
    if (u.pathname === '/drive/v3/files' && method === 'POST') {
      const meta = JSON.parse(init.body!);
      const f: FakeFile = { id: `f${++n}`, ...meta, trashed: false, content: '' };
      files.set(f.id, f);
      return resp(200, { id: f.id });
    }
    if (u.pathname === '/upload/drive/v3/files' && method === 'POST') {
      const parts = init.body!.split(/\r\n--sakhi\w+(?:--)?/);
      const meta = JSON.parse(parts[0].split('\r\n\r\n')[1]);
      const content = parts[1].split('\r\n\r\n').slice(1).join('\r\n\r\n');
      const f: FakeFile = { id: `f${++n}`, ...meta, trashed: false, content };
      files.set(f.id, f);
      return resp(200, { id: f.id });
    }
    if (idMatch) {
      const f = files.get(idMatch[1]);
      if (!f) return resp(404, 'not found');
      if (method === 'DELETE') {
        files.delete(f.id);
        for (const c of [...files.values()]) if (c.parents?.includes(f.id)) files.delete(c.id);
        return resp(204, '');
      }
      if (method === 'PATCH') { f.content = init.body!; return resp(200, { id: f.id }); }
      if (u.searchParams.get('alt') === 'media') return resp(200, f.content);
      return resp(200, { id: f.id, trashed: f.trashed });
    }
    return resp(400, `unexpected ${method} ${url}`);
  };
  return { files, http, calls, expire: () => { expired = true; } };
}
const token = async () => 'tok-123';
const day = (d: string, patch: object, t: string) => ({ ...emptyLog(d), ...patch, updated_at: t });

(async () => {
  // 1. First sync on a new account creates the visible folder, the diary and the CSV
  const drive = fakeDrive();
  const phoneA = new DriveStore(token, {}, drive.http);
  assert.equal(await phoneA.read(), null, 'no diary yet');
  const a: DiaryDoc = { ...emptyDoc(), logs: { '2026-10-02': day('2026-10-02', { bleeding: 'menses', volume: 'heavy', hmb_qol: true, pads: 5 }, '2026-10-02T08:00:00Z') } };
  await phoneA.write(a);
  await phoneA.writeCsv('date,bleeding\n2026-10-02,Menses');
  const all = [...drive.files.values()];
  const folder = all.find((f) => f.mimeType === 'application/vnd.google-apps.folder')!;
  assert.equal(folder.name, 'Sakhi Samachar');
  assert.ok(folder.description?.includes('Please do not delete'));
  assert.deepEqual(all.filter((f) => f.parents?.includes(folder.id)).map((f) => f.name).sort(), ['Sakhi Samachar diary.csv', 'Sakhi Samachar diary.json']);
  console.log('PASS creates My Drive / Sakhi Samachar / diary.json + diary.csv');

  // 2. A second phone (no saved ids) finds the same diary by its tag
  const phoneB = new DriveStore(token, {}, drive.http);
  const seen = await phoneB.read();
  assert.ok(seen && sameDoc(seen, a));
  console.log('PASS a second phone finds the same diary');

  // 3. Phone B edits another day; phone A deletes its day later; merge keeps both decisions
  const b = { ...seen!, logs: { ...seen!.logs, '2026-10-12': day('2026-10-12', { bleeding: 'imb' }, '2026-10-13T09:00:00Z') } };
  await phoneB.write(b);
  const aAfterDelete: DiaryDoc = { ...a, logs: {}, deleted: { '2026-10-02': '2026-10-14T10:00:00Z' } };
  const merged = mergeDocs(aAfterDelete, (await phoneA.read())!);
  assert.equal(merged.logs['2026-10-02'], undefined, 'later deletion wins');
  assert.equal(merged.logs['2026-10-12']?.bleeding, 'imb', 'other phone\'s new day kept');
  assert.equal(merged.deleted['2026-10-02'], '2026-10-14T10:00:00Z');
  console.log('PASS merge: newest change per day wins, deletions travel to other phones');

  // 4. An older edit does not overwrite a newer one
  const older = { ...emptyDoc(), logs: { '2026-10-12': day('2026-10-12', { bleeding: 'menses' }, '2026-10-12T00:00:00Z') } };
  assert.equal(mergeDocs(older, b).logs['2026-10-12'].bleeding, 'imb');
  console.log('PASS merge: an older edit never overwrites a newer one');

  // 5. Settings: newer wins
  const s1 = { ...emptyDoc(), settings: { ...emptyDoc().settings, products: ['pads' as const] }, settings_updated_at: '2026-10-01T00:00:00Z' };
  const s2 = { ...emptyDoc(), settings: { ...emptyDoc().settings, products: ['cups' as const] }, settings_updated_at: '2026-10-05T00:00:00Z' };
  assert.deepEqual(mergeDocs(s1, s2).settings.products, ['cups']);
  console.log('PASS merge: newer settings win');

  // 6. If the member deletes the diary file in Drive, the next save recreates it
  const fileId = phoneA.current.fileId!;
  drive.files.get(fileId)!.trashed = true;
  assert.equal(await phoneA.read(), null, 'trashed diary is ignored');
  await phoneA.write(merged);
  const recreated = [...drive.files.values()].filter((f) => f.appProperties?.sakhi === 'diary' && !f.trashed);
  assert.equal(recreated.length, 1);
  assert.ok(sameDoc(JSON.parse(recreated[0].content), merged));
  console.log('PASS a deleted diary file is recreated from the phone copy');

  // 7. Delete my data removes the folder and both files
  await phoneA.deleteAll();
  assert.equal([...drive.files.values()].filter((f) => !f.trashed).length, 0);
  console.log('PASS "Delete my diary" removes the folder and its files');

  // 8. An expired sign-in is reported so the app can ask to reconnect
  const d2 = fakeDrive();
  d2.expire();
  await assert.rejects(new DriveStore(token, {}, d2.http).read(), DriveAuthError);
  console.log('PASS expired Google sign-in is reported as "reconnect"');

  console.log('\nAll Google Drive checks passed.');
})().catch((e) => { console.error(e); process.exit(1); });
