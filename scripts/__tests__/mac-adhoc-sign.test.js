/* Run with: node --test scripts/__tests__ */

const { test } = require('node:test')
const assert = require('node:assert')
const { execFileSync, spawnSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const signAdhocAfterPack = require('../mac-adhoc-sign').default
const { adhocSign } = require('../mac-adhoc-sign')
const { stampMainExecutableUuid } = require('../mac-inject-local-network-usage')

const isMac = process.platform === 'darwin'

function verifies(appPath) {
  try {
    execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/* Make a small .app with a thin Mach-O executable from the C compiler. The
 * linker signs it ad hoc. Then stamp a new LC_UUID with the real afterPack
 * step. This breaks the signature in the same way as in a packaged build.
 */
function makeBrokenApp(dir, name) {
  const appPath = path.join(dir, `${name}.app`)
  const macos = path.join(appPath, 'Contents', 'MacOS')
  fs.mkdirSync(macos, { recursive: true })
  fs.writeFileSync(
    path.join(appPath, 'Contents', 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>${name}</string>
<key>CFBundleIdentifier</key><string>test.adhoc.sign</string>
</dict></plist>
`,
  )
  const source = path.join(dir, 'main.c')
  fs.writeFileSync(source, 'int main(void) { return 0; }\n')
  const exe = path.join(macos, name)
  execFileSync('/usr/bin/cc', ['-o', exe, source])
  stampMainExecutableUuid(exe, 'test.adhoc.sign')
  return { appPath, exe }
}

test('adhocSign makes a broken signature correct', { skip: !isMac }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adhoc-sign-'))
  const { appPath, exe } = makeBrokenApp(dir, 'Sample')
  assert.strictEqual(verifies(appPath), false, 'the test bundle must start with a broken signature')
  if (process.arch === 'arm64') {
    const before = spawnSync(exe)
    assert.strictEqual(before.signal, 'SIGKILL', 'macOS must stop the binary with the broken signature')
  }
  adhocSign(appPath)
  assert.strictEqual(verifies(appPath), true)
  const after = spawnSync(exe)
  assert.strictEqual(after.signal, null)
  assert.strictEqual(after.status, 0)
})

test('the afterPack step signs the .app of the product name', { skip: !isMac }, async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adhoc-sign-'))
  const { appPath } = makeBrokenApp(dir, 'Product Name')
  await signAdhocAfterPack({
    electronPlatformName: 'darwin',
    appOutDir: dir,
    packager: { appInfo: { productFilename: 'Product Name' } },
  })
  assert.strictEqual(verifies(appPath), true)
})

test('the afterPack step does nothing on other platforms', async () => {
  await signAdhocAfterPack({
    electronPlatformName: 'linux',
    appOutDir: '/does/not/exist',
    packager: { appInfo: { productFilename: 'x' } },
  })
})

test('adhocSign refuses a path that does not exist', () => {
  const calls = []
  assert.throws(() => adhocSign('/does/not/exist.app', (f, a) => calls.push([f, a])), /does not exist/)
  assert.strictEqual(calls.length, 0)
})
