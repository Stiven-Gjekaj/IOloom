/**
 * The system fonts that print and export use for the characters that the embedded Latin
 * faces lack: CJK, Cyrillic, Greek, `℃` (upstream issue 1171).
 *
 * No such font is bundled: a CJK face adds megabytes to each build, and a system has one.
 * Many systems ship their CJK fonts only as collections (.ttc), which pdf-lib cannot
 * embed, so `fontFromCollection` takes one font out of a collection. The platform only
 * supplies the file access (`FontFileAccess`).
 */

import fontkit from '@pdf-lib/fontkit'

/** At most this many faces go to the renderer. Each one can be tens of megabytes. */
const MAX_FALLBACK_FONTS = 3

const TTC_TAG = 0x74746366 // 'ttcf'

export interface FontFileAccess {
  exists(path: string): boolean
  read(path: string): Uint8Array
}

/**
 * Returns the first font of a collection as a standalone font. Returns `bytes` as it is
 * when it is not a collection.
 *
 * In a collection, the table records of each font hold offsets from the start of the
 * file, and fonts can share tables. The standalone font gets its own copy of each table
 * and offsets from its own start.
 */
export function fontFromCollection(bytes: Uint8Array): Uint8Array {
  const source = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.byteLength < 16 || source.getUint32(0) !== TTC_TAG) return bytes

  const fontStart = source.getUint32(12)
  const numTables = source.getUint16(fontStart + 4)
  const headerSize = 12 + numTables * 16
  const tables = Array.from({ length: numTables }, (_, index) => {
    const record = fontStart + 12 + index * 16
    return { offset: source.getUint32(record + 8), length: source.getUint32(record + 12) }
  })
  const padded = (length: number) => (length + 3) & ~3
  const out = new Uint8Array(headerSize + tables.reduce((sum, table) => sum + padded(table.length), 0))
  const view = new DataView(out.buffer)
  out.set(bytes.subarray(fontStart, fontStart + headerSize))

  let next = headerSize
  for (const [index, table] of tables.entries()) {
    out.set(bytes.subarray(table.offset, table.offset + table.length), next)
    view.setUint32(12 + index * 16 + 8, next)
    next += padded(table.length)
  }
  return out
}

/** The font files to try, in order, for one platform (`process.platform` values). */
export function fallbackFontCandidates(platform: string, env: Record<string, string | undefined>): string[] {
  if (platform === 'win32') {
    const fonts = `${env.WINDIR ?? 'C:\\Windows'}\\Fonts\\`
    // Arial: Cyrillic and Greek. YaHei, SimSun, Malgun Gothic, Yu Gothic: CJK. Segoe UI Symbol: signs.
    return ['arial.ttf', 'msyh.ttc', 'simsun.ttc', 'malgun.ttf', 'YuGothR.ttc', 'seguisym.ttf'].map(
      (name) => `${fonts}${name}`,
    )
  }
  if (platform === 'darwin') {
    return [
      '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
      '/Library/Fonts/Arial Unicode.ttf',
      '/System/Library/Fonts/STHeiti Light.ttc',
      '/System/Library/Fonts/AppleSDGothicNeo.ttc',
    ]
  }
  return [
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/TTF/DejaVuSans.ttf',
    '/usr/share/fonts/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/google-noto-cjk/NotoSansCJK-Regular.ttc',
    '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
    '/usr/share/fonts/wenquanyi/wqy-microhei/wqy-microhei.ttc',
    '/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf',
  ]
}

/**
 * Reads the candidates that exist, in order, and returns up to three that parse as a
 * font. A file that does not parse is skipped, so a damaged font cannot stop a print. A
 * font found a second time (macOS has Arial Unicode in two folders) is skipped too.
 */
export function findFallbackFonts(candidates: string[], io: FontFileAccess): Uint8Array[] {
  const fonts: Uint8Array[] = []
  const names = new Set<string>()
  for (const path of candidates) {
    if (fonts.length >= MAX_FALLBACK_FONTS) break
    if (!io.exists(path)) continue
    try {
      const font = fontFromCollection(io.read(path))
      // A font with no PostScript name is told apart by its path.
      const name = fontkit.create(font).postscriptName ?? path
      if (names.has(name)) continue
      names.add(name)
      fonts.push(font)
    } catch {
      // Not a font that fontkit can read: try the next candidate.
    }
  }
  return fonts
}

/** The fallback fonts as they come over IPC, or none when the value is not a list of bytes. */
export function asFallbackFonts(value: unknown): Uint8Array[] {
  return Array.isArray(value) && value.every((font) => font instanceof Uint8Array) ? value : []
}
