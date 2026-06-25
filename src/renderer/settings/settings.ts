import type { Settings } from '../../shared/types';

// Settings form controller. Loads current settings from main, writes changes
// back through the audited bridge.

const form = document.getElementById('settings-form') as HTMLFormElement;
const saved = document.getElementById('saved')!;

const numberIds = [
  'workIntervalMin',
  'breakDurationSec',
  'adDurationSec',
] as const;
const boolIds = ['adRequired', 'strictMode', 'launchAtLogin'] as const;

function input(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

async function load(): Promise<void> {
  const s = await window.api.getSettings();
  for (const id of numberIds) input(id).value = String(s[id]);
  for (const id of boolIds) input(id).checked = Boolean(s[id]);
  input('panicHotkey').value = s.panicHotkey;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const partial: Partial<Settings> = {
    panicHotkey: input('panicHotkey').value.trim(),
  };
  for (const id of numberIds) partial[id] = Number(input(id).value);
  for (const id of boolIds) partial[id] = input(id).checked;

  await window.api.saveSettings(partial);
  saved.hidden = false;
  setTimeout(() => (saved.hidden = true), 1500);
});

load();
