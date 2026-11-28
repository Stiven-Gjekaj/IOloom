/**
 * End-to-end validation of baremetal single stepping (FC 0x4e) over avr8js.
 *
 * Boots simulator firmware in avr8js and checks the stepping contract: a
 * pause holds the values and the outputs, a step runs exactly one scan, a
 * resume runs freely again, and a stop clears the pause.
 *
 * It uses the same firmware as plc-control-e2e.test.ts and skips the same way
 * unless the artefacts are pointed at:
 *
 *   PLC_CONTROL_HEX=/path/to/Baremetal.ino.hex \
 *   PLC_CONTROL_DEBUG_MAP=/path/to/debug-map.json \
 *   npx jest src/backend/shared/simulator/__tests__/plc-step-e2e.test.ts
 *
 * The program has a `counter : INT := 0` variable incremented every scan and a
 * `pulse AT %QX0.0 : BOOL` driven TRUE every scan.
 */

import fs from 'node:fs'
import path from 'node:path'

import { ModbusRtuClient } from '../modbus-rtu-client'
import { SimulatorModule } from '../simulator-module'
import { PlcRuntimeState, PlcStepAction } from '../types'
import { VirtualSerialPort } from '../virtual-serial-port'

// jsdom polyfill, as in modbus-rtu-client.test.ts.
if (typeof globalThis.TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { TextEncoder, TextDecoder } = require('util')
  globalThis.TextEncoder = TextEncoder
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
}

const HEX_PATH = process.env.PLC_CONTROL_HEX ?? ''
const MAP_PATH = process.env.PLC_CONTROL_DEBUG_MAP ?? ''
const ENABLED = HEX_PATH !== '' && MAP_PATH !== '' && fs.existsSync(HEX_PATH) && fs.existsSync(MAP_PATH)
const describeIfEnabled: typeof describe = ENABLED ? describe : describe.skip

/** Resolve a variable path from debug-map.json into the packed `(arr << 16) | elem` address. */
function resolveDebugAddr(debugMapJson: string, pathSuffix: string): number {
  const map = JSON.parse(debugMapJson) as { leaves: Array<{ arrayIdx: number; elemIdx: number; path: string }> }
  const leaf = map.leaves.find((l) => l.path.toUpperCase().endsWith(pathSuffix.toUpperCase()))
  if (!leaf) throw new Error(`No debug leaf matching "${pathSuffix}"`)
  return (leaf.arrayIdx << 16) | leaf.elemIdx
}

describeIfEnabled('Baremetal single stepping end-to-end (FC 0x4e + 0x46 over avr8js)', () => {
  let sim: SimulatorModule
  let client: ModbusRtuClient
  let counterAddr: number
  let pulseAddr: number

  async function readVar(addr: number): Promise<Uint8Array> {
    const res = await client.getVariablesList([addr])
    if (!res.success || !res.data) throw new Error(`getVariablesList failed: ${res.error ?? 'no data'}`)
    return res.data
  }

  /** One INT is 2 bytes, little-endian. */
  async function readCounter(): Promise<number> {
    const data = await readVar(counterAddr)
    return data[0] | (data[1] << 8)
  }

  async function readPulse(): Promise<number> {
    return (await readVar(pulseAddr))[0]
  }

  async function readState(): Promise<number | undefined> {
    return (await client.getStatus()).plcState
  }

  /** Let the target run in real time so that scan cycles elapse (the task interval is 20 ms). */
  async function settle(ms = 400): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  beforeAll(async () => {
    const hex = fs.readFileSync(path.resolve(HEX_PATH), 'utf-8')
    const debugMapJson = fs.readFileSync(path.resolve(MAP_PATH), 'utf-8')
    counterAddr = resolveDebugAddr(debugMapJson, 'counter')
    pulseAddr = resolveDebugAddr(debugMapJson, 'pulse')

    sim = new SimulatorModule()
    sim.loadAndRun(hex)
    client = new ModbusRtuClient({ slaveId: 1, timeout: 5000, serialPort: new VirtualSerialPort(sim) })
    await client.connect()
    await settle()
  }, 600000)

  afterAll(() => {
    client?.disconnect()
    sim?.stop()
  })

  it('refuses a step while the PLC runs freely', async () => {
    expect(await readState()).toBe(PlcRuntimeState.RUNNING)
    const res = await client.plcStep(PlcStepAction.STEP)
    expect(res).toMatchObject({ success: false, refused: true })
  }, 30000)

  it('pauses a running PLC and holds the values and the outputs', async () => {
    const res = await client.plcStep(PlcStepAction.PAUSE)
    expect(res.success).toBe(true)
    await settle()
    expect(await readState()).toBe(PlcRuntimeState.PAUSED)

    const held = await readCounter()
    await settle()
    // A pause is not a stop: no re-initialisation, no counting, output kept.
    expect(held).not.toBe(0)
    expect(await readCounter()).toBe(held)
    expect(await readPulse()).toBe(1)
  }, 30000)

  it('runs exactly one scan for each step', async () => {
    const before = await readCounter()
    const tickBefore = (await client.getStatus()).tick ?? 0

    expect((await client.plcStep(PlcStepAction.STEP)).success).toBe(true)
    await settle()
    expect(await readCounter()).toBe((before + 1) & 0xffff)
    expect((await client.getStatus()).tick).toBe(tickBefore + 1)
    expect(await readState()).toBe(PlcRuntimeState.PAUSED)
  }, 30000)

  it('adds one scan for each step request, also when they come quickly', async () => {
    const before = await readCounter()
    for (let i = 0; i < 3; i += 1) expect((await client.plcStep(PlcStepAction.STEP)).success).toBe(true)
    await settle()
    expect(await readCounter()).toBe((before + 3) & 0xffff)
  }, 30000)

  it('resumes from the held values', async () => {
    const held = await readCounter()
    expect((await client.plcStep(PlcStepAction.RESUME)).success).toBe(true)
    await settle()
    expect(await readState()).toBe(PlcRuntimeState.RUNNING)
    const later = await readCounter()
    // Counting goes on from where it was, so no re-initialisation happened.
    expect(later).not.toBe(held)
    expect(later).toBeGreaterThan(held)
  }, 30000)

  it('resumes on a RUN request too, so the Start button leaves the pause', async () => {
    await client.plcStep(PlcStepAction.PAUSE)
    await settle()
    expect(await readState()).toBe(PlcRuntimeState.PAUSED)
    expect((await client.setPlcState(PlcRuntimeState.RUNNING)).success).toBe(true)
    await settle()
    expect(await readState()).toBe(PlcRuntimeState.RUNNING)
  }, 30000)

  it('clears the pause on a stop, and refuses a pause while stopped', async () => {
    await client.plcStep(PlcStepAction.PAUSE)
    await settle()
    await client.setPlcState(PlcRuntimeState.STOPPED)
    await settle()
    expect(await readState()).toBe(PlcRuntimeState.STOPPED)
    expect(await readCounter()).toBe(0)
    expect(await readPulse()).toBe(0)

    expect(await client.plcStep(PlcStepAction.PAUSE)).toMatchObject({ success: false, refused: true })

    // After the next start the PLC runs freely, not paused.
    await client.setPlcState(PlcRuntimeState.RUNNING)
    await settle()
    expect(await readState()).toBe(PlcRuntimeState.RUNNING)
    const first = await readCounter()
    await settle()
    expect(await readCounter()).not.toBe(first)
  }, 60000)
})
