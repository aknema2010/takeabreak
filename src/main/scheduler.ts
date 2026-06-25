import { powerMonitor } from 'electron';
import { getSettings } from './settings-store';

// Drives the work/break cycle. Fires a callback when it's time for a break,
// but skips the nag if the user has already been idle for a while (they're
// effectively on a break) and pauses across system sleep.

const IDLE_GRACE_SEC = 60;

export class Scheduler {
  private handle: NodeJS.Timeout | null = null;
  private onBreakDue: () => void;

  constructor(onBreakDue: () => void) {
    this.onBreakDue = onBreakDue;
    powerMonitor.on('suspend', () => this.stop());
    powerMonitor.on('resume', () => this.start());
    // A real OS lock means the user already stepped away — reset the cycle.
    powerMonitor.on('lock-screen', () => this.restart());
  }

  start(): void {
    this.stop();
    const intervalMs = getSettings().workIntervalMin * 60 * 1000;
    this.handle = setTimeout(() => this.fire(), intervalMs);
  }

  stop(): void {
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = null;
    }
  }

  restart(): void {
    this.start();
  }

  private fire(): void {
    // If the user is already idle, postpone rather than interrupt a break
    // they're effectively already taking.
    if (powerMonitor.getSystemIdleTime() >= IDLE_GRACE_SEC) {
      this.start();
      return;
    }
    this.onBreakDue();
  }
}
