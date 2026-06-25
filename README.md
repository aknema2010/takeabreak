# TakeABreak

A cross-platform desktop app that enforces periodic screen breaks. A break can
be skipped voluntarily — but only after watching a non-skippable 5-second ad.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design.

## Stack

- **Electron** + **TypeScript**, no renderer bundler (plain HTML/CSS + compiled
  TS, wired through a single audited preload bridge).
- **electron-store** for persisted settings.
- **electron-builder** for installers.

## Develop

```bash
npm install
npm start          # build + launch
```

`npm run build` compiles TypeScript to `dist/` and copies HTML/CSS + `assets/`.

## How it works

| Piece | File |
| --- | --- |
| Work/break scheduler (idle-aware, sleep-aware) | `src/main/scheduler.ts` |
| Fullscreen overlay, one per monitor | `src/main/lock-window.ts` |
| Authoritative 5s ad timer (skip gate) | `src/main/ad-timer.ts` |
| App lifecycle, IPC, panic hotkey, tray | `src/main/main.ts`, `src/main/tray.ts` |
| Settings persistence | `src/main/settings-store.ts` |
| Audited renderer bridge | `src/preload/preload.ts` |
| Break + ad UI | `src/renderer/break/` |
| Settings UI | `src/renderer/settings/` |

### The skip ↔ ad gate

The 5-second countdown runs in the **main process**, not the renderer, so a user
can't fast-forward it via devtools. The renderer only *plays* the clip; main
decides when the skip is granted. The break overlay is an app-level interruption
(the OS keeps running underneath) and a configurable **panic hotkey** always
dismisses it — the user is never trapped.

## Status

Scaffolding / milestone 1–6 wired (skeleton, tray, single-instance, scheduler,
overlay, ad-gated skip, settings). Not yet done: a real bundled clip asset, code
signing/notarization, and auto-update (see `ARCHITECTURE.md` build plan).
