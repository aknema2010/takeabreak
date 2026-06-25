import { contextBridge, ipcRenderer } from 'electron';
import { BreakStartPayload, IPC, Settings } from '../shared/types';

// The single, audited bridge between the sandboxed renderer and the main
// process. No Node APIs are exposed to renderer code beyond this surface.

const api = {
  // --- break window ---
  onBreakStart: (cb: (p: BreakStartPayload) => void) =>
    ipcRenderer.on(IPC.BreakStart, (_e, p) => cb(p)),
  onBreakTick: (cb: (remaining: number) => void) =>
    ipcRenderer.on(IPC.BreakTick, (_e, r) => cb(r)),
  requestSkip: () => ipcRenderer.send(IPC.BreakSkipRequest),
  onAdShow: (cb: (p: { adDurationSec: number }) => void) =>
    ipcRenderer.on(IPC.AdShow, (_e, p) => cb(p)),
  adStarted: () => ipcRenderer.send(IPC.AdStarted),
  onAdTick: (cb: (remaining: number) => void) =>
    ipcRenderer.on(IPC.AdTick, (_e, r) => cb(r)),
  onAdComplete: (cb: () => void) =>
    ipcRenderer.on(IPC.AdComplete, () => cb()),

  // --- settings window ---
  getSettings: (): Promise<Settings> => ipcRenderer.invoke(IPC.SettingsGet),
  saveSettings: (partial: Partial<Settings>): Promise<Settings> =>
    ipcRenderer.invoke(IPC.SettingsSave, partial),
};

contextBridge.exposeInMainWorld('api', api);

export type TakeABreakApi = typeof api;
