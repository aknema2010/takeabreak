import { app, Menu, Tray, nativeImage } from 'electron';
import path from 'path';

// System-tray presence so the app isn't just a window you can alt-F4 away, plus
// quick access to settings / take-a-break-now / quit.

export interface TrayActions {
  openSettings: () => void;
  breakNow: () => void;
  quit: () => void;
}

export function createTray(actions: TrayActions): Tray {
  const iconPath = path.join(__dirname, '..', 'assets', 'icons', 'tray.png');
  let image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) {
    // Fall back to an empty image so a missing icon never crashes startup.
    image = nativeImage.createEmpty();
  }

  const tray = new Tray(image);
  tray.setToolTip('TakeABreak');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Take a break now', click: actions.breakNow },
      { label: 'Settings…', click: actions.openSettings },
      { type: 'separator' },
      { label: 'Quit', click: actions.quit },
    ]),
  );

  return tray;
}
