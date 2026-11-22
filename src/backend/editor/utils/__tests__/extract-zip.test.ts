import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import JSZip from 'jszip'
import { tmpdir } from 'os'
import { join } from 'path'

import { extractZip } from '../extract-zip'

describe('extractZip', () => {
  let root: string
  let target: string

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'extract-zip-'))
    target = join(root, 'out')
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const writeArchive = async (build: (zip: JSZip) => void): Promise<string> => {
    const zip = new JSZip()
    build(zip)
    const path = join(root, 'in.zip')
    writeFileSync(path, await zip.generateAsync({ type: 'uint8array', platform: 'UNIX' }))
    return path
  }

  it('writes the files and folders of the archive', async () => {
    const archive = await writeArchive((zip) => {
      zip.file('manifest.json', '{"id":"pkg"}')
      zip.file('lib/core.c', 'int x;')
      zip.folder('empty')
    })

    await extractZip(archive, target)

    expect(readFileSync(join(target, 'manifest.json'), 'utf8')).toBe('{"id":"pkg"}')
    expect(readFileSync(join(target, 'lib', 'core.c'), 'utf8')).toBe('int x;')
    expect(readdirSync(join(target, 'empty'))).toEqual([])
  })

  it('writes nothing from an archive with a traversal entry', async () => {
    const archive = await writeArchive((zip) => {
      zip.file('ok.txt', 'ok')
      zip.file('../escaped.txt', 'evil', { createFolders: false })
    })

    await expect(extractZip(archive, target)).rejects.toThrow(/outside the target folder/)
    expect(existsSync(join(root, 'escaped.txt'))).toBe(false)
    expect(existsSync(join(target, 'ok.txt'))).toBe(false)
  })

  it('writes nothing from an archive with a symbolic link', async () => {
    const archive = await writeArchive((zip) => {
      zip.file('link', '/etc', { unixPermissions: 0o120777 })
    })

    await expect(extractZip(archive, target)).rejects.toThrow(/symbolic link/)
    expect(existsSync(join(target, 'link'))).toBe(false)
  })
})
