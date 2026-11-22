import type { ArduinoSeedMechanisms } from '../../../middleware/shared/ports/arduino-seed-mechanisms'

/**
 * The installer holds a copy of an arduino-cli data folder with the simulator
 * core (arduino:avr) in it. `scripts/download-arduino-core.js` makes it. This
 * module copies it into the data folder of the editor, so that a simulator
 * build works with no network.
 */

/** Where the core of the simulator goes in an arduino-cli data folder. */
function avrPlatformDir(fs: ArduinoSeedMechanisms, dataDir: string): string {
  return fs.join(dataDir, 'packages', 'arduino', 'hardware', 'avr')
}

/**
 * True when the data folder holds a complete install of arduino:avr.
 * arduino-cli writes `installed.json` when an install is complete.
 */
export async function hasSimulatorCore(fs: ArduinoSeedMechanisms, dataDir: string): Promise<boolean> {
  const platformDir = avrPlatformDir(fs, dataDir)
  let versions: string[]
  try {
    versions = await fs.list(platformDir)
  } catch {
    return false
  }
  for (const version of versions) {
    if (await fs.exists(fs.join(platformDir, version, 'installed.json'))) return true
  }
  return false
}

export type SeedResult = 'present' | 'no-bundle' | 'seeded'

/**
 * Copies the bundled data folder into the managed data folder when the
 * managed folder has no arduino:avr core.
 *
 * The copy does not replace a file that is already there. Thus an index or a
 * tool that the user installed stays as it is.
 *
 * The platform folder comes last, through a temporary name and a rename. If
 * the copy stops before its end, the core is not there, and the next start
 * copies it again.
 */
export async function seedArduinoData(
  fs: ArduinoSeedMechanisms,
  bundledDataDir: string,
  managedDataDir: string,
): Promise<SeedResult> {
  if (await hasSimulatorCore(fs, managedDataDir)) return 'present'
  if (!(await hasSimulatorCore(fs, bundledDataDir))) return 'no-bundle'

  const bundledPlatform = avrPlatformDir(fs, bundledDataDir)
  await fs.copyTree(bundledDataDir, managedDataDir, { overwrite: false, skip: bundledPlatform })

  const managedPlatform = avrPlatformDir(fs, managedDataDir)
  const partial = `${managedPlatform}.partial`
  await fs.remove(partial)
  await fs.copyTree(bundledPlatform, partial, { overwrite: true })
  await fs.remove(managedPlatform)
  await fs.rename(partial, managedPlatform)
  return 'seeded'
}
