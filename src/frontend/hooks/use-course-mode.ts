/**
 * Course mode in the renderer (roadmap Q1). The store holds the setting, so the
 * capability hooks can read it. `connectCourseMode` keeps the store in step with
 * the platform setting, and `useCourseModePorts` gives the UI the capabilities it
 * may show.
 */
import { useMemo } from 'react'

import type { CourseModePort } from '../../middleware/shared/ports/course-mode-port'
import type { PlatformPorts } from '../../middleware/shared/providers/types'
import type { OpenPLCStore } from '../store'
import { useOpenPLCStore } from '../store'
import { courseModePlatformCapabilities } from '../utils/course-mode'

/** Copy the platform setting into the store, now and at each change. Returns the unsubscribe. */
export function connectCourseMode(store: OpenPLCStore, port: CourseModePort | undefined): () => void {
  if (!port) return () => undefined
  let active = true
  const apply = (enabled: boolean) => {
    if (active) store.getState().workspaceActions.setCourseMode(enabled)
  }
  port
    .isEnabled()
    .then(apply)
    .catch(() => undefined)
  const unsubscribe = port.onChanged(apply)
  return () => {
    active = false
    unsubscribe()
  }
}

/** The ports with the capabilities that course mode lets the UI show. The same object while nothing changes. */
export function useCourseModePorts(ports: PlatformPorts): PlatformPorts {
  const courseMode = useOpenPLCStore((state) => state.workspace.courseMode)
  return useMemo(
    () =>
      courseMode ? { ...ports, capabilities: courseModePlatformCapabilities(ports.capabilities, courseMode) } : ports,
    [ports, courseMode],
  )
}
