import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { analyse, Analysis, toCSV } from './cycle';
import { DEMO_EMAIL, demoLogs, demoSettings, IS_DEMO } from './demo';
import { DiaryDoc, DriveAuthError, DriveIds, DriveStore, emptyDoc, folderUrl as driveFolderUrl, mergeDocs, sameDoc, sameLogs } from './drive';
import { googleAuth } from './google';
import { GoogleAccount, googleMessage } from './google.types';
import { DayLog, emptyLog, isEmptyLog, Logs, Settings } from './types';

/*
 * Offline-first storage in the member's own Google Drive.
 * Every change is saved on the phone at once and marked "waiting". Shortly after, and
 * whenever the app comes back to the foreground, the phone reads the Drive copy, merges
 * it day by day (most recent change wins) and writes the result back.
 * The developer never receives any of it.
 */

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error' | 'reconnect';
interface Cache { doc: DiaryDoc; dirty: boolean; ids: DriveIds; consentAt?: string }

interface DataCtx {
  ready: boolean;
  account: GoogleAccount | null;
  email: string | null;
  logs: Logs;
  settings: Settings;
  analysis: Analysis;
  sync: SyncState;
  syncError: string;
  pendingCount: number;
  folderUrl: string;
  signIn: () => Promise<string | null>;
  reconnect: () => Promise<void>;
  saveLog: (date: string, patch: Partial<DayLog> | null) => void;
  saveSettings: (patch: Partial<Settings>) => void;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
}

const Ctx = createContext<DataCtx | null>(null);
const cacheKey = (email: string) => `sakhi.cache.v2.${email.toLowerCase()}`;
const now = () => new Date().toISOString();
const demoDoc = (): DiaryDoc => ({ ...emptyDoc(), logs: demoLogs(), settings: demoSettings(), settings_updated_at: now() });

export function DataProvider({ children }: { children: ReactNode }) {
  const [authReady, setAuthReady] = useState(IS_DEMO);
  const [loaded, setLoaded] = useState(false);
  const [account, setAccount] = useState<GoogleAccount | null>(IS_DEMO ? { email: DEMO_EMAIL, name: 'Sample' } : null);
  const [doc, setDoc] = useState<DiaryDoc>(emptyDoc);
  const [sync, setSync] = useState<SyncState>('idle');
  const [syncError, setSyncError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [folderId, setFolderId] = useState<string | undefined>(undefined);

  const ref = useRef<{ email: string | null; cache: Cache; rev: number; syncing: boolean; timer?: ReturnType<typeof setTimeout>; again?: () => void }>({
    email: null, cache: { doc: emptyDoc(), dirty: false, ids: {} }, rev: 0, syncing: false,
  });

  const publish = useCallback(() => {
    const c = ref.current.cache;
    setDoc({ ...c.doc });
    setDirty(c.dirty);
    setFolderId(c.ids.folderId);
  }, []);

  const persist = useCallback(() => {
    const r = ref.current;
    if (!r.email) return;
    AsyncStorage.setItem(cacheKey(r.email), JSON.stringify(r.cache)).catch(() => {});
  }, []);

  // ---- sync with Google Drive ----
  const doSync = useCallback(async (interactive = false): Promise<void> => {
    const r = ref.current;
    if (IS_DEMO || !r.email || r.syncing) return;
    r.syncing = true; setSync('syncing'); setSyncError('');
    const startRev = r.rev, email = r.email;
    try {
      const token = await googleAuth.getToken(interactive);
      if (!token) { setSync('reconnect'); return; }
      const store = new DriveStore(async () => token, r.cache.ids);
      const remote = await store.read();
      const local = r.cache.doc;
      let merged = remote ? mergeDocs(local, remote) : local;
      if (!merged.settings.consent_at && r.cache.consentAt) {
        merged = { ...merged, settings: { ...merged.settings, consent_at: r.cache.consentAt }, settings_updated_at: now() };
      }
      if (!remote || !sameDoc(merged, remote)) {
        await store.write(merged);
        if (!remote || !sameLogs(merged, remote)) await store.writeCsv(toCSV(merged.logs));
      }
      if (r.email !== email) return; // signed out meanwhile
      if (r.rev === startRev) { r.cache.doc = merged; r.cache.dirty = false; }
      else r.cache.doc = mergeDocs(r.cache.doc, merged); // edits made during the sync stay waiting
      r.cache.ids = store.current;
      persist(); publish();
      setSync('idle');
    } catch (e) {
      if (e instanceof DriveAuthError) { setSync('reconnect'); return; }
      const m = googleMessage(e);
      setSyncError(m);
      setSync(/connection|network|fetch|failed/i.test(m) ? 'offline' : 'error');
    } finally {
      r.syncing = false;
      // edits made while saving: save again shortly
      if (r.cache.dirty && r.rev !== startRev) {
        if (r.timer) clearTimeout(r.timer);
        r.timer = setTimeout(() => { ref.current.again?.(); }, 1500);
      }
    }
  }, [persist, publish]);

  useEffect(() => { ref.current.again = () => { doSync(false); }; }, [doSync]);

  const scheduleSync = useCallback((ms = 1500) => {
    const r = ref.current;
    if (r.timer) clearTimeout(r.timer);
    r.timer = setTimeout(() => { doSync(false); }, ms);
  }, [doSync]);

  // ---- who is signed in on this device ----
  useEffect(() => {
    if (IS_DEMO) return;
    let live = true;
    googleAuth.restore().then((a) => { if (live) { setAccount(a); setAuthReady(true); } }, () => { if (live) setAuthReady(true); });
    return () => { live = false; };
  }, []);

  // ---- load this account's copy on the phone, then sync ----
  const email = account?.email ?? null;
  useEffect(() => {
    const r = ref.current;
    r.email = email;
    r.cache = { doc: emptyDoc(), dirty: false, ids: {} };
    let live = true;
    (async () => {
      publish();
      if (!email) { setLoaded(true); return; }
      setLoaded(false);
      try {
        const raw = await AsyncStorage.getItem(cacheKey(email));
        if (!live) return;
        if (raw) {
          const c = JSON.parse(raw) as Cache;
          r.cache = { doc: { ...emptyDoc(), ...c.doc }, dirty: !!c.dirty, ids: c.ids ?? {}, consentAt: c.consentAt };
        } else if (IS_DEMO) {
          r.cache = { doc: demoDoc(), dirty: false, ids: {} };
          persist();
        }
      } catch { /* damaged copy on the phone: Drive has the diary */ }
      if (!live) return;
      publish(); setLoaded(true);
      doSync(false);
    })();
    return () => { live = false; };
  }, [email, publish, persist, doSync]);

  // ---- back in the foreground: sync ----
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') doSync(false); });
    return () => sub.remove();
  }, [doSync]);

  const signIn = useCallback(async () => {
    try {
      const a = await googleAuth.signIn();
      // remember when she agreed, for the consent record inside her own diary file
      const key = cacheKey(a.email);
      const raw = await AsyncStorage.getItem(key).catch(() => null);
      const c: Cache = raw ? JSON.parse(raw) : { doc: emptyDoc(), dirty: false, ids: {} };
      c.consentAt = c.consentAt ?? now();
      await AsyncStorage.setItem(key, JSON.stringify(c)).catch(() => {});
      setAccount(a);
      return null;
    } catch (e) {
      return googleMessage(e);
    }
  }, []);

  const reconnect = useCallback(async () => {
    try {
      const t = await googleAuth.getToken(true);
      if (t) await doSync(false);
    } catch (e) {
      const m = googleMessage(e);
      if (m) { setSyncError(m); setSync('error'); }
    }
  }, [doSync]);

  const saveLog = useCallback((date: string, patch: Partial<DayLog> | null) => {
    const r = ref.current;
    if (!r.email) return;
    const d = r.cache.doc;
    const before = d.logs[date];
    const next: DayLog = patch === null ? emptyLog(date) : { ...(before ?? emptyLog(date)), ...patch, log_date: date, updated_at: now() };
    // keep the FIGO structure consistent: volume belongs to menses, HMB to heavy volume
    if (next.bleeding !== 'menses') next.volume = null;
    if (next.volume !== 'heavy') next.hmb_qol = null;
    if (!next.bleeding) { next.pads = 0; next.tampons = 0; next.cups = 0; next.cloths = 0; next.underwear = 0; next.clots = 0; }
    const logs = { ...d.logs }, deleted = { ...d.deleted };
    if (isEmptyLog(next)) { delete logs[date]; if (before) deleted[date] = now(); }
    else { logs[date] = next; delete deleted[date]; }
    r.cache.doc = { ...d, logs, deleted };
    r.cache.dirty = !IS_DEMO;
    r.rev++;
    persist(); publish(); scheduleSync();
  }, [persist, publish, scheduleSync]);

  const saveSettings = useCallback((patch: Partial<Settings>) => {
    const r = ref.current;
    if (!r.email) return;
    r.cache.doc = { ...r.cache.doc, settings: { ...r.cache.doc.settings, ...patch }, settings_updated_at: now() };
    r.cache.dirty = !IS_DEMO;
    r.rev++;
    persist(); publish(); scheduleSync(600);
  }, [persist, publish, scheduleSync]);

  const syncNow = useCallback(async () => { await doSync(true); }, [doSync]);

  const resetDemo = useCallback(() => {
    ref.current.cache = { doc: demoDoc(), dirty: false, ids: {} };
    persist(); publish();
  }, [persist, publish]);

  const signOut = useCallback(async () => {
    if (IS_DEMO) { resetDemo(); return; }
    const r = ref.current;
    if (r.cache.dirty) await doSync(false).catch(() => {});
    const e = r.email;
    // nothing waiting: remove the phone copy (the diary stays in Google Drive)
    if (e && !r.cache.dirty) await AsyncStorage.removeItem(cacheKey(e)).catch(() => {});
    await googleAuth.signOut();
    setSync('idle');
    setAccount(null);
  }, [doSync, resetDemo]);

  const deleteAccount = useCallback(async () => {
    if (IS_DEMO) { resetDemo(); return null; }
    const r = ref.current;
    try {
      const token = await googleAuth.getToken(true);
      if (!token) return 'Reconnect to Google Drive first, then try again.';
      await new DriveStore(async () => token, r.cache.ids).deleteAll();
      await googleAuth.revoke();
    } catch (e) {
      return googleMessage(e) || 'Could not delete. Try again.';
    }
    if (r.email) await AsyncStorage.removeItem(cacheKey(r.email)).catch(() => {});
    r.cache = { doc: emptyDoc(), dirty: false, ids: {} };
    setSync('idle');
    setAccount(null);
    return null;
  }, [resetDemo]);

  const analysis = useMemo(() => analyse(doc.logs, doc.settings), [doc]);

  const value: DataCtx = {
    ready: authReady && loaded, account, email: account?.email ?? null,
    logs: doc.logs, settings: doc.settings, analysis, sync, syncError,
    pendingCount: dirty ? 1 : 0, folderUrl: driveFolderUrl(folderId),
    signIn, reconnect, saveLog, saveSettings, syncNow, signOut, deleteAccount,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useData must be used inside DataProvider');
  return c;
}
