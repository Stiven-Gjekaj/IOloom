/**
 * AutosavePort — the on/off setting of autosave (upstream issue 443).
 *
 * Editor adapter: the main process keeps the setting with the other editor
 *                 settings, so the native File menu and the in-app File menu
 *                 show the same state.
 * Web adapter:    none. Without the port, the editor does not autosave.
 */

import type { Unsubscribe } from './types'

export interface AutosavePort {
  isEnabled(): Promise<boolean>

  setEnabled(enabled: boolean): void

  /** Each change, from either File menu. */
  onChanged(callback: (enabled: boolean) => void): Unsubscribe
}
