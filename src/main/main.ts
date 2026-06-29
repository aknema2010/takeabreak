import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
} from 'electron';
import path from 'path';
import { AdTimer } from './ad-timer';
import { LockWindows } from './lock-window';
import { Scheduler } from './scheduler';
import { createTray } from './tray';
import { getSettings, saveSettings } from './settings-store';
import { initAutoUpdater } from './updater';
import { BreakStartPayload, IPC, Settings } from '../shared/types';

let tray: Tray | null = null;
let settingsWindow: BrowserWindow | null = null;
const lock = new LockWindows();
const adTimer = new AdTimer();
let scheduler: Scheduler;

// Single-instance: a second launch must not run a parallel break loop.
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function startBreak(): void {
  if (lock.isActive) return;
  const s = getSettings();
  const payload: BreakStartPayload = {
    breakDurationSec: s.breakDurationSec,
    adRequired: s.adRequired,
    strictMode: s.strictMode,
    adDurationSec: s.adDurationSec,
  };
  lock.open(payload);
}

function grantSkip(): void {
  adTimer.cancel();
  lock.close();
  scheduler.restart();
}

function openSettings(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 460,
    height: 560,
    resizable: false,
    title: 'TakeABreak — Settings',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  settingsWindow.loadFile(
    path.join(__dirname, '..', 'renderer', 'settings', 'index.html'),
  );
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function registerPanicHotkey(): void {
  globalShortcut.unregisterAll();
  const { panicHotkey } = getSettings();
  // The escape hatch: the user is never trapped by a break.
  globalShortcut.register(panicHotkey, () => {
    if (lock.isActive) grantSkip();
  });
}

function wireIpc(): void {
  // Break renderer asks to skip. With ads required we start the authoritative
  // countdown; without, we grant immediately. Strict mode forbids skipping.
  ipcMain.on(IPC.BreakSkipRequest, (event) => {
    const s = getSettings();
    if (s.strictMode) return;
    if (!s.adRequired) {
      grantSkip();
      return;
    }
    // Tell the renderer to start playing the bundled clip.
    event.sender.send(IPC.AdShow, { adDurationSec: s.adDurationSec });
  });

  // Renderer confirms the clip is actually playing — only now does the
  // main-process timer (the source of truth) begin.
  ipcMain.on(IPC.AdStarted, () => {
    const { adDurationSec } = getSettings();
    adTimer.start(
      adDurationSec,
      (remaining) => lock.broadcast(IPC.AdTick, remaining),
      () => {
        lock.broadcast(IPC.AdComplete);
        grantSkip();
      },
    );
  });

  ipcMain.handle(IPC.SettingsGet, () => getSettings());
  ipcMain.handle(IPC.SettingsSave, (_e, partial: Partial<Settings>) => {
    const next = saveSettings(partial);
    app.setLoginItemSettings({ openAtLogin: next.launchAtLogin });
    registerPanicHotkey();
    scheduler.restart();
    return next;
  });
}

app.whenReady().then(() => {
  scheduler = new Scheduler(startBreak);
  wireIpc();
  registerPanicHotkey();

  tray = createTray({
    openSettings,
    breakNow: startBreak,
    quit: () => app.quit(),
  });

  app.setLoginItemSettings({ openAtLogin: getSettings().launchAtLogin });
  scheduler.start();
  initAutoUpdater();
});

// Tray app: don't quit when all windows close.
app.on('window-all-closed', (e: Electron.Event) => e.preventDefault());

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  adTimer.cancel();
  scheduler?.stop();
});
