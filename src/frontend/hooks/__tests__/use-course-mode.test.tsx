import type { CourseModePort } from '@root/middleware/shared/ports/course-mode-port'
import { EDITOR_CAPABILITIES } from '@root/middleware/shared/ports/platform-capabilities'
import type { PlatformPorts } from '@root/middleware/shared/providers/types'
import { act, renderHook, waitFor } from '@testing-library/react'

import { createStoreWrapper, createTestPorts, createTestStore } from '../../store/testing'
import { connectCourseMode, useCourseModePorts } from '../use-course-mode'
import { useTargetCapabilities } from '../use-target-capabilities'

function fakePort(initial: boolean) {
  let push: ((enabled: boolean) => void) | null = null
  const unsubscribe = jest.fn()
  const port: CourseModePort = {
    isEnabled: jest.fn().mockResolvedValue(initial),
    setEnabled: jest.fn(),
    onChanged: (callback) => {
      push = callback
      return unsubscribe
    },
  }
  return { port, push: (enabled: boolean) => push?.(enabled), unsubscribe }
}

describe('connectCourseMode', () => {
  it('copies the setting into the store, now and at each change, until it is disconnected', async () => {
    const store = createTestStore()
    const { port, push, unsubscribe } = fakePort(true)

    const disconnect = connectCourseMode(store, port)
    await waitFor(() => expect(store.getState().workspace.courseMode).toBe(true))
    push(false)
    expect(store.getState().workspace.courseMode).toBe(false)

    disconnect()
    expect(unsubscribe).toHaveBeenCalled()
    push(true)
    expect(store.getState().workspace.courseMode).toBe(false)
  })

  it('leaves course mode off on a platform without the setting', () => {
    const store = createTestStore()
    connectCourseMode(store, undefined)()
    expect(store.getState().workspace.courseMode).toBe(false)
  })
})

describe('useCourseModePorts', () => {
  it('keeps the ports while course mode is off, and hides the cloud while it is on', () => {
    const store = createTestStore()
    const ports: PlatformPorts = createTestPorts({ capabilities: EDITOR_CAPABILITIES })
    const { result } = renderHook(() => useCourseModePorts(ports), { wrapper: createStoreWrapper(store) })
    expect(result.current).toBe(ports)

    act(() => store.getState().workspaceActions.setCourseMode(true))
    expect(result.current.capabilities.hasEdgeAccount).toBe(false)
    expect(result.current.capabilities.hasLocalSerialPorts).toBe(EDITOR_CAPABILITIES.hasLocalSerialPorts)

    act(() => store.getState().workspaceActions.setCourseMode(false))
    expect(result.current).toBe(ports)
  })
})

describe('useTargetCapabilities in course mode', () => {
  it('hides Modbus, EtherCAT, OPC UA and S7 of the target', () => {
    const store = createTestStore()
    const { deviceActions } = store.getState()
    deviceActions.setAvailableOptions({
      availableBoards: new Map([['Runtime', { compiler: 'openplc-compiler', core: '', preview: '', specs: {} }]]),
    })
    deviceActions.setDeviceBoard('Runtime')
    const { result } = renderHook(() => useTargetCapabilities(), { wrapper: createStoreWrapper(store) })
    expect(result.current.modbusTcpServer).toBe(true)

    act(() => store.getState().workspaceActions.setCourseMode(true))
    expect(result.current).toMatchObject({ modbusTcpServer: false, opcuaServer: false, ethercat: false })

    act(() => store.getState().workspaceActions.setCourseMode(false))
    expect(result.current.modbusTcpServer).toBe(true)
  })
})
