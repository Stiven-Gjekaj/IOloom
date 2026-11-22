// Seam: the renderer side of the user symbol library. The preload script exposes it as
// `window.ioloom.symbols`.
import type { IpcRenderer } from 'electron'

import { type ImportResult, type ListResult, SYMBOL_CHANNELS, type SymbolLibraryApi } from '../library/api'

export function createSymbolLibraryBridge(ipc: Pick<IpcRenderer, 'invoke'>): SymbolLibraryApi {
  return {
    list: () => ipc.invoke(SYMBOL_CHANNELS.list) as Promise<ListResult>,
    svg: (id) => ipc.invoke(SYMBOL_CHANNELS.svg, id) as Promise<string>,
    importFile: () => ipc.invoke(SYMBOL_CHANNELS.importFile) as Promise<ImportResult | null>,
    importFolder: () => ipc.invoke(SYMBOL_CHANNELS.importFolder) as Promise<ImportResult | null>,
  }
}

export interface IoloomBridge {
  symbols: SymbolLibraryApi
}

declare global {
  interface Window {
    /** The IOloom API. It is not set outside Electron, for example in a unit test. */
    ioloom?: IoloomBridge
  }
}
