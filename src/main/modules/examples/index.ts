/**
 * The example projects that come with the editor (upstream issue 245). The description of
 * an example and the check of a folder name are in the shared module; this module reads
 * the folders and copies one.
 *
 * An example opens as a copy in the temporary folder: the app's resources are read-only in
 * a packaged app, and a build writes into the project folder.
 *
 * IPC channels:
 *   - examples:list (invoke): each example folder with its project.json and main program text
 *   - examples:open-copy (invoke): copies one example and returns the path of the copy
 */

import { cpSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { app, ipcMain } from 'electron'

import { type ExampleProjectEntry, isExampleFolder } from '../../../backend/shared/examples/example-projects'

const examplesRoot = (): string =>
  app.isPackaged ? join(process.resourcesPath, 'examples') : join(process.cwd(), 'resources', 'examples')

const readText = (path: string): string => {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

const readEntries = (): ExampleProjectEntry[] => {
  const root = examplesRoot()
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      folder: entry.name,
      projectJson: readText(join(root, entry.name, 'project.json')),
      mainSource: readText(join(root, entry.name, 'pous', 'programs', 'main.st')),
    }))
}

export function registerExampleProjects(): void {
  ipcMain.handle('examples:list', () => readEntries())
  ipcMain.handle('examples:open-copy', (_event, folder: unknown) => {
    if (typeof folder !== 'string' || !isExampleFolder(folder, readEntries())) {
      return { success: false, error: 'There is no example with this name.' }
    }
    const target = join(app.getPath('temp'), 'ioloom-examples', `${folder}-${Date.now()}`)
    try {
      cpSync(join(examplesRoot(), folder), target, { recursive: true })
      return { success: true, path: target }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
