# TakeABreak — Architecture & Scaffolding

A downloadable, cross-platform desktop app that periodically interrupts the user
with an enforced break. The user can voluntarily skip a break, but only after
watching a non-skippable 5-second advertisement.

This document captures the design and the scaffolding required to build it. No
application code exists yet — this is the plan.

## Design principles

This is a **wellness / productivity** app in the same genre as Stretchly, Time
Out, Workrave, and BreakTimer. To stay firmly on that side of the line, the app
must:

- Be **user-installed and user-configured** on the user's own machine.
- **Strongly interrupt, not hijack.** It throws a fullscreen overlay; the OS
  keeps running underneath. It never takes over the real OS lock screen, never
  encrypts anything, never persists in ways the user didn't ask for.
- Always ship a **panic / emergency-exit hotkey** so the user is never trapped.
- Keep all settings and state **local and inspectable**.

These properties are what distinguish a break reminder from a screenlocker, and
they are non-negotiable.

## Framework choice: Electron

| Need | Why Electron fits |
| --- | --- |
| Downloadable installer on Win/macOS/Linux | `electron-builder` produces NSIS / DMG / AppImage |
| Fullscreen always-on-top overlay | `BrowserWindow` with kiosk + `alwaysOnTop` modes |
| Render a video ad | Renderer is a full web view; `<video>` is trivial |
| Auto-update | `electron-updater` against GitHub Releases / S3 |

Alternatives considered: **Tauri** (smaller/safer binary, but more friction for
the OS window tricks) and **native** (best lock control, ~3× the effort).
Electron is the pragmatic choice for v1.

## The "lock": fullscreen overlay (chosen model)

On a break trigger the app spawns **one frameless overlay window per monitor**
(via `screen.getAllDisplays()` — otherwise the user just drags work to a second
display). Each window is:

- `fullscreen: true`, `frame: false`, `kiosk: true`
- `alwaysOnTop` at the `'screen-saver'` level
- `setVisibleOnAllWorkspaces(true)`
- re-focused on `blur`, and its close intercepted, for the break's duration

The OS continues to run underneath; this is an **app-level** interruption, not an
OS lock. A deliberately-shipped global panic hotkey always dismisses it.

> Rejected: triggering the real OS lock (`LockWorkStation`, `loginwindow`). It
> forces a password re-entry and the ad-skip flow can't run over the OS lock
> screen, which breaks the core mechanic.

## The skip ↔ ad flow

The differentiator. A small state machine, with the **main process as the source
of truth** for the 5-second timer so the renderer can't fast-forward it.

```
                 user clicks "Skip break"
  BREAK_ACTIVE ───────────────────────────▶ AD_PLAYING
       ▲                                         │  main process runs an
       │                                         │  authoritative 5s timer;
       │                                         │  renderer plays the clip
       │           main emits `ad-complete`      ▼
       └────────────────────────────────── AD_COMPLETE ──▶ break dismissed
```

Rules:

1. The renderer signals `ad-started`; the **main process** starts the 5s timer.
   The renderer can only unlock when main emits `ad-complete`. This prevents a
   user from opening devtools and calling the unlock callback directly.
2. The bundled clip's `ended` event is a hint, but elapsed time in main is
   authoritative.
3. **Ad source for v1: a local clip bundled with the app** (`assets/ads/`). No
   network or ad-network account required. The renderer-is-web-content design
   means swapping in a VAST tag or ad network later is a localized change to the
   ad player component.

## Project layout

```
takeabreak/
├─ package.json
├─ electron-builder.yml          # packaging / installer config
├─ tsconfig.json
├─ src/
│  ├─ main/                      # Node side (privileged)
│  │  ├─ main.ts                 # app lifecycle, single-instance lock
│  │  ├─ scheduler.ts            # break timer / interval engine
│  │  ├─ lock-window.ts          # creates fullscreen overlay(s) per display
│  │  ├─ ad-timer.ts             # authoritative 5s ad countdown
│  │  ├─ tray.ts                 # system-tray icon + menu
│  │  ├─ settings-store.ts       # persisted config (electron-store)
│  │  └─ ipc.ts                  # typed main<->renderer message contract
│  ├─ renderer/
│  │  ├─ break/                  # lock screen UI (countdown, "take a break")
│  │  ├─ ad/                     # the 5-second ad player
│  │  └─ settings/               # config window
│  └─ shared/
│     └─ types.ts                # shared IPC payload types
├─ assets/
│  ├─ icons/
│  └─ ads/                       # bundled local ad clip(s)
└─ build/                        # signing certs refs, entitlements
```

## Components

- **scheduler.ts** — fires every N minutes (user-set). Uses `powerMonitor`
  (`getSystemIdleTime`, `suspend`/`resume`/`lock-screen`) so it doesn't nag a
  user who already stepped away, and pauses across sleep.
- **lock-window.ts** — enumerates displays and spawns one overlay each; holds
  the break for the configured duration with a visible countdown.
- **ad-timer.ts** — the authoritative 5-second timer that gates the skip.
- **settings-store.ts** — `electron-store` JSON in `userData`. Fields:
  `workInterval`, `breakDuration`, `strictMode`, `adRequired`, `panicHotkey`,
  `launchAtLogin`.
- **tray.ts** — system-tray presence (so it isn't a window you just alt-F4),
  plus `app.setLoginItemSettings({ openAtLogin: true })` and
  `app.requestSingleInstanceLock()`.

## Packaging & distribution

- **electron-builder** → NSIS (Win), DMG (macOS), AppImage/deb (Linux).
- **Code signing is non-negotiable** for an app that grabs the whole screen.
  Unsigned, Windows SmartScreen and macOS Gatekeeper will block/scare users.
  Requires an Authenticode cert (Win) and Apple Developer ID + **notarization**
  (macOS). Plan for this early.
- **Auto-update** via `electron-updater` against GitHub Releases or S3.

## Build milestones

1. Electron skeleton + tray + single-instance lock — runs, lives in tray.
2. Scheduler fires on interval (console log).
3. Fullscreen overlay on all displays with countdown; auto-dismiss after
   duration. **Ship the panic hotkey here.**
4. Settings window wired to `electron-store`.
5. Skip button → ad state machine → main-process-authoritative 5s timer →
   unlock.
6. Wire in the bundled local clip.
7. `powerMonitor` idle / suspend handling.
8. Sign, notarize, package, auto-update.

## Open questions for later

- Per-day skip cap, or unlimited ad-gated skips?
- Analytics/telemetry (opt-in only) for break adherence?
- Multiple bundled clips with rotation, vs. a single clip?
- Eventual real ad network integration (VAST tag in the ad renderer).
