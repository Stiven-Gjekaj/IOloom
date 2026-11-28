import { EDITOR_CAPABILITIES } from '@root/middleware/shared/ports/platform-capabilities'
import { RUNTIME_V4_CAPABILITIES } from '@root/middleware/shared/utils/target-capabilities/presets'

import { courseModePlatformCapabilities, courseModeTargetCapabilities } from '../course-mode'

describe('course mode', () => {
  it('changes nothing while it is off', () => {
    expect(courseModePlatformCapabilities(EDITOR_CAPABILITIES, false)).toBe(EDITOR_CAPABILITIES)
    expect(courseModeTargetCapabilities(RUNTIME_V4_CAPABILITIES, false)).toBe(RUNTIME_V4_CAPABILITIES)
  })

  it('hides the cloud, version control, the AI assistant and board packages', () => {
    const platform = { ...EDITOR_CAPABILITIES, hasVersionControl: true, hasBranchMerge: true, hasAIAssistant: true }
    const shown = courseModePlatformCapabilities(platform, true)
    expect(shown).toMatchObject({
      hasEdgeAccount: false,
      requiresEdgeAccount: false,
      hasVersionControl: false,
      hasBranchMerge: false,
      hasAIAssistant: false,
      hasPackageManager: false,
      hasEthercat: false,
    })
    // The rest of the editor stays as it is.
    expect(shown.hasLocalSerialPorts).toBe(platform.hasLocalSerialPorts)
    expect(shown.hasInProcessSimulator).toBe(platform.hasInProcessSimulator)
  })

  it('hides Modbus, EtherCAT, OPC UA and S7 on the target, and keeps the rest', () => {
    const target = {
      ...RUNTIME_V4_CAPABILITIES,
      modbusTcpRemote: true,
      ethercat: true,
      modbusTcpServer: true,
      modbusRtuServer: true,
      opcuaServer: true,
      s7Server: true,
    }
    const shown = courseModeTargetCapabilities(target, true)
    expect(shown).toMatchObject({
      modbusTcpRemote: false,
      ethercat: false,
      modbusTcpServer: false,
      modbusRtuServer: false,
      opcuaServer: false,
      s7Server: false,
    })
    expect(shown.plcStateControl).toBe(target.plcStateControl)
    expect(shown.debuggerTransports).toEqual(target.debuggerTransports)
  })
})
