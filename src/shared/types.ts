// Shared types used across the main and renderer processes.

export interface Settings {
  /** Minutes of work between breaks. */
  workIntervalMin: number;
  /** Seconds each enforced break lasts. */
  breakDurationSec: number;
  /** If true, the break cannot be skipped at all. */
  strictMode: boolean;
  /** If true, skipping a break requires watching the ad first. */
  adRequired: boolean;
  /** Seconds the ad must play before a skip is granted. */
  adDurationSec: number;
  /** Accelerator string for the emergency panic hotkey. */
  panicHotkey: string;
  /** Launch the app on login. */
  launchAtLogin: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  workIntervalMin: 25,
  breakDurationSec: 60,
  strictMode: false,
  adRequired: true,
  adDurationSec: 5,
  panicHotkey: 'CommandOrControl+Alt+Shift+B',
  launchAtLogin: false,
};

/** Payload sent to a break window when a break begins. */
export interface BreakStartPayload {
  breakDurationSec: number;
  adRequired: boolean;
  strictMode: boolean;
  adDurationSec: number;
}

/** IPC channel names — the single source of truth for the main<->renderer contract. */
export const IPC = {
  // main -> break renderer
  BreakStart: 'break:start',
  BreakTick: 'break:tick',
  AdShow: 'ad:show',
  AdTick: 'ad:tick',
  AdComplete: 'ad:complete',
  // break renderer -> main
  BreakSkipRequest: 'break:skip-request',
  AdStarted: 'ad:started',
  // settings renderer <-> main
  SettingsGet: 'settings:get',
  SettingsSave: 'settings:save',
} as const;
