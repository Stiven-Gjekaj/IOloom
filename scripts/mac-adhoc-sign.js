/* afterPack step, darwin only: give the .app a new ad hoc signature.
 *
 * mac-inject-local-network-usage.js writes a new LC_UUID into the main
 * executable and edits Info.plist files. These changes make the ad hoc
 * signature of Electron incorrect. On Apple Silicon, macOS stops a binary with
 * an incorrect signature (signal 9). A build with no certificate has no later
 * signing step, so this step signs the bundle again.
 *
 * A build with a certificate signs the bundle after afterPack with --force.
 * That signature replaces the ad hoc signature, so this step is safe for it.
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CODESIGN = '/usr/bin/codesign'

/**
 * Signs the bundle ad hoc, then makes sure that the signature is correct.
 * Throws when codesign fails or when the result does not verify.
 *
 * @param {string} appPath path of the .app bundle
 * @param {(file: string, args: string[]) => void} [run] runs a command
 */
function adhocSign(appPath, run = (file, args) => execFileSync(file, args, { stdio: 'inherit' })) {
  if (!fs.existsSync(appPath)) {
    throw new Error(`mac-adhoc-sign: ${appPath} does not exist`)
  }
  run(CODESIGN, ['--force', '--deep', '--sign', '-', appPath])
  run(CODESIGN, ['--verify', '--deep', '--strict', appPath])
}

/**
 * electron-builder afterPack step. No-op on other platforms.
 *
 * @param {{ electronPlatformName: string, appOutDir: string, packager: any }} context
 */
async function signAdhocAfterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context
  if (electronPlatformName !== 'darwin') {
    return
  }
  const appPath = path.join(appOutDir, `${packager.appInfo.productFilename}.app`)
  adhocSign(appPath)
  console.log(`mac-adhoc-sign: signed ${appPath} ad hoc`)
}

exports.default = signAdhocAfterPack
exports.adhocSign = adhocSign
