// The user symbol library: a folder of `.elmt` files on the disk.
// This file runs in the Electron main process. It uses Node, but not Electron.
import { createHash } from 'node:crypto'
import { lstat, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

import { readElmt } from '../qet/read-elmt'
import { renderSvg } from '../qet/render-svg'
import type { FileError, ImportResult, ListResult } from './api'
import { type SymbolEntry, toEntry } from './library-index'

const isElmt = (name: string): boolean => name.toLowerCase().endsWith('.elmt')
const toPosix = (p: string): string => p.split(sep).join('/')
const message = (e: unknown): string => (e instanceof Error ? e.message : String(e))
const digest = (s: string): string => createHash('sha256').update(s).digest('hex')

// Finds the .elmt files under a folder. It does not follow symbolic links, so a loop cannot occur.
async function findElmt(dir: string): Promise<string[]> {
  const found: string[] = []
  const walk = async (d: string): Promise<void> => {
    const names = (await readdir(d)).sort()
    for (const name of names) {
      const p = join(d, name)
      const st = await lstat(p)
      if (st.isDirectory()) await walk(p)
      else if (st.isFile() && isElmt(name)) found.push(p)
    }
  }
  await walk(dir)
  return found
}

export class UserLibrary {
  readonly root: string

  constructor(root: string) {
    this.root = resolve(root)
  }

  /** Gives the absolute path of a library path. Refuses a path that goes out of the library. */
  private pathOf(id: string): string {
    const p = resolve(this.root, ...id.split('/'))
    if (!p.startsWith(this.root + sep) || !isElmt(p)) throw new Error(`"${id}" is not a symbol of the library.`)
    return p
  }

  /** Reads each element of the library. */
  async list(): Promise<ListResult> {
    await mkdir(this.root, { recursive: true })
    const entries: SymbolEntry[] = []
    const errors: FileError[] = []
    for (const file of await findElmt(this.root)) {
      const id = toPosix(relative(this.root, file))
      try {
        entries.push(toEntry(id, readElmt(await readFile(file, 'utf8'))))
      } catch (e) {
        errors.push({ path: id, message: message(e) })
      }
    }
    return { entries, errors }
  }

  /** Draws one element of the library as SVG. */
  async svg(id: string): Promise<string> {
    return renderSvg(readElmt(await readFile(this.pathOf(id), 'utf8')), { showTerminals: false, scale: 1 })
  }

  /** Copies one `.elmt` file into the top folder of the library. */
  async importFile(file: string): Promise<ImportResult> {
    const result: ImportResult = { imported: [], unchanged: [], failed: [] }
    await this.add(file, basename(file), result)
    return result
  }

  /** Copies each `.elmt` file under a folder into the library, in a folder with the same name. */
  async importFolder(dir: string): Promise<ImportResult> {
    const result: ImportResult = { imported: [], unchanged: [], failed: [] }
    const top = basename(resolve(dir))
    for (const file of await findElmt(dir)) {
      await this.add(file, `${top}/${toPosix(relative(dir, file))}`, result)
    }
    return result
  }

  // Adds one file at a library path. A valid file goes in, and an invalid file goes into `failed`.
  // If a different element is already at that path, the new file gets the next free name.
  // If the same element (the same UUID) is there, the new file replaces it.
  private async add(file: string, id: string, result: ImportResult): Promise<void> {
    let xml: string
    let uuid: string
    try {
      xml = await readFile(file, 'utf8')
      uuid = readElmt(xml).uuid
    } catch (e) {
      result.failed.push({ path: file, message: message(e) })
      return
    }
    const stem = id.replace(/\.elmt$/i, '')
    for (let n = 1; ; n++) {
      const candidate = n === 1 ? `${stem}.elmt` : `${stem}-${n}.elmt`
      const target = this.pathOf(candidate)
      const old = await readFile(target, 'utf8').catch(() => null)
      if (old !== null && digest(old) === digest(xml)) {
        result.unchanged.push(candidate)
        return
      }
      const oldUuid = old === null ? null : safeUuid(old)
      if (old === null || (uuid !== '' && oldUuid === uuid)) {
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, xml, 'utf8')
        result.imported.push(candidate)
        return
      }
    }
  }
}

const safeUuid = (xml: string): string | null => {
  try {
    return readElmt(xml).uuid
  } catch {
    return null
  }
}
