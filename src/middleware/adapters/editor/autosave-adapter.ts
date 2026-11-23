/**
 * Editor AutosavePort adapter: the main-process autosave setting
 * (`src/main/modules/autosave`) over IPC.
 */

import type { AutosavePort } from '../../shared/ports/autosave-port'

export function createEditorAutosaveAdapter(): AutosavePort {
  return {
    async isEnabled() {
      return (await window.bridge.autosaveGetEnabled()) === true
    },

    setEnabled(enabled) {
      window.bridge.autosaveSetEnabled(enabled)
    },

    onChanged(callback) {
      return window.bridge.onAutosaveChanged((enabled) => callback(enabled === true))
    },
  }
}
