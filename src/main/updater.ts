import { autoUpdater } from 'electron-updater';
import { app } from 'electron';

// Background auto-update. Checks GitHub Releases (configured in
// electron-builder.yml `publish`) on launch and installs on quit, so updates
// never interrupt a break. No-ops in dev where there's no packaged app.

export function initAutoUpdater(): void {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload = true;
  // Apply the update on the next quit rather than forcing a restart mid-session.
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err?.message ?? err);
  });
  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update available:', info.version);
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] update downloaded (installs on quit):', info.version);
  });

  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] check failed:', err?.message ?? err);
  });
}
