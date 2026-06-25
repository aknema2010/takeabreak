import Store from 'electron-store';
import { DEFAULT_SETTINGS, Settings } from '../shared/types';

// Persists settings as JSON in the app's userData directory.
const store = new Store<Settings>({ defaults: DEFAULT_SETTINGS });

export function getSettings(): Settings {
  // Merge over defaults so newly-added keys are always present.
  return { ...DEFAULT_SETTINGS, ...(store.store as Settings) };
}

export function saveSettings(partial: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...partial };
  store.set(next);
  return next;
}
