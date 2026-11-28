/**
 * The autosave on/off setting (upstream issue 443), kept with the other editor
 * settings. The renderer runs the timer; this module only stores the setting
 * and carries it over IPC (channels `autosave:*`, see boolean-setting).
 */

import type { BrowserWindow } from 'electron'

import { type BooleanSetting, createBooleanSetting } from '../boolean-setting'

export type AutosaveSetting = BooleanSetting

export function createAutosaveSetting(getWindow: () => BrowserWindow | null): AutosaveSetting {
  return createBooleanSetting({ key: 'autosave', channelPrefix: 'autosave', defaultValue: true }, getWindow)
}
