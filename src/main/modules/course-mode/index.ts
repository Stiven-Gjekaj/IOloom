/**
 * The course mode setting (roadmap Q1). Course mode hides the features that the
 * automation course does not use: the cloud account, version control, board
 * packages, Modbus, EtherCAT, OPC UA and S7. It hides screens only; a project
 * keeps its settings and builds the same way. Off by default.
 *
 * IPC channels: `course-mode:*` (see boolean-setting).
 */

import type { BrowserWindow } from 'electron'

import { type BooleanSetting, createBooleanSetting } from '../boolean-setting'

export type CourseModeSetting = BooleanSetting

export function createCourseModeSetting(getWindow: () => BrowserWindow | null): CourseModeSetting {
  return createBooleanSetting({ key: 'course_mode', channelPrefix: 'course-mode', defaultValue: false }, getWindow)
}
