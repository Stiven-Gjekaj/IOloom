/**
 * Course mode (roadmap Q1): the editor hides the features that the automation course
 * does not use. These are the cloud (the Autonomy Edge account, cloud projects, version
 * control and the AI assistant, which runs through the account), board packages, Modbus,
 * EtherCAT, OPC UA and S7.
 *
 * Course mode hides screens only. A project keeps the settings it has, and the build
 * reads the real target capabilities, so the project builds the same way in both modes.
 */
import type { PlatformCapabilities } from '../../middleware/shared/ports/platform-capabilities'
import type { TargetCapabilities } from '../../middleware/shared/utils/target-capabilities'

/** The platform capabilities that the UI sees. */
export function courseModePlatformCapabilities(
  capabilities: PlatformCapabilities,
  courseMode: boolean,
): PlatformCapabilities {
  if (!courseMode) return capabilities
  return {
    ...capabilities,
    hasEdgeAccount: false,
    requiresEdgeAccount: false,
    hasVersionControl: false,
    hasBranchMerge: false,
    hasAIAssistant: false,
    hasPackageManager: false,
    hasEthercat: false,
  }
}

/** The target capabilities that the UI sees. The build does not use this. */
export function courseModeTargetCapabilities(
  capabilities: TargetCapabilities,
  courseMode: boolean,
): TargetCapabilities {
  if (!courseMode) return capabilities
  return {
    ...capabilities,
    modbusTcpRemote: false,
    ethercat: false,
    modbusTcpServer: false,
    modbusRtuServer: false,
    opcuaServer: false,
    s7Server: false,
  }
}
