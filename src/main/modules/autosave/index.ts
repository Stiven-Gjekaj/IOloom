/**
 * The autosave on/off setting (upstream issue 443), kept with the other editor
 * settings. The renderer runs the timer; this module only stores the setting
 * and carries it over IPC.
 *
 * IPC channels:
 *   - autosave:get-enabled (invoke) — the setting now
 *   - autosave:set-enabled (send)   — the in-app File menu changes it
 *   - autosave:changed     (to the window) — each change, from either menu
 */

import { type BrowserWindow, ipcMain } from 'electron'

import { store } from '../store'

export interface AutosaveSetting {
  isEnabled(): boolean
  setEnabled(enabled: boolean): void
  /** Each change, from either menu. The native menu rebuilds itself on it. */
  onChange(listener: (enabled: boolean) => void): void
}

export function createAutosaveSetting(getWindow: () => BrowserWindow | null): AutosaveSetting {
  const listeners: Array<(enabled: boolean) => void> = []
  const setting: AutosaveSetting = {
    isEnabled: () => store.get('autosave') !== false,
    setEnabled: (enabled) => {
      store.set('autosave', enabled)
      const window = getWindow()
      if (window && !window.isDestroyed()) window.webContents.send('autosave:changed', enabled)
      for (const listener of listeners) listener(enabled)
    },
    onChange: (listener) => {
      listeners.push(listener)
    },
  }
  ipcMain.handle('autosave:get-enabled', () => setting.isEnabled())
  ipcMain.on('autosave:set-enabled', (_event, enabled: unknown) => {
    if (typeof enabled === 'boolean') setting.setEnabled(enabled)
  })
  return setting
}
