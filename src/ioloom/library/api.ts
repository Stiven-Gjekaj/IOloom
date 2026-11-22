// The types that go between the user library in the main process and the library browser.
// This file has no dependency on Node, Electron, or React.
import type { SymbolEntry } from './library-index'

export interface FileError {
  /** The path of the file. In a list result, it is the path in the library. */
  path: string
  message: string
}

export interface ListResult {
  entries: SymbolEntry[]
  /** The files in the library that do not load. */
  errors: FileError[]
}

export interface ImportResult {
  /** The library paths of the new or changed files. */
  imported: string[]
  /** The library paths of the files that were already in the library with the same content. */
  unchanged: string[]
  /** The source files that are not valid elements. The library does not get them. */
  failed: FileError[]
}

/** What the library browser can ask of the user library. */
export interface SymbolLibraryApi {
  list(): Promise<ListResult>
  /** Draws one element of the library as SVG. */
  svg(id: string): Promise<string>
  /** Asks the user for one `.elmt` file and imports it. Gives null if the user cancels. */
  importFile(): Promise<ImportResult | null>
  /** Asks the user for a folder and imports each `.elmt` file in it. Gives null if the user cancels. */
  importFolder(): Promise<ImportResult | null>
}

/** The IPC channels of the user library. */
export const SYMBOL_CHANNELS = {
  list: 'ioloom:symbols:list',
  svg: 'ioloom:symbols:svg',
  importFile: 'ioloom:symbols:import-file',
  importFolder: 'ioloom:symbols:import-folder',
} as const
