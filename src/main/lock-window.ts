import { BrowserWindow, screen } from 'electron';
import path from 'path';
import { BreakStartPayload, IPC } from '../shared/types';

// Manages the fullscreen overlay windows — one per monitor — that constitute a
// break. This is an APP-LEVEL interruption: the OS keeps running underneath and
// a panic hotkey can always dismiss it (see main.ts). It is deliberately NOT a
// real OS lock.

export class LockWindows {
  private windows: BrowserWindow[] = [];
  private breakTick: NodeJS.Timeout | null = null;

  get isActive(): boolean {
    return this.windows.length > 0;
  }

  /** Opens an overlay on every display and starts the break countdown. */
  open(payload: BreakStartPayload): void {
    if (this.isActive) return;

    for (const display of screen.getAllDisplays()) {
      const win = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        frame: false,
        fullscreen: true,
        kiosk: true,
        skipTaskbar: true,
        alwaysOnTop: true,
        webPreferences: {
          preload: path.join(__dirname, '..', 'preload', 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      });

      win.setAlwaysOnTop(true, 'screen-saver');
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      // Keep focus during the break so work windows can't surface underneath.
      win.on('blur', () => {
        if (this.isActive && !win.isDestroyed()) win.focus();
      });

      win.loadFile(
        path.join(__dirname, '..', 'renderer', 'break', 'index.html'),
      );
      win.webContents.once('did-finish-load', () => {
        win.webContents.send(IPC.BreakStart, payload);
      });

      this.windows.push(win);
    }

    this.startBreakCountdown(payload.breakDurationSec);
  }

  /** Broadcasts a message to every overlay window. */
  broadcast(channel: string, ...args: unknown[]): void {
    for (const win of this.windows) {
      if (!win.isDestroyed()) win.webContents.send(channel, ...args);
    }
  }

  /** Tears down all overlays (break finished, skipped, or panic-exit). */
  close(): void {
    if (this.breakTick) {
      clearInterval(this.breakTick);
      this.breakTick = null;
    }
    for (const win of this.windows) {
      if (!win.isDestroyed()) win.destroy();
    }
    this.windows = [];
  }

  private startBreakCountdown(durationSec: number): void {
    let remaining = durationSec;
    this.broadcast(IPC.BreakTick, remaining);
    this.breakTick = setInterval(() => {
      remaining -= 1;
      this.broadcast(IPC.BreakTick, Math.max(0, remaining));
      if (remaining <= 0) this.close();
    }, 1000);
  }
}
