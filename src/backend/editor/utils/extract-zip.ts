import { mkdir, readFile, writeFile } from 'fs/promises'
import JSZip from 'jszip'
import { dirname, join } from 'path'

import { planZipExtraction } from '../../shared/utils/zip-entry-safety'

/**
 * Extracts a zip archive into a folder.
 *
 * The shared check `planZipExtraction` refuses each unsafe entry before this
 * function writes a file. This function only reads the archive and writes the
 * planned entries to disk.
 */
export async function extractZip(archivePath: string, targetDir: string): Promise<void> {
  const zip = await JSZip.loadAsync(await readFile(archivePath))
  const entries = Object.values(zip.files)
  // JSZip rewrites an unsafe name on load. Check the name that the archive holds.
  const plan = planZipExtraction(
    entries.map((entry) => ({
      name: entry.unsafeOriginalName ?? entry.name,
      dir: entry.dir,
      unixPermissions: entry.unixPermissions,
    })),
  )

  for (let index = 0; index < entries.length; index++) {
    const target = join(targetDir, ...plan[index].segments)
    if (plan[index].dir) {
      await mkdir(target, { recursive: true })
      continue
    }
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, await entries[index].async('uint8array'))
  }
}
