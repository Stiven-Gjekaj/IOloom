/**
 * An on/off editor setting that the main process keeps with the other editor
 * settings and carries over IPC. The native menu and the in-app menu both show
 * it, so each change goes to the window and to the local listeners.
 *
 * IPC channels, for a setting with the channel prefix `<prefix>`:
 *   - <prefix>:get-enabled (invoke) — the setting now
 *   - <prefix>:set-enabled (send)   — the in-app menu changes it
 *   - <prefix>:changed     (to the window) — each change, from either menu
 */

import { type BrowserWindow, ipcMain } from 'electron'

import { store } from '../store'

export interface BooleanSetting {
  isEnabled(): boolean
  setEnabled(enabled: boolean): void
  /** Each change, from either menu. The native menu rebuilds itself on it. */
  onChange(listener: (enabled: boolean) => void): void
}

/** The keys of the editor settings that hold one boolean. */
export type BooleanSettingKey = 'autosave'

export interface BooleanSettingOptions {
  key: BooleanSettingKey
  channelPrefix: string
  /** The value while the user has not changed the setting. */
  defaultValue: boolean
}

export function createBooleanSetting(
  { key, channelPrefix, defaultValue }: BooleanSettingOptions,
  getWindow: () => BrowserWindow | null,
): BooleanSetting {
  const listeners: Array<(enabled: boolean) => void> = []
  const setting: BooleanSetting = {
    isEnabled: () => {
      const stored = store.get(key)
      return typeof stored === 'boolean' ? stored : defaultValue
    },
    setEnabled: (enabled) => {
      store.set(key, enabled)
      const window = getWindow()
      if (window && !window.isDestroyed()) window.webContents.send(`${channelPrefix}:changed`, enabled)
      for (const listener of listeners) listener(enabled)
    },
    onChange: (listener) => {
      listeners.push(listener)
    },
  }
  ipcMain.handle(`${channelPrefix}:get-enabled`, () => setting.isEnabled())
  ipcMain.on(`${channelPrefix}:set-enabled`, (_event, enabled: unknown) => {
    if (typeof enabled === 'boolean') setting.setEnabled(enabled)
  })
  return setting
}
