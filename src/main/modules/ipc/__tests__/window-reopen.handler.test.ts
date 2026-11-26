/**
 * macOS opens the main window again after it closes, and each window builds a new bridge
 * (upstream issue 326, IOloom #18). The new bridge must take over the IPC channels: before,
 * it could not remove the handlers of the old bridge, so Electron refused the second handler
 * of each channel, and each `on` listener ran once for each window ever opened.
 */
import { EventEmitter } from 'node:events'

import MainProcessBridge from '../main'

jest.mock('electron', () => ({
  app: { getPath: jest.fn(() => '/tmp'), quit: jest.fn() },
  dialog: {},
  nativeTheme: { shouldUseDarkColors: false, themeSource: 'system' },
  shell: { openExternal: jest.fn() },
}))

jest.mock('@root/backend/editor/ethercat', () => ({ EsiProjectFiles: jest.fn() }))
jest.mock('@root/backend/editor/library-manager/desktop-catalog-transport', () => ({
  createDesktopCatalogTransport: jest.fn(() => ({})),
}))
jest.mock('@root/backend/editor/utils/runtime-https-config', () => ({ getRuntimeHttpsOptions: jest.fn(() => ({})) }))
jest.mock('@root/backend/shared/ethercat/esi-parser-main', () => ({ parseESIDeviceFull: jest.fn() }))
jest.mock('@root/backend/shared/library/public-catalog-client', () => ({ listPublicLibraries: jest.fn() }))
jest.mock('../../../../backend/editor/library-manager', () => ({
  LibraryManagerModule: jest.fn(() => ({ loadEnabledArchives: jest.fn(() => ({ archives: [], missing: [] })) })),
}))
jest.mock('../../../../backend/editor/package-manager', () => ({ PackageManagerModule: jest.fn(() => ({})) }))
jest.mock('../../../../backend/editor/services', () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}))
jest.mock('../../../../backend/editor/utils', () => ({ getOpenProjectPath: jest.fn(), getProjectPath: jest.fn() }))

/** An ipcMain with Electron's rule: a channel takes one invoke handler at a time. */
class FakeIpcMain extends EventEmitter {
  readonly handlers = new Map<string, unknown>()
  handle(channel: string, handler: unknown): void {
    if (this.handlers.has(channel)) throw new Error(`Attempted to register a second handler for '${channel}'`)
    this.handlers.set(channel, handler)
  }
  removeHandler(channel: string): void {
    this.handlers.delete(channel)
  }
}

function openWindow(ipcMain: FakeIpcMain): MainProcessBridge {
  const bridge = new MainProcessBridge({
    ipcMain,
    mainWindow: {
      isDestroyed: jest.fn(() => false),
      webContents: { send: jest.fn(), on: jest.fn(), isCrashed: jest.fn(() => false) },
    },
    projectService: {},
    store: { get: jest.fn(() => undefined) },
    menuBuilder: { buildMenu: jest.fn(() => Promise.resolve()) },
    pouService: {},
    compilerModule: {},
    hardwareModule: { isSerialPortPresent: jest.fn(() => true) },
    quitCoordinator: {},
  } as never)
  bridge.setupMainIpcListener()
  return bridge
}

describe('a second window', () => {
  it('takes over the invoke handlers without an error', () => {
    const ipcMain = new FakeIpcMain()
    openWindow(ipcMain)
    const handled = ipcMain.handlers.size
    expect(handled).toBeGreaterThan(0)

    expect(() => openWindow(ipcMain)).not.toThrow()
    expect(ipcMain.handlers.size).toBe(handled)
  })

  it('leaves one listener on each channel', () => {
    const ipcMain = new FakeIpcMain()
    openWindow(ipcMain)
    openWindow(ipcMain)

    for (const channel of ipcMain.eventNames()) {
      expect([channel, ipcMain.listenerCount(channel)]).toEqual([channel, 1])
    }
    expect(ipcMain.listenerCount('compiler:run-compile-program')).toBe(1)
  })
})
