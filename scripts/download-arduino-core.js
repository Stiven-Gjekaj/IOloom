/* Download the Arduino core of the simulator (arduino:avr) for the installer.
 *
 * The simulator compiles with arduino:avr. Upstream installs this core at the
 * first start, and that needs the network. IOloom must compile with no
 * network, so the installer holds a copy of the arduino-cli data folder with
 * the core in it. At start, the editor copies this folder into its own
 * arduino-cli data folder when the core is not there.
 *
 * The tools in the core are different for each operating system and
 * architecture. arduino-cli installs the tools for the system that it runs on.
 * Thus this script runs the arduino-cli of the target architecture:
 * resources/bin/<platform>/<arch>/arduino-cli. On macOS arm64, the x64 binary
 * runs under Rosetta.
 *
 * The Windows arm64 build runs on an x64 runner, which cannot start the arm64
 * arduino-cli. For it, use --cli-arch x64: Windows 11 on arm64 runs the x64
 * tools in emulation.
 *
 * Usage:
 *   node scripts/download-arduino-core.js [--arch arm64|x64] [--cli-arch arm64|x64] [--force]
 *
 * The result goes into resources/arduino-core/<platform>/<arch>/data.
 * The version comes from binary-versions.json ("arduino-avr").
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')
const CORE_ID = 'arduino:avr'

/** The folder that holds the copy of the data folder for one target. */
function seedDataDir(root, platform, arch) {
  return path.join(root, 'resources', 'arduino-core', platform, arch, 'data')
}

/** The folder in which arduino-cli installs the platform of the given version. */
function installedCoreDir(dataDir, version) {
  return path.join(dataDir, 'packages', 'arduino', 'hardware', 'avr', version)
}

/** True when the data folder holds the core of the given version. */
function hasCore(dataDir, version) {
  return fs.existsSync(path.join(installedCoreDir(dataDir, version), 'installed.json'))
}

/** An arduino-cli configuration that keeps all state inside dataDir. */
function cliConfig(dataDir) {
  const quote = (value) => `'${value.replaceAll("'", "''")}'`
  return `directories:
  data: ${quote(dataDir)}
  user: ${quote(path.join(path.dirname(dataDir), 'user'))}
`
}

/** Reads the pinned version of the core from binary-versions.json. */
function pinnedVersion(root) {
  const versions = JSON.parse(fs.readFileSync(path.join(root, 'binary-versions.json'), 'utf-8'))
  const version = versions['arduino-avr']?.version
  if (!version) throw new Error('binary-versions.json has no "arduino-avr" version')
  return version
}

function parseArgs(argv) {
  const args = { arch: process.arch, cliArch: undefined, force: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--force') args.force = true
    else if (argv[i] === '--arch') args.arch = argv[++i]
    else if (argv[i] === '--cli-arch') args.cliArch = argv[++i]
    else throw new Error(`unknown argument: ${argv[i]}`)
  }
  args.cliArch ??= args.arch
  for (const [flag, value] of [
    ['--arch', args.arch],
    ['--cli-arch', args.cliArch],
  ]) {
    if (value !== 'arm64' && value !== 'x64') throw new Error(`${flag} must be arm64 or x64, not ${value}`)
  }
  return args
}

/**
 * Installs the core into the seed folder of one target. Does nothing when the
 * pinned version is there and force is false. Returns the data folder.
 */
function downloadArduinoCore({
  root = ROOT_DIR,
  platform = process.platform,
  arch,
  cliArch = arch,
  force = false,
  run,
}) {
  const version = pinnedVersion(root)
  const dataDir = seedDataDir(root, platform, arch)
  if (!force && hasCore(dataDir, version)) {
    console.log(`${CORE_ID}@${version} is already in ${dataDir}`)
    return dataDir
  }

  const seedRoot = path.dirname(dataDir)
  fs.rmSync(seedRoot, { recursive: true, force: true })
  fs.mkdirSync(dataDir, { recursive: true })

  const exe = platform === 'win32' ? 'arduino-cli.exe' : 'arduino-cli'
  const cli = path.join(root, 'resources', 'bin', platform, cliArch, exe)
  if (!fs.existsSync(cli)) throw new Error(`arduino-cli not found at ${cli}`)

  const configDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arduino-core-'))
  const config = path.join(configDir, 'arduino-cli.yaml')
  fs.writeFileSync(config, cliConfig(dataDir))
  const exec = run ?? ((file, args) => execFileSync(file, args, { stdio: 'inherit' }))
  try {
    exec(cli, ['--config-file', config, 'core', 'update-index'])
    exec(cli, ['--config-file', config, 'core', 'install', `${CORE_ID}@${version}`])
  } finally {
    fs.rmSync(configDir, { recursive: true, force: true })
  }

  // The archives in staging are copies of what is installed. The editor does
  // not need them, and they add about 58 MB.
  fs.rmSync(path.join(dataDir, 'staging'), { recursive: true, force: true })
  fs.rmSync(path.join(dataDir, 'tmp'), { recursive: true, force: true })
  fs.rmSync(path.join(seedRoot, 'user'), { recursive: true, force: true })
  // inventory.yaml holds an installation id and a secret of this arduino-cli.
  // Each install of the editor must make its own, so it does not go into the
  // installer.
  fs.rmSync(path.join(dataDir, 'inventory.yaml'), { force: true })

  if (!hasCore(dataDir, version)) throw new Error(`arduino-cli did not install ${CORE_ID}@${version} into ${dataDir}`)
  console.log(`installed ${CORE_ID}@${version} into ${dataDir}`)
  return dataDir
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2))
  downloadArduinoCore({ arch: args.arch, cliArch: args.cliArch, force: args.force })
}

module.exports = { cliConfig, downloadArduinoCore, hasCore, installedCoreDir, parseArgs, seedDataDir }
