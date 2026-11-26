/**
 * Reads the system fallback fonts for print and export (upstream issue 1171). The choice
 * of files, the collection handling and the checks are in the shared print module; this
 * module only supplies the file access and carries the bytes over IPC.
 *
 * IPC channel:
 *   - print:get-fallback-fonts (invoke): the font files as bytes, read once per session
 */

import { existsSync, readFileSync } from 'node:fs'

import { ipcMain } from 'electron'

import { fallbackFontCandidates, findFallbackFonts } from '../../../backend/shared/print/fonts/system-fallback'

export function registerPrintFonts(): void {
  let fonts: Uint8Array[] | undefined
  ipcMain.handle('print:get-fallback-fonts', () => {
    fonts ??= findFallbackFonts(fallbackFontCandidates(process.platform, process.env), {
      exists: existsSync,
      read: (path) => new Uint8Array(readFileSync(path)),
    })
    return fonts
  })
}
