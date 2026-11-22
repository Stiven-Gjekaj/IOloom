/* Run with: npm run test:scripts */

const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { downloadArduinoCore, hasCore, installedCoreDir, parseArgs, seedDataDir } = require('../download-arduino-core')

/* A repository root with a pinned version and an arduino-cli file. */
function makeRoot(version = '9.9.9') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'arduino-core-'))
  fs.writeFileSync(path.join(root, 'binary-versions.json'), JSON.stringify({ 'arduino-avr': { version } }))
  const binDir = path.join(root, 'resources', 'bin', 'linux', 'x64')
  fs.mkdirSync(binDir, { recursive: true })
  fs.writeFileSync(path.join(binDir, 'arduino-cli'), '')
  return root
}

/* Acts as arduino-cli: on "core install", writes the files of an install. */
function fakeCli(calls) {
  return (file, args) => {
    calls.push(args.slice(2))
    const config = fs.readFileSync(args[1], 'utf-8')
    const dataDir = /data: '([^']+)'/.exec(config)[1]
    if (args[2] === 'core' && args[3] === 'install') {
      const version = args[4].split('@')[1]
      fs.mkdirSync(installedCoreDir(dataDir, version), { recursive: true })
      fs.writeFileSync(path.join(installedCoreDir(dataDir, version), 'installed.json'), '{}')
      fs.mkdirSync(path.join(dataDir, 'staging', 'packages'), { recursive: true })
      fs.mkdirSync(path.join(dataDir, 'tmp'), { recursive: true })
    }
  }
}

test('installs the pinned core and removes the download archives', () => {
  const root = makeRoot('1.2.3')
  const calls = []
  const dataDir = downloadArduinoCore({ root, platform: 'linux', arch: 'x64', run: fakeCli(calls) })
  assert.strictEqual(dataDir, seedDataDir(root, 'linux', 'x64'))
  assert.deepStrictEqual(calls, [
    ['core', 'update-index'],
    ['core', 'install', 'arduino:avr@1.2.3'],
  ])
  assert.strictEqual(hasCore(dataDir, '1.2.3'), true)
  assert.strictEqual(fs.existsSync(path.join(dataDir, 'staging')), false)
  assert.strictEqual(fs.existsSync(path.join(dataDir, 'tmp')), false)
})

test('does not download again when the pinned core is there', () => {
  const root = makeRoot('1.2.3')
  downloadArduinoCore({ root, platform: 'linux', arch: 'x64', run: fakeCli([]) })
  const calls = []
  downloadArduinoCore({ root, platform: 'linux', arch: 'x64', run: fakeCli(calls) })
  assert.deepStrictEqual(calls, [])
})

test('downloads again when the pinned version changes', () => {
  const root = makeRoot('1.2.3')
  downloadArduinoCore({ root, platform: 'linux', arch: 'x64', run: fakeCli([]) })
  fs.writeFileSync(path.join(root, 'binary-versions.json'), JSON.stringify({ 'arduino-avr': { version: '1.2.4' } }))
  const calls = []
  const dataDir = downloadArduinoCore({ root, platform: 'linux', arch: 'x64', run: fakeCli(calls) })
  assert.strictEqual(calls.length, 2)
  assert.strictEqual(hasCore(dataDir, '1.2.4'), true)
  assert.strictEqual(hasCore(dataDir, '1.2.3'), false, 'the old version must not stay in the installer')
})

test('fails when arduino-cli does not install the core', () => {
  const root = makeRoot()
  assert.throws(
    () => downloadArduinoCore({ root, platform: 'linux', arch: 'x64', run: () => undefined }),
    /did not install/,
  )
})

test('fails when the arduino-cli of the target is missing', () => {
  const root = makeRoot()
  assert.throws(
    () => downloadArduinoCore({ root, platform: 'linux', arch: 'arm64', run: fakeCli([]) }),
    /arduino-cli not found/,
  )
})

test('the arm64 seed can come from the x64 arduino-cli', () => {
  const root = makeRoot('1.2.3')
  const files = []
  const run = fakeCli([])
  const dataDir = downloadArduinoCore({
    root,
    platform: 'linux',
    arch: 'arm64',
    cliArch: 'x64',
    run: (file, args) => {
      files.push(file)
      run(file, args)
    },
  })
  assert.strictEqual(dataDir, seedDataDir(root, 'linux', 'arm64'))
  assert.ok(files.every((f) => f === path.join(root, 'resources', 'bin', 'linux', 'x64', 'arduino-cli')))
})

test('parseArgs reads the architecture and refuses others', () => {
  assert.deepStrictEqual(parseArgs(['--arch', 'x64', '--force']), { arch: 'x64', cliArch: 'x64', force: true })
  assert.deepStrictEqual(parseArgs(['--arch', 'arm64', '--cli-arch', 'x64']), {
    arch: 'arm64',
    cliArch: 'x64',
    force: false,
  })
  assert.throws(() => parseArgs(['--arch', 'ia32']), /--arch must be arm64 or x64/)
  assert.throws(() => parseArgs(['--cli-arch', 'ia32']), /--cli-arch must be arm64 or x64/)
})
