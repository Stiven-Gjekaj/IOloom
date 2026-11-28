/**
 * CourseModePort: the on/off setting of course mode (roadmap Q1).
 *
 * Editor adapter: the main process keeps the setting with the other editor
 *                 settings, so the native Display menu and the in-app Display
 *                 menu show the same state.
 * Web adapter:    none. Without the port, course mode stays off.
 */

import type { Unsubscribe } from './types'

export interface CourseModePort {
  isEnabled(): Promise<boolean>

  setEnabled(enabled: boolean): void

  /** Each change, from either Display menu. */
  onChanged(callback: (enabled: boolean) => void): Unsubscribe
}
