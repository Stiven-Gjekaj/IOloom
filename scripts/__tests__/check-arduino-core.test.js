/* Run with: npm run test:scripts */

const { test } = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const checkArduinoCore = require('../check-arduino-core').default
const { resourcesDir } = require('../check-arduino-core')

function context(platform, appOutDir) {
  return { electronPlatformName: platform, appOutDir, packager: { appInfo: { productFilename: 'Product' } } }
}

function putCore(resources, { complete }) {
  const dir = path.join(resources, 'arduino-core', 'data', 'packages', 'arduino', 'hardware', 'avr', '1.8.8')
  fs.mkdirSync(dir, { recursive: true })
  if (complete) fs.writeFileSync(path.join(dir, 'installed.json'), '{}')
}

test('the resources folder is inside the .app on macOS and beside the binary elsewhere', () => {
  assert.strictEqual(resourcesDir(context('darwin', '/out')), path.join('/out', 'Product.app', 'Contents', 'Resources'))
  assert.strictEqual(resourcesDir(context('linux', '/out')), path.join('/out', 'resources'))
  assert.strictEqual(resourcesDir(context('win32', '/out')), path.join('/out', 'resources'))
})

for (const platform of ['darwin', 'linux', 'win32']) {
  test(`passes when the ${platform} app holds the core`, async () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'check-core-'))
    putCore(resourcesDir(context(platform, out)), { complete: true })
    await checkArduinoCore(context(platform, out), {})
  })
}

test('fails when the app has no core', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'check-core-'))
  await assert.rejects(checkArduinoCore(context('linux', out), {}), /no arduino:avr core/)
})

test('fails when the core in the app has no installed.json', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'check-core-'))
  putCore(resourcesDir(context('linux', out)), { complete: false })
  await assert.rejects(checkArduinoCore(context('linux', out), {}), /no arduino:avr core/)
})

test('IOLOOM_ALLOW_NO_ARDUINO_CORE=1 lets the build continue with no core', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'check-core-'))
  await checkArduinoCore(context('linux', out), { IOLOOM_ALLOW_NO_ARDUINO_CORE: '1' })
})
