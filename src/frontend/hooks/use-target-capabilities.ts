/**
 * Selector hook that resolves the active target's `TargetCapabilities`
 * from the live store state — the same resolution path
 * `useAliasRegistry` runs to scope the address pool, exposed as a
 * standalone hook so UI surfaces that gate their content on the active
 * target (location-cell dropdown, board picker, debugger selector)
 * share one canonical answer.
 *
 * Backed by a module-level single-entry cache keyed on the
 * `(deviceBoard, availableBoards)` pair so dozens of cells calling
 * this in the same render-pass share one resolution. Zustand
 * guarantees referential stability on unchanged state so the cache
 * hit is the steady-state path.
 *
 * Course mode (roadmap Q1) hides Modbus, EtherCAT, OPC UA and S7 here, so
 * every surface that reads this hook hides them too. The build resolves the
 * capabilities itself and does not see course mode.
 */

import { useOpenPLCStore } from '@root/frontend/store'
import type { BoardInfo } from '@root/middleware/shared/ports/types'
import { resolveTargetCapabilities, type TargetCapabilities } from '@root/middleware/shared/utils/target-capabilities'

import { courseModeTargetCapabilities } from '../utils/course-mode'

interface CapabilitiesCache {
  deviceBoard: string
  availableBoards: Map<string, BoardInfo>
  courseMode: boolean
  capabilities: TargetCapabilities
}

let cache: CapabilitiesCache | null = null

export function useTargetCapabilities(): TargetCapabilities {
  const deviceBoard = useOpenPLCStore((s) => s.deviceDefinitions.configuration.deviceBoard)
  const availableBoards = useOpenPLCStore((s) => s.deviceAvailableOptions.availableBoards)
  const courseMode = useOpenPLCStore((s) => s.workspace.courseMode)

  if (
    cache &&
    cache.deviceBoard === deviceBoard &&
    cache.availableBoards === availableBoards &&
    cache.courseMode === courseMode
  ) {
    return cache.capabilities
  }

  const capabilities = courseModeTargetCapabilities(
    resolveTargetCapabilities(availableBoards.get(deviceBoard)),
    courseMode,
  )
  cache = { deviceBoard, availableBoards, courseMode, capabilities }
  return capabilities
}
