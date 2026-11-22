/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { SYMBOL_CHANNELS } from '../../library/api'
import { registerSymbolLibraryIpc, type SymbolLibraryMainDeps } from '../symbol-library-main'
import { createSymbolLibraryBridge } from '../symbol-library-preload'

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>

// A fake ipcMain, and a fake ipcRenderer that calls its handlers. The test connects the
// bridge of the preload script to the handlers of the main process through them.
function fakeIpc() {
  const handlers = new Map<string, Handler>()
  return {
    handlers,
    ipcMain: {
      handle: jest.fn((channel: string, h: Handler) => {
        if (handlers.has(channel)) throw new Error(`Attempted to register a second handler for '${channel}'`)
        handlers.set(channel, h)
      }),
      removeHandler: jest.fn((channel: string) => handlers.delete(channel)),
    },
    ipcRenderer: {
      invoke: (channel: string, ...args: unknown[]) => {
        const h = handlers.get(channel)
        if (!h) return Promise.reject(new Error(`No handler for ${channel}`))
        return h({}, ...args)
      },
    },
  }
}

const elmt = (uuid: string, name: string): string =>
  `<definition type="element" width="20" height="20" hotspot_x="10" hotspot_y="10"><uuid uuid="${uuid}"/>` +
  `<names><name lang="en">${name}</name></names><description><line x1="0" y1="0" x2="5" y2="0"/></description></definition>`

let work: string
beforeEach(() => {
  work = mkdtempSync(join(tmpdir(), 'ioloom-ipc-'))
})
afterEach(() => {
  rmSync(work, { recursive: true, force: true })
})

function setup(picked: string[] | null) {
  const ipc = fakeIpc()
  const window = { id: 1 }
  const dialog = {
    showOpenDialog: jest.fn(async () => ({ canceled: picked === null, filePaths: picked ?? [] })),
  }
  registerSymbolLibraryIpc({
    ipcMain: ipc.ipcMain,
    dialog,
    getWindow: () => window,
    root: join(work, 'library'),
  } as unknown as SymbolLibraryMainDeps)
  return { ipc, dialog, window, api: createSymbolLibraryBridge(ipc.ipcRenderer as never) }
}

describe('the symbol library seams', () => {
  it('registers one handler for each channel', () => {
    const { ipc } = setup(null)
    expect([...ipc.handlers.keys()].sort()).toEqual(Object.values(SYMBOL_CHANNELS).sort())
  })

  it('replaces the handlers when the main process registers them again', () => {
    const ipc = fakeIpc()
    const deps = { ipcMain: ipc.ipcMain, dialog: {}, getWindow: () => null, root: work }
    registerSymbolLibraryIpc(deps as unknown as SymbolLibraryMainDeps)
    expect(() => registerSymbolLibraryIpc(deps as unknown as SymbolLibraryMainDeps)).not.toThrow()
    expect(ipc.handlers.size).toBe(4)
  })

  it('imports the file that the user picks, then lists and draws it', async () => {
    mkdirSync(join(work, 'in'))
    writeFileSync(join(work, 'in/coil.elmt'), elmt('{c}', 'Coil'))
    const { api, dialog, window } = setup([join(work, 'in/coil.elmt')])
    expect(await api.importFile()).toEqual({ imported: ['coil.elmt'], unchanged: [], failed: [] })
    expect(dialog.showOpenDialog).toHaveBeenCalledWith(
      window,
      expect.objectContaining({
        properties: ['openFile'],
        filters: [{ name: 'QElectroTech element', extensions: ['elmt'] }],
      }),
    )
    const list = await api.list()
    expect(list.entries.map((e) => e.names.en)).toEqual(['Coil'])
    expect(await api.svg('coil.elmt')).toMatch(/^<svg /)
  })

  it('imports the folder that the user picks', async () => {
    mkdirSync(join(work, 'kit'))
    writeFileSync(join(work, 'kit/a.elmt'), elmt('{a}', 'A'))
    const { api, dialog } = setup([join(work, 'kit')])
    expect((await api.importFolder())?.imported).toEqual(['kit/a.elmt'])
    expect(dialog.showOpenDialog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ properties: ['openDirectory'] }),
    )
  })

  it('gives null when the user cancels the dialog', async () => {
    const { api } = setup(null)
    expect(await api.importFile()).toBeNull()
    expect(await api.importFolder()).toBeNull()
  })

  it('opens the dialog with no parent window when there is no window', async () => {
    const ipc = fakeIpc()
    const dialog = { showOpenDialog: jest.fn(async () => ({ canceled: true, filePaths: [] })) }
    registerSymbolLibraryIpc({
      ipcMain: ipc.ipcMain,
      dialog,
      getWindow: () => null,
      root: work,
    } as unknown as SymbolLibraryMainDeps)
    await createSymbolLibraryBridge(ipc.ipcRenderer as never).importFile()
    expect(dialog.showOpenDialog).toHaveBeenCalledWith(expect.objectContaining({ title: 'Import a symbol' }))
  })

  it('refuses a symbol ID that is not a string or that goes out of the library', async () => {
    const { ipc, api } = setup(null)
    await expect(ipc.handlers.get(SYMBOL_CHANNELS.svg)?.({}, 42)).rejects.toThrow('must be a string')
    await expect(api.svg('../../etc/passwd.elmt')).rejects.toThrow('is not a symbol of the library')
  })
})
