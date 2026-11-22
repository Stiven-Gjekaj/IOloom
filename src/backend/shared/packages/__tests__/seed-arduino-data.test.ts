import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, stat, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'

import type { ArduinoSeedMechanisms } from '../../../../middleware/shared/ports/arduino-seed-mechanisms'
import { hasSimulatorCore, seedArduinoData } from '../seed-arduino-data'

/** The mechanisms on the real disk, as the editor supplies them. */
const disk: ArduinoSeedMechanisms = {
  join,
  exists: async (path) => {
    try {
      await stat(path)
      return true
    } catch {
      return false
    }
  },
  list: (dir) => readdir(dir),
  copyTree: (source, destination, { overwrite, skip }) =>
    cp(source, destination, {
      recursive: true,
      force: overwrite,
      errorOnExist: false,
      filter: (path) => path !== skip,
    }),
  remove: (path) => rm(path, { recursive: true, force: true }),
  rename,
}

async function put(path: string, content = ''): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

const AVR = ['packages', 'arduino', 'hardware', 'avr']

/** A data folder as arduino-cli leaves it after `core install arduino:avr`. */
async function makeBundle(root: string): Promise<string> {
  const data = join(root, 'bundle', 'data')
  await put(join(data, 'package_index.json'), 'bundled index')
  await put(join(data, ...AVR, '1.8.8', 'installed.json'), '{}')
  await put(join(data, ...AVR, '1.8.8', 'platform.txt'), 'name=Arduino AVR Boards')
  await put(join(data, 'packages', 'arduino', 'tools', 'avr-gcc', '7.3.0', 'bin', 'avr-gcc'), 'compiler')
  await put(join(data, 'packages', 'builtin', 'tools', 'serial-discovery', '1.5.2', 'serial-discovery'), 'tool')
  return data
}

describe('seedArduinoData', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'seed-arduino-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('copies the bundled core into an empty data folder', async () => {
    const bundle = await makeBundle(root)
    const managed = join(root, 'managed', 'data')

    expect(await hasSimulatorCore(disk, managed)).toBe(false)
    expect(await seedArduinoData(disk, bundle, managed)).toBe('seeded')

    expect(await hasSimulatorCore(disk, managed)).toBe(true)
    expect(await readFile(join(managed, ...AVR, '1.8.8', 'platform.txt'), 'utf-8')).toBe('name=Arduino AVR Boards')
    expect(
      await readFile(join(managed, 'packages', 'arduino', 'tools', 'avr-gcc', '7.3.0', 'bin', 'avr-gcc'), 'utf-8'),
    ).toBe('compiler')
    expect(await disk.exists(join(managed, 'packages', 'builtin', 'tools', 'serial-discovery', '1.5.2'))).toBe(true)
    expect(await disk.exists(join(managed, ...AVR) + '.partial')).toBe(false)
  })

  it('keeps the files that the user already has', async () => {
    const bundle = await makeBundle(root)
    const managed = join(root, 'managed', 'data')
    await put(join(managed, 'package_index.json'), 'index of the user')
    await put(join(managed, 'packages', 'esp32', 'hardware', 'esp32', '3.0.0', 'installed.json'), '{}')

    expect(await seedArduinoData(disk, bundle, managed)).toBe('seeded')

    expect(await readFile(join(managed, 'package_index.json'), 'utf-8')).toBe('index of the user')
    expect(await disk.exists(join(managed, 'packages', 'esp32', 'hardware', 'esp32', '3.0.0', 'installed.json'))).toBe(
      true,
    )
  })

  it('does nothing when the data folder has the core', async () => {
    const bundle = await makeBundle(root)
    const managed = join(root, 'managed', 'data')
    await put(join(managed, ...AVR, '1.8.6', 'installed.json'), '{}')

    expect(await seedArduinoData(disk, bundle, managed)).toBe('present')

    expect(await readdir(join(managed, ...AVR))).toEqual(['1.8.6'])
    expect(await disk.exists(join(managed, 'package_index.json'))).toBe(false)
  })

  it('replaces a core that has no installed.json, because its copy did not end', async () => {
    const bundle = await makeBundle(root)
    const managed = join(root, 'managed', 'data')
    await put(join(managed, ...AVR, '1.8.8', 'platform.txt'), 'half a copy')
    await put(join(managed, ...AVR) + '.partial/1.8.8/platform.txt', 'old partial copy')

    expect(await seedArduinoData(disk, bundle, managed)).toBe('seeded')

    expect(await readFile(join(managed, ...AVR, '1.8.8', 'platform.txt'), 'utf-8')).toBe('name=Arduino AVR Boards')
    expect(await disk.exists(join(managed, ...AVR) + '.partial')).toBe(false)
  })

  it('does nothing when the installer has no bundled core', async () => {
    const managed = join(root, 'managed', 'data')

    expect(await seedArduinoData(disk, join(root, 'no', 'bundle'), managed)).toBe('no-bundle')

    expect(await disk.exists(managed)).toBe(false)
  })
})
