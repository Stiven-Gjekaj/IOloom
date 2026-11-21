// Spike: run the compiled sample LD program in the editor's AVR simulator.
//
// The program has one rung: the contact Motor drives the coil Lamp.
// This script boots the firmware with the editor's own SimulatorModule,
// VirtualSerialPort and ModbusRtuClient. It forces Motor and reads Lamp.
// Lamp must follow Motor, else the rung does not run.
//
// Usage: npx tsx spikes/simulator/run.ts <build dir of "OpenPLC Simulator">
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { ModbusRtuClient } from '../../src/backend/shared/simulator/modbus-rtu-client'
import { SimulatorModule } from '../../src/backend/shared/simulator/simulator-module'
import { VirtualSerialPort } from '../../src/backend/shared/simulator/virtual-serial-port'

interface Leaf {
  arrayIdx: number
  elemIdx: number
  path: string
}

const buildDir = process.argv[2]
if (!buildDir) throw new Error('usage: run.ts <build dir of "OpenPLC Simulator">')

const hexPath = join(buildDir, 'examples/Baremetal/build/arduino.avr.mega/Baremetal.ino.hex')
const map = JSON.parse(readFileSync(join(buildDir, 'src/debug-map.json'), 'utf8')) as {
  md5: string
  leaves: Leaf[]
}

// The editor packs a debug address as (arr << 16) | elem.
const address = (path: string): number => {
  const leaf = map.leaves.find((l) => l.path === path)
  if (!leaf) throw new Error(`${path} is not in the debug map`)
  return (leaf.arrayIdx << 16) | leaf.elemIdx
}
const MOTOR = address('INSTANCE0.MOTOR')
const LAMP = address('INSTANCE0.LAMP')

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

const sim = new SimulatorModule()
const t0 = performance.now()
sim.loadAndRun(readFileSync(hexPath, 'utf8'))
const client = new ModbusRtuClient({ slaveId: 1, timeout: 5000, serialPort: new VirtualSerialPort(sim) })

let failed = false
const check = (label: string, ok: boolean): void => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${label}`)
  if (!ok) failed = true
}

const readLamp = async (): Promise<number | undefined> => {
  const r = await client.getVariablesList([LAMP])
  return r.success ? r.data?.[0] : undefined
}

const main = async (): Promise<void> => {
  try {
    await client.connect()
    const probe = await client.getMd5Hash()
    console.log(`boot and connect: ${(performance.now() - t0).toFixed(0)} ms`)
    check(`firmware MD5 ${probe.md5} matches the debug map`, probe.md5 === map.md5)

    check('Lamp is FALSE at start', (await readLamp()) === 0)

    await client.setVariable(MOTOR, true, new Uint8Array([1]))
    await sleep(200) // 10 scans of the 20 ms task
    check('force Motor TRUE: Lamp is TRUE', (await readLamp()) === 1)

    await client.setVariable(MOTOR, true, new Uint8Array([0]))
    await sleep(200)
    check('force Motor FALSE: Lamp is FALSE', (await readLamp()) === 0)

    const s1 = await client.getStatus()
    await sleep(1000)
    const s2 = await client.getStatus()
    const scans = (s2.tick ?? 0) - (s1.tick ?? 0)
    console.log(`scans in 1 s of wall time: ${scans} (the task asks for 50)`)
    check('the PLC is running', s2.running === true && scans > 0)
  } finally {
    client.disconnect()
    sim.stop()
  }
}

main().then(
  () => process.exit(failed ? 1 : 0),
  (error: unknown) => {
    console.error(error)
    process.exit(2)
  },
)
