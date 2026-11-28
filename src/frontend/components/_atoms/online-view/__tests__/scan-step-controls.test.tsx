/** Single stepping of the PLC (upstream issue 557, IOloom #11). */
import type { PlcStepResult } from '@root/backend/shared/debug/types'
import { WEB_CAPABILITIES } from '@root/middleware/shared/ports/platform-capabilities'
import type { OpenPLCStore } from '@root/frontend/store'
import { createStoreWrapper, createTestPorts, createTestStore } from '@root/frontend/store/testing'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { toast } from '../../../_features/[app]/toast/use-toast'
import { OnlineViewBadge } from '../index'

jest.mock('../../../_features/[app]/toast/use-toast', () => ({ toast: jest.fn() }))

const BOARD = 'Step Board'

let store: OpenPLCStore
let plcStep: jest.Mock<Promise<PlcStepResult>, [string]>

function renderOnline(compiler: string) {
  store = createTestStore()
  const { deviceActions, workspaceActions } = store.getState()
  deviceActions.setAvailableOptions({
    availableBoards: new Map([[BOARD, { compiler, core: '', preview: '', specs: {} }]]),
  })
  deviceActions.setDeviceBoard(BOARD)
  deviceActions.setPlcRuntimeStatus('RUNNING')
  workspaceActions.setDebuggerVisible(true)
  const ports = createTestPorts({ capabilities: WEB_CAPABILITIES, debugger: { plcStep } })
  render(<OnlineViewBadge />, { wrapper: createStoreWrapper(store, ports) })
}

beforeEach(() => {
  plcStep = jest.fn().mockResolvedValue({ success: true, state: 1, tick: 10 })
  jest.mocked(toast).mockClear()
})

describe('ScanStepControls', () => {
  it('offers Pause on a running baremetal PLC, then Step and Resume once it is paused', async () => {
    const user = userEvent.setup()
    renderOnline('arduino-cli')
    expect(screen.queryByTestId('scan-step-step')).toBeNull()

    await user.click(screen.getByTestId('scan-step-pause'))
    expect(plcStep).toHaveBeenCalledWith('PAUSE')
    // The status poll is throttled, so the accepted pause shows at once.
    await screen.findByTestId('scan-step-paused')
    expect(store.getState().runtimeConnection.plcStatus).toBe('PAUSED')
    expect(screen.queryByTestId('scan-step-pause')).toBeNull()

    await user.click(screen.getByTestId('scan-step-step'))
    expect(plcStep).toHaveBeenLastCalledWith('STEP')
    // A step keeps the PLC paused.
    expect(store.getState().runtimeConnection.plcStatus).toBe('PAUSED')

    await user.click(screen.getByTestId('scan-step-resume'))
    expect(plcStep).toHaveBeenLastCalledWith('RESUME')
    await screen.findByTestId('scan-step-pause')
    expect(store.getState().runtimeConnection.plcStatus).toBe('RUNNING')
  })

  it('follows a PAUSED state that the status poll reports', () => {
    renderOnline('simulator')
    act(() => store.getState().deviceActions.setPlcRuntimeStatus('PAUSED'))
    expect(screen.getByTestId('scan-step-step')).toBeTruthy()
    expect(screen.getByTestId('scan-step-resume')).toBeTruthy()
  })

  it('shows no controls on a runtime target, which cannot step', () => {
    renderOnline('openplc-compiler')
    expect(screen.getByTestId('online-view-badge')).toBeTruthy()
    expect(screen.queryByTestId('scan-step-controls')).toBeNull()
  })

  it('tells the user to upload again when the firmware has no single stepping', async () => {
    const user = userEvent.setup()
    plcStep.mockResolvedValue({
      success: false,
      unsupported: true,
      error: 'Firmware does not implement single stepping',
    })
    renderOnline('arduino-cli')

    await user.click(screen.getByTestId('scan-step-pause'))

    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(jest.mocked(toast).mock.calls[0][0]).toMatchObject({ title: 'Cannot pause the PLC', variant: 'fail' })
    expect(String(jest.mocked(toast).mock.calls[0][0].description)).toMatch(/upload/i)
    expect(store.getState().runtimeConnection.plcStatus).toBe('RUNNING')
  })

  it('shows nothing after the debug session closes', () => {
    renderOnline('arduino-cli')
    act(() => store.getState().workspaceActions.clearDebugState())
    expect(screen.queryByTestId('scan-step-controls')).toBeNull()
  })
})
