// Storage in the member's own Google Drive.
//
//   My Drive / Sakhi Samachar /            ← visible folder, created by the app
//               Sakhi Samachar diary.json  ← the diary the app reads and writes
//               Sakhi Samachar diary.csv   ← the same entries as a table (open in Sheets)
//
// The app finds its files by a private tag (appProperties), so they keep working if the
// member moves or renames them. Access uses the drive.file permission: the app can only
// see files it created, never the rest of her Drive.
import { DayLog, DEFAULT_SETTINGS, Logs, Settings } from './types';

export const FOLDER_NAME = 'Sakhi Samachar';
export const DIARY_NAME = 'Sakhi Samachar diary.json';
export const CSV_NAME = 'Sakhi Samachar diary.csv';
const FOLDER_NOTE = 'Created by the Sakhi Samachar app. Your menstrual health diary is saved here. Please do not delete these files: the app reads and updates them. You can download them at any time.';

/** The diary file. Deleted days are kept as dates with a time (tombstones) so other phones remove them too. */
export interface DiaryDoc {
  app: 'sakhi-samachar';
  v: 1;
  settings: Settings;
  settings_updated_at: string;
  logs: Logs;
  deleted: Record<string, string>;
}

export const emptyDoc = (): DiaryDoc => ({ app: 'sakhi-samachar', v: 1, settings: { ...DEFAULT_SETTINGS }, settings_updated_at: '1970-01-01T00:00:00.000Z', logs: {}, deleted: {} });

export function parseDoc(text: string): DiaryDoc {
  const d = JSON.parse(text) as Partial<DiaryDoc>;
  if (d.app !== 'sakhi-samachar') throw new Error('This file is not a Sakhi Samachar diary.');
  return {
    ...emptyDoc(),
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
    settings_updated_at: d.settings_updated_at ?? '1970-01-01T00:00:00.000Z',
    logs: d.logs ?? {},
    deleted: d.deleted ?? {},
  };
}

/** Day by day, the most recent change wins (an edit or a deletion). Settings: most recent wins. */
export function mergeDocs(a: DiaryDoc, b: DiaryDoc): DiaryDoc {
  const out: DiaryDoc = { ...emptyDoc(), logs: {}, deleted: {} };
  const dates = new Set([...Object.keys(a.logs), ...Object.keys(b.logs), ...Object.keys(a.deleted), ...Object.keys(b.deleted)]);
  for (const d of dates) {
    const options: { t: string; log: DayLog | null }[] = [];
    if (a.logs[d]) options.push({ t: a.logs[d].updated_at, log: a.logs[d] });
    if (b.logs[d]) options.push({ t: b.logs[d].updated_at, log: b.logs[d] });
    if (a.deleted[d]) options.push({ t: a.deleted[d], log: null });
    if (b.deleted[d]) options.push({ t: b.deleted[d], log: null });
    // newest first; on an exact tie an entry beats a deletion
    options.sort((x, y) => (x.t === y.t ? (x.log ? -1 : 1) : x.t > y.t ? -1 : 1));
    const win = options[0];
    if (win.log) out.logs[d] = win.log;
    else out.deleted[d] = win.t;
  }
  const newer = a.settings_updated_at >= b.settings_updated_at ? a : b;
  out.settings = { ...newer.settings };
  out.settings_updated_at = newer.settings_updated_at;
  return out;
}

const stable = (d: DiaryDoc) => JSON.stringify({
  s: d.settings, st: d.settings_updated_at,
  l: Object.keys(d.logs).sort().map((k) => [k, d.logs[k]]),
  x: Object.keys(d.deleted).sort().map((k) => [k, d.deleted[k]]),
});
export const sameDoc = (a: DiaryDoc, b: DiaryDoc) => stable(a) === stable(b);
export const sameLogs = (a: DiaryDoc, b: DiaryDoc) =>
  JSON.stringify(Object.keys(a.logs).sort().map((k) => [k, a.logs[k]])) === JSON.stringify(Object.keys(b.logs).sort().map((k) => [k, b.logs[k]]));

export class DriveAuthError extends Error {}

type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown>; text(): Promise<string> }>;

export interface DriveIds { folderId?: string; fileId?: string; csvId?: string }

const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

/** Thin client for the four Drive calls the app needs. */
export class DriveStore {
  // fetch is wrapped so browsers don't reject it for being called on another object ("Illegal invocation")
  constructor(private token: () => Promise<string>, private ids: DriveIds = {}, private http: Fetch = ((url, init) => fetch(url, init)) as Fetch) {}

  get current(): DriveIds { return { ...this.ids }; }

  private async call(url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
    const t = await this.token();
    const res = await this.http(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}` } });
    if (res.status === 401) throw new DriveAuthError('Google sign-in expired');
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return res;
  }

  private async find(tag: string): Promise<string | null> {
    const q = encodeURIComponent(`appProperties has { key='sakhi' and value='${tag}' } and trashed=false`);
    const res = await this.call(`${API}?q=${q}&spaces=drive&fields=files(id,modifiedTime)&orderBy=modifiedTime desc&pageSize=10`);
    const files = ((await res?.json()) as { files?: { id: string }[] } | null)?.files ?? [];
    return files[0]?.id ?? null;
  }

  private async exists(id?: string): Promise<boolean> {
    if (!id) return false;
    const res = await this.call(`${API}/${id}?fields=id,trashed`);
    if (!res) return false;
    return !((await res.json()) as { trashed?: boolean }).trashed;
  }

  async folder(): Promise<string> {
    if (await this.exists(this.ids.folderId)) return this.ids.folderId!;
    let id = await this.find('folder');
    if (!id) {
      const res = await this.call(`${API}?fields=id`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder', description: FOLDER_NOTE, appProperties: { sakhi: 'folder' } }),
      });
      id = ((await res!.json()) as { id: string }).id;
    }
    this.ids.folderId = id;
    return id;
  }

  /** The diary stored in Drive, or null if there is none yet (or it was deleted). */
  async read(): Promise<DiaryDoc | null> {
    if (!(await this.exists(this.ids.fileId))) this.ids.fileId = (await this.find('diary')) ?? undefined;
    if (!this.ids.fileId) return null;
    const res = await this.call(`${API}/${this.ids.fileId}?alt=media`);
    if (!res) { this.ids.fileId = undefined; return null; }
    return parseDoc(await res.text());
  }

  private async put(kind: 'fileId' | 'csvId', tag: string, name: string, mime: string, content: string) {
    if (this.ids[kind]) {
      const res = await this.call(`${UPLOAD}/${this.ids[kind]}?uploadType=media&fields=id`, { method: 'PATCH', headers: { 'Content-Type': mime }, body: content });
      if (res) return;
      this.ids[kind] = undefined; // deleted meanwhile: create again
    }
    const parent = await this.folder();
    const boundary = `sakhi${Date.now().toString(36)}`;
    const meta = JSON.stringify({ name, parents: [parent], mimeType: mime, appProperties: { sakhi: tag } });
    const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n${content}\r\n--${boundary}--`;
    const res = await this.call(`${UPLOAD}?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
    this.ids[kind] = ((await res!.json()) as { id: string }).id;
  }

  async write(doc: DiaryDoc) { await this.put('fileId', 'diary', DIARY_NAME, 'application/json', JSON.stringify(doc)); }

  async writeCsv(csv: string) {
    if (!this.ids.csvId) this.ids.csvId = (await this.find('csv')) ?? undefined;
    await this.put('csvId', 'csv', CSV_NAME, 'text/csv', csv);
  }

  /** Permanently deletes the folder and everything in it. */
  async deleteAll() {
    const folder = this.ids.folderId ?? (await this.find('folder'));
    if (folder) await this.call(`${API}/${folder}`, { method: 'DELETE' });
    for (const tag of ['diary', 'csv']) {
      const id = await this.find(tag); // files moved out of the folder
      if (id) await this.call(`${API}/${id}`, { method: 'DELETE' });
    }
    this.ids = {};
  }
}

export const folderUrl = (id?: string) => (id ? `https://drive.google.com/drive/folders/${id}` : 'https://drive.google.com/drive/my-drive');
