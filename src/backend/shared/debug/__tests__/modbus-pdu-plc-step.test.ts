/**
 * Single-stepping wire-protocol codec tests (FC 0x4e).
 *
 * These bytes are the contract between the editor and the baremetal runtime's
 * `plcStep()` handler in modbus_debug.cpp, so the layouts are asserted byte for
 * byte.
 */

import { buildPlcStepRequest, parsePlcStepResponse } from '../modbus-pdu'
import { ModbusDebugResponse, ModbusFunctionCode, PlcRuntimeState, PlcStepAction } from '../../simulator/types'

describe('single-stepping command builder (FC 0x4e)', () => {
  it('builds PAUSE, STEP and RESUME as [FC][action]', () => {
    expect(Array.from(buildPlcStepRequest(PlcStepAction.PAUSE))).toEqual([0x4e, 0x00])
    expect(Array.from(buildPlcStepRequest(PlcStepAction.STEP))).toEqual([0x4e, 0x01])
    expect(Array.from(buildPlcStepRequest(PlcStepAction.RESUME))).toEqual([0x4e, 0x02])
  })

  it('claims 0x4e, clear of every other function code', () => {
    expect(ModbusFunctionCode.PLC_STEP).toBe(0x4e)
    const codes = Object.values(ModbusFunctionCode).filter((value): value is number => typeof value === 'number')
    expect(codes.filter((code) => code === 0x4e)).toHaveLength(1)
  })

  it('claims 0x88 for STEP_REFUSED, clear of every other status code', () => {
    expect(ModbusDebugResponse.STEP_REFUSED).toBe(0x88)
    const codes = Object.values(ModbusDebugResponse).filter((value): value is number => typeof value === 'number')
    expect(codes.filter((code) => code === 0x88)).toHaveLength(1)
  })
})

describe('parsePlcStepResponse', () => {
  const frame = (status: number, state: number, tick: number) =>
    new Uint8Array([
      ModbusFunctionCode.PLC_STEP,
      status,
      state,
      (tick >>> 24) & 0xff,
      (tick >>> 16) & 0xff,
      (tick >>> 8) & 0xff,
      tick & 0xff,
    ])

  it('parses an accepted action with the state and the big-endian scan counter', () => {
    expect(parsePlcStepResponse(frame(ModbusDebugResponse.SUCCESS, PlcRuntimeState.PAUSED, 0x01020304))).toEqual({
      success: true,
      state: PlcRuntimeState.PAUSED,
      tick: 0x01020304,
    })
  })

  it('flags an action that the state refuses', () => {
    const result = parsePlcStepResponse(frame(ModbusDebugResponse.STEP_REFUSED, PlcRuntimeState.RUNNING, 7))
    expect(result.success).toBe(false)
    expect(result.refused).toBe(true)
    expect(result.state).toBe(PlcRuntimeState.RUNNING)
    expect(result.error).toMatch(/pause/i)
  })

  it('reports another failure status as an error, not as a refusal', () => {
    const result = parsePlcStepResponse(frame(ModbusDebugResponse.ERROR_OUT_OF_BOUNDS, PlcRuntimeState.RUNNING, 0))
    expect(result.success).toBe(false)
    expect(result.refused).toBeUndefined()
    expect(result.error).toBeDefined()
  })

  it('reads the Modbus exception form as firmware without single stepping', () => {
    const result = parsePlcStepResponse(new Uint8Array([0x4e | 0x80, 0x01]))
    expect(result).toMatchObject({ success: false, unsupported: true })
  })

  it('rejects a reply to another function code', () => {
    expect(parsePlcStepResponse(frame(ModbusDebugResponse.SUCCESS, 0, 0).map((b, i) => (i === 0 ? 0x4b : b)))).toEqual({
      success: false,
      error: 'Function code mismatch',
    })
  })

  it('rejects a reply that is too short', () => {
    expect(parsePlcStepResponse(new Uint8Array([]))).toMatchObject({ success: false })
    expect(parsePlcStepResponse(new Uint8Array([0x4e, 0x7e, 3]))).toMatchObject({ success: false })
  })
})
