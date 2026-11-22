/* electron-builder afterPack hook. electron-builder accepts one hook only, so
 * this file runs the steps in order. The order is important: the ad hoc
 * signature must come after each change to the bundle.
 */

const checkArduinoCore = require('./check-arduino-core').default
const injectLocalNetworkUsage = require('./mac-inject-local-network-usage').default
const signAdhoc = require('./mac-adhoc-sign').default

async function afterPack(context) {
  await checkArduinoCore(context)
  await injectLocalNetworkUsage(context)
  await signAdhoc(context)
}

exports.default = afterPack
