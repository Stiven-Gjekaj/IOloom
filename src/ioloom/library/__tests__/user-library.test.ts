/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { UserLibrary } from '../user-library'

// Each test builds its own folders and elements. The tests do not read the QElectroTech collection.
const elmt = (uuid: string, name: string, body = '<line x1="0" y1="0" x2="10" y2="0"/>'): string =>
  `<definition type="element" width="20" height="20" hotspot_x="10" hotspot_y="10">` +
  `<uuid uuid="${uuid}"/><names><name lang="en">${name}</name></names><description>${body}</description></definition>`

let work: string
let lib: UserLibrary

const put = (path: string, text: string): string => {
  const p = join(work, path)
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, text)
  return p
}

beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'ioloom-lib-'))
  lib = new UserLibrary(join(work, 'library'))
})

afterEach(() => {
  rmSync(work, { recursive: true, force: true })
})

describe('UserLibrary.list', () => {
  it('makes the library folder and gives an empty list', async () => {
    expect(await lib.list()).toEqual({ entries: [], errors: [] })
  })

  it('reads each element under the library, and reports each file that does not load', async () => {
    put('library/relays/k.elmt', elmt('{k}', 'Contactor'))
    put('library/lamp.ELMT', elmt('{l}', 'Lamp'))
    put('library/bad.elmt', '<definition type="border"/>')
    put('library/notes.txt', 'not an element')
    const r = await lib.list()
    expect(r.entries.map((e) => [e.id, e.names.en, e.category])).toEqual(
      expect.arrayContaining([
        ['relays/k.elmt', 'Contactor', ['relays']],
        ['lamp.ELMT', 'Lamp', []],
      ]),
    )
    expect(r.entries).toHaveLength(2)
    expect(r.errors).toEqual([{ path: 'bad.elmt', message: expect.stringContaining('"border"') }])
  })

  it('does not follow a symbolic link to a folder', async () => {
    put('outside/x.elmt', elmt('{x}', 'X'))
    mkdirSync(join(work, 'library'), { recursive: true })
    symlinkSync(join(work, 'outside'), join(work, 'library', 'link'))
    expect((await lib.list()).entries).toEqual([])
  })
})

describe('UserLibrary.importFile', () => {
  it('copies a valid file into the top folder of the library', async () => {
    const src = put('in/coil.elmt', elmt('{c}', 'Coil'))
    expect(await lib.importFile(src)).toEqual({ imported: ['coil.elmt'], unchanged: [], failed: [] })
    expect(readFileSync(join(work, 'library/coil.elmt'), 'utf8')).toBe(elmt('{c}', 'Coil'))
  })

  it('refuses a file that is not a valid element, with the reason', async () => {
    const src = put('in/bad.elmt', '<definition type="element">')
    const r = await lib.importFile(src)
    expect(r.imported).toEqual([])
    expect(r.failed).toEqual([{ path: src, message: expect.stringContaining('not valid') }])
    expect((await lib.list()).entries).toEqual([])
  })

  it('reports a file that does not exist', async () => {
    const r = await lib.importFile(join(work, 'nothing.elmt'))
    expect(r.failed[0].message).toMatch(/ENOENT/)
  })

  it('keeps the library unchanged for the same file a second time', async () => {
    const src = put('in/coil.elmt', elmt('{c}', 'Coil'))
    await lib.importFile(src)
    expect(await lib.importFile(src)).toEqual({ imported: [], unchanged: ['coil.elmt'], failed: [] })
  })

  it('replaces a file that has the same UUID and a different content', async () => {
    await lib.importFile(put('in/coil.elmt', elmt('{c}', 'Coil')))
    const r = await lib.importFile(put('in2/coil.elmt', elmt('{c}', 'Coil, new')))
    expect(r.imported).toEqual(['coil.elmt'])
    expect(readFileSync(join(work, 'library/coil.elmt'), 'utf8')).toContain('Coil, new')
  })

  it('gives the next free name to a different element with the same file name', async () => {
    await lib.importFile(put('a/coil.elmt', elmt('{a}', 'A')))
    expect((await lib.importFile(put('b/coil.elmt', elmt('{b}', 'B')))).imported).toEqual(['coil-2.elmt'])
    expect((await lib.importFile(put('c/coil.elmt', elmt('{c}', 'C')))).imported).toEqual(['coil-3.elmt'])
    expect((await lib.importFile(put('d/coil.elmt', elmt('{b}', 'B')))).unchanged).toEqual(['coil-2.elmt'])
  })
})

describe('UserLibrary.importFolder', () => {
  it('copies each valid file, with its folders, into a folder with the name of the source', async () => {
    put('kit/relays/k.elmt', elmt('{k}', 'K'))
    put('kit/relays/deep/k2.elmt', elmt('{k2}', 'K2'))
    put('kit/lamp.elmt', elmt('{l}', 'L'))
    put('kit/bad.elmt', 'garbage')
    put('kit/readme.md', '# not an element')
    const r = await lib.importFolder(join(work, 'kit'))
    expect(r.imported).toEqual(['kit/lamp.elmt', 'kit/relays/deep/k2.elmt', 'kit/relays/k.elmt'])
    expect(r.failed).toEqual([{ path: join(work, 'kit/bad.elmt'), message: expect.any(String) }])
    expect((await lib.list()).entries.map((e) => e.id).sort()).toEqual(r.imported)
  })

  it('gives an empty result for a folder with no element', async () => {
    mkdirSync(join(work, 'empty'))
    expect(await lib.importFolder(join(work, 'empty'))).toEqual({ imported: [], unchanged: [], failed: [] })
  })
})

describe('UserLibrary.svg', () => {
  it('draws an element of the library with no terminal dots, at scale 1', async () => {
    await lib.importFile(
      put('in/t.elmt', elmt('{t}', 'T', '<line x1="0" y1="0" x2="5" y2="0"/><terminal x="0" y="0" orientation="n"/>')),
    )
    const svg = await lib.svg('t.elmt')
    expect(svg).toMatch(/^<svg .*viewBox="-10 -10 20 20" width="20" height="20"/)
    expect(svg).toContain('<line')
    expect(svg).not.toContain('<circle')
  })

  it('refuses a path that goes out of the library', async () => {
    put('secret.elmt', elmt('{s}', 'S'))
    await expect(lib.svg('../secret.elmt')).rejects.toThrow('is not a symbol of the library')
    await expect(lib.svg('/etc/passwd')).rejects.toThrow('is not a symbol of the library')
  })

  it('refuses a file that is not an .elmt file', async () => {
    put('library/x.txt', 'x')
    await expect(lib.svg('x.txt')).rejects.toThrow('is not a symbol of the library')
  })
})
