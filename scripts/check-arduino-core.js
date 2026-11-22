/* afterPack step: make sure that the app holds the arduino:avr core.
 *
 * electron-builder only logs a note when an extraResources folder does not
 * exist. Without this step, a build with no core passes, and the app cannot
 * compile for the simulator with no network.
 *
 * Set IOLOOM_ALLOW_NO_ARDUINO_CORE=1 to package with no core, for example for
 * a local test build of another platform.
 */

const fs = require('fs')
const path = require('path')

/** The resources folder of a packed app. */
function resourcesDir(context) {
  const { electronPlatformName, appOutDir, packager } = context
  if (electronPlatformName === 'darwin' || electronPlatformName === 'mas') {
    return path.join(appOutDir, `${packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
  }
  return path.join(appOutDir, 'resources')
}

/** True when the data folder holds a complete install of arduino:avr. */
function hasCore(dataDir) {
  const platformDir = path.join(dataDir, 'packages', 'arduino', 'hardware', 'avr')
  if (!fs.existsSync(platformDir)) return false
  return fs.readdirSync(platformDir).some((v) => fs.existsSync(path.join(platformDir, v, 'installed.json')))
}

async function checkArduinoCore(context, env = process.env) {
  const dataDir = path.join(resourcesDir(context), 'arduino-core', 'data')
  if (hasCore(dataDir)) {
    console.log(`check-arduino-core: found arduino:avr in ${dataDir}`)
    return
  }
  const message =
    `check-arduino-core: the app has no arduino:avr core in ${dataDir}. ` +
    'Run node scripts/download-arduino-core.js --arch <arch> before you package.'
  if (env.IOLOOM_ALLOW_NO_ARDUINO_CORE === '1') {
    console.warn(`${message} IOLOOM_ALLOW_NO_ARDUINO_CORE=1, so the build continues.`)
    return
  }
  throw new Error(message)
}

exports.default = checkArduinoCore
exports.resourcesDir = resourcesDir
