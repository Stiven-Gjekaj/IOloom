// Spike: compile the STruC++ output of the sample LD project to WebAssembly
// with clang in WebAssembly (@yowasp/clang), then run it in Node.
//
// The rung is: the contact Motor drives the coil Lamp.
// No Arduino core, no AVR emulator, and no network are used.
//
// Usage: node spikes/wasm/run.mjs <build dir of "OpenPLC Simulator">
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { WASI } from 'node:wasi'

import { commands } from '@yowasp/clang'

const here = dirname(fileURLToPath(import.meta.url))
const buildDir = process.argv[2]
if (!buildDir) throw new Error('usage: run.mjs <build dir of "OpenPLC Simulator">')

const genDir = join(buildDir, 'src')
const runtimeDir = join(here, '../../node_modules/strucpp/src/runtime/include')

const readDir = (dir, filter) =>
  Object.fromEntries(
    readdirSync(dir)
      .filter(filter)
      .map((name) => [name, readFileSync(join(dir, name), 'utf8')]),
  )

// Only the files that STruC++ generates for the program. The Arduino glue stays out.
const generated = ['generated.hpp', 'configuration.cpp']
const pous = readdirSync(genDir).filter((name) => /^pou_.*\.cpp$/.test(name))
const tree = {
  inc: readDir(runtimeDir, (name) => name.endsWith('.hpp')),
  gen: readDir(genDir, (name) => generated.includes(name) || pous.includes(name)),
  'host.cpp': readFileSync(join(here, 'host.cpp'), 'utf8'),
}

const args = [
  '--target=wasm32-wasip1',
  '-std=gnu++17',
  '-O2',
  '-fno-exceptions',
  '-mexec-model=reactor',
  '-Iinc',
  '-Igen',
  'gen/configuration.cpp',
  ...pous.map((name) => `gen/${name}`),
  'host.cpp',
  '-o',
  'plc.wasm',
]

const t = performance.now()
let out
try {
  out = await commands['clang++'](args, tree, { decodeASCII: false })
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
const compileMs = performance.now() - t
const wasm = out['plc.wasm']
console.log(`compile and link: ${compileMs.toFixed(0)} ms, module ${wasm.byteLength} bytes`)

const wasi = new WASI({ version: 'preview1' })
const { instance } = await WebAssembly.instantiate(wasm, { wasi_snapshot_preview1: wasi.wasiImport })
wasi.initialize(instance)
const plc = instance.exports

let failed = false
const check = (label, ok) => {
  console.log(`${ok ? 'pass' : 'FAIL'}  ${label}`)
  if (!ok) failed = true
}

plc.plc_scan()
check('Lamp is FALSE at start', plc.get_lamp() === 0)
plc.set_motor(1)
plc.plc_scan()
check('Motor TRUE: Lamp is TRUE after one scan', plc.get_lamp() === 1)
plc.set_motor(0)
plc.plc_scan()
check('Motor FALSE: Lamp is FALSE after one scan', plc.get_lamp() === 0)

process.exit(failed ? 1 : 0)
