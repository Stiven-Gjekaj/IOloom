/**
 * Editor CourseModePort adapter: the main-process course mode setting
 * (`src/main/modules/course-mode`) over IPC.
 */

import type { CourseModePort } from '../../shared/ports/course-mode-port'

export function createEditorCourseModeAdapter(): CourseModePort {
  return {
    async isEnabled() {
      return (await window.bridge.courseModeGetEnabled()) === true
    },

    setEnabled(enabled) {
      window.bridge.courseModeSetEnabled(enabled)
    },

    onChanged(callback) {
      return window.bridge.onCourseModeChanged((enabled) => callback(enabled === true))
    },
  }
}
