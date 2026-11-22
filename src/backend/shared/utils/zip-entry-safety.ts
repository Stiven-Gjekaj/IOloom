/**
 * Safety check for the entries of a zip archive before extraction.
 *
 * An archive comes from outside the app (a `.vpp` package, for example), so
 * each entry name is untrusted. This check refuses two attacks:
 *
 *   Path traversal: an entry name such as `../../evil` or `/etc/evil` writes
 *   outside the target folder.
 *
 *   Symbolic links: an entry that is a link points outside the target folder.
 *   A later entry with the same name then writes through the link.
 *
 * The check is pure. The platform code does the file writes.
 */

/** The fields of a zip entry that the check reads. */
interface ZipEntryInfo {
  name: string
  dir: boolean
  /** The Unix mode of the entry, or null when the archive has none. JSZip can give an octal string. */
  unixPermissions: number | string | null
}

/** One entry to write, with its path relative to the target folder. */
interface PlannedEntry {
  /** Path segments under the target folder. Join them with the path separator of the platform. */
  segments: string[]
  dir: boolean
}

const S_IFMT = 0o170000
const S_IFLNK = 0o120000

const isSymbolicLink = (entry: ZipEntryInfo): boolean => {
  const mode = typeof entry.unixPermissions === 'string' ? parseInt(entry.unixPermissions, 8) : entry.unixPermissions
  return mode !== null && !Number.isNaN(mode) && (mode & S_IFMT) === S_IFLNK
}

/**
 * Returns the entries to write, in archive order. Throws on the first unsafe
 * entry, so the caller writes nothing from an archive that holds one.
 */
const planZipExtraction = (entries: ZipEntryInfo[]): PlannedEntry[] =>
  entries.map((entry) => {
    if (isSymbolicLink(entry)) {
      throw new Error(`The archive entry ${JSON.stringify(entry.name)} is a symbolic link. Links are not permitted.`)
    }
    // A zip entry name uses `/`. Treat `\` as a separator too, so a Windows path cannot hide a `..`.
    const name = entry.name.replace(/\\/g, '/')
    if (name.startsWith('/') || /^[a-zA-Z]:/.test(name) || name.includes('\0')) {
      throw new Error(`The archive entry ${JSON.stringify(entry.name)} has an absolute path.`)
    }
    const segments = name.split('/').filter((segment) => segment !== '' && segment !== '.')
    if (segments.includes('..')) {
      throw new Error(`The archive entry ${JSON.stringify(entry.name)} goes outside the target folder.`)
    }
    if (segments.length === 0 && !entry.dir) {
      throw new Error(`The archive entry ${JSON.stringify(entry.name)} has no file name.`)
    }
    return { segments, dir: entry.dir }
  })

export type { PlannedEntry, ZipEntryInfo }
export { planZipExtraction }
