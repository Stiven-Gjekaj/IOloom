/**
 * useScanStepping: single stepping of a baremetal PLC (upstream issue 557, IOloom #11).
 *
 * While a debug session is open on a target that can step, the user can hold the PLC
 * between two scans (Pause), run one scan at a time (Step), and let it run freely again
 * (Resume). The firmware does the work over Modbus FC 0x4e. This hook only decides
 * which commands to offer and sends them.
 *
 * The state comes from the device status poll, which reports PAUSED while the PLC is
 * held. That poll is throttled, so an accepted Pause or Resume also writes the state it
 * asked for at once. A Step does not change the state: the PLC stays paused.
 */
import { useCallback, useState } from 'react'

import type { PlcStepResult } from '../../backend/shared/debug/types'
import { useDebugger } from '../../middleware/shared/providers'
import { resolveTargetCapabilities } from '../../middleware/shared/utils/target-capabilities'
import { toast } from '../components/_features/[app]/toast/use-toast'
import { useOpenPLCStore } from '../store'
import { useIsDebuggerVisible } from './use-debug-value'

export type ScanStepAction = 'PAUSE' | 'STEP' | 'RESUME'

export interface ScanStepping {
  /** True when the controls apply: a debug session is open on a target that can step. */
  available: boolean
  /** True while the PLC is held between scans. */
  paused: boolean
  /** True while a command is in flight. A second click then does nothing. */
  busy: boolean
  run: (action: ScanStepAction) => Promise<void>
}

const FAILURE_TITLE: Record<ScanStepAction, string> = {
  PAUSE: 'Cannot pause the PLC',
  STEP: 'Cannot step the PLC',
  RESUME: 'Cannot resume the PLC',
}

/** The message for a command that the target did not accept. */
function failureDescription(result: PlcStepResult): string {
  if (result.unsupported) return 'The program on the device has no single stepping. Build and upload it again.'
  return result.error ?? 'The device did not accept the command.'
}

export const useScanStepping = (): ScanStepping => {
  const debuggerPort = useDebugger()
  const isOnline = useIsDebuggerVisible()
  const canStep = useOpenPLCStore(
    (state) =>
      resolveTargetCapabilities(
        state.deviceAvailableOptions.availableBoards.get(state.deviceDefinitions.configuration.deviceBoard),
      ).scanStepping,
  )
  const paused = useOpenPLCStore((state) => state.runtimeConnection.plcStatus === 'PAUSED')
  const setPlcRuntimeStatus = useOpenPLCStore((state) => state.deviceActions.setPlcRuntimeStatus)
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async (action: ScanStepAction): Promise<void> => {
      if (busy || !debuggerPort.plcStep) return
      setBusy(true)
      try {
        const result = await debuggerPort.plcStep(action)
        if (!result.success) {
          toast({ title: FAILURE_TITLE[action], description: failureDescription(result), variant: 'fail' })
          return
        }
        if (action === 'PAUSE') setPlcRuntimeStatus('PAUSED')
        if (action === 'RESUME') setPlcRuntimeStatus('RUNNING')
      } finally {
        setBusy(false)
      }
    },
    [busy, debuggerPort, setPlcRuntimeStatus],
  )

  return { available: isOnline && canStep, paused, busy, run }
}
