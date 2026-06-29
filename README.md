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
| Background auto-update (GitHub Releases) | `src/main/updater.ts` |
| Audited renderer bridge | `src/preload/preload.ts` |
| Break + ad UI | `src/renderer/break/` |
| Settings UI | `src/renderer/settings/` |

### The skip ↔ ad gate

The 5-second countdown runs in the **main process**, not the renderer, so a user
can't fast-forward it via devtools. The renderer only *plays* the clip; main
decides when the skip is granted. The break overlay is an app-level interruption
(the OS keeps running underneath) and a configurable **panic hotkey** always
dismisses it — the user is never trapped.

## Releases & CI

- **`.github/workflows/ci.yml`** — typechecks and builds on every push/PR.
- **`.github/workflows/release.yml`** — on a `v*` tag, builds installers for
  macOS/Windows/Linux and publishes them to a GitHub Release (which also feeds
  the auto-updater). Code-signing secrets are wired but optional:

  ```bash
  git tag v0.1.0 && git push origin v0.1.0
  ```

## Status

Milestones 1–8 wired: skeleton, tray, single-instance, scheduler, overlay,
ad-gated skip, settings, power handling, auto-update, and CI/release packaging.
The ad gate works out of the box via a built-in animated house ad; drop a real
`assets/ads/sample.mp4` to use a clip. Code-signing certificates still need to
be provisioned (CI secrets are wired, see `release.yml`).
