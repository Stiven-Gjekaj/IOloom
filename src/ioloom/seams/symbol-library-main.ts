// Seam: the IPC handlers of the user symbol library, in the Electron main process.
import type { BrowserWindow, Dialog, IpcMain } from 'electron'

import { type ImportResult, SYMBOL_CHANNELS } from '../library/api'
import { UserLibrary } from '../library/user-library'

export interface SymbolLibraryMainDeps {
  ipcMain: Pick<IpcMain, 'handle' | 'removeHandler'>
  dialog: Pick<Dialog, 'showOpenDialog'>
  /** Gives the window that owns the file dialog. */
  getWindow: () => BrowserWindow | null | undefined
  /** The folder of the user library. */
  root: string
}

/**
 * Registers the handlers. The main process can call this again for a new window:
 * the new handlers replace the old ones.
 */
export function registerSymbolLibraryIpc(deps: SymbolLibraryMainDeps): UserLibrary {
  const library = new UserLibrary(deps.root)
  const { ipcMain } = deps

  const pick = async (kind: 'file' | 'folder'): Promise<string | null> => {
    const window = deps.getWindow()
    const options: Electron.OpenDialogOptions =
      kind === 'file'
        ? {
            title: 'Import a symbol',
            filters: [{ name: 'QElectroTech element', extensions: ['elmt'] }],
            properties: ['openFile'],
          }
        : { title: 'Import a folder of symbols', properties: ['openDirectory'] }
    const r = window ? await deps.dialog.showOpenDialog(window, options) : await deps.dialog.showOpenDialog(options)
    return r.canceled || r.filePaths.length === 0 ? null : r.filePaths[0]
  }

  const handlers: Record<string, (event: unknown, ...args: unknown[]) => Promise<unknown>> = {
    [SYMBOL_CHANNELS.list]: () => library.list(),
    [SYMBOL_CHANNELS.svg]: async (_e, id) => {
      if (typeof id !== 'string') throw new Error('The symbol ID must be a string.')
      return library.svg(id)
    },
    [SYMBOL_CHANNELS.importFile]: async (): Promise<ImportResult | null> => {
      const file = await pick('file')
      return file === null ? null : library.importFile(file)
    },
    [SYMBOL_CHANNELS.importFolder]: async (): Promise<ImportResult | null> => {
      const dir = await pick('folder')
      return dir === null ? null : library.importFolder(dir)
    },
  }
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.removeHandler(channel)
    ipcMain.handle(channel, handler)
  }
  return library
}
