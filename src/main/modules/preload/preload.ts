// import './splash-screen/index'

import { contextBridge, ipcRenderer } from 'electron'

import { createSymbolLibraryBridge, type IoloomBridge } from '../../../ioloom/seams/symbol-library-preload'
import rendererProcessBridge from '../ipc/renderer'

contextBridge.exposeInMainWorld('bridge', rendererProcessBridge)

const ioloomBridge: IoloomBridge = { symbols: createSymbolLibraryBridge(ipcRenderer) }
contextBridge.exposeInMainWorld('ioloom', ioloomBridge)

export type ElectronHandler = typeof rendererProcessBridge

declare global {
  interface Window {
    bridge: ElectronHandler
  }
}
