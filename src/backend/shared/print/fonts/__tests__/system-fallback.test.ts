/**
 * The fallback faces for print and export come from the fonts of the system
 * (upstream issue 1171, IOloom #15). Many systems ship their CJK fonts only as
 * collections (.ttc), which pdf-lib cannot embed, so one font is taken out of the
 * collection.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import fontkit from '@pdf-lib/fontkit'

import { fallbackFontCandidates, findFallbackFonts, fontFromCollection } from '../system-fallback'

const LIBERATION = new Uint8Array(
  readFileSync(join(__dirname, '../../../../../../node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')),
)

/** Wraps one sfnt font in a collection: a ttcf header, and table offsets moved by the header size. */
function asCollection(font: Uint8Array): Uint8Array {
  const header = 16
  const out = new Uint8Array(header + font.length)
  const view = new DataView(out.buffer)
  out.set([0x74, 0x74, 0x63, 0x66]) // 'ttcf'
  view.setUint32(4, 0x00010000)
  view.setUint32(8, 1)
  view.setUint32(12, header)
  out.set(font, header)
  const numTables = view.getUint16(header + 4)
  for (let table = 0; table < numTables; table++) {
    const offsetAt = header + 12 + table * 16 + 8
    view.setUint32(offsetAt, view.getUint32(offsetAt) + header)
  }
  return out
}

describe('fontFromCollection', () => {
  it('returns a plain font as it is', () => {
    expect(fontFromCollection(LIBERATION)).toBe(LIBERATION)
  })

  it('takes a font out of a collection, and the result parses with its glyphs', () => {
    const collection = asCollection(LIBERATION)
    expect(() => fontkit.create(collection).hasGlyphForCodePoint(0x416)).toThrow()

    const font = fontkit.create(fontFromCollection(collection))
    expect(font.hasGlyphForCodePoint(0x416)).toBe(true)
    expect(font.postscriptName).toBe(fontkit.create(LIBERATION).postscriptName)
  })
})

describe('findFallbackFonts', () => {
  it('skips the candidates that do not exist, and takes a font out of a collection', () => {
    const files: Record<string, Uint8Array> = { '/c.ttc': asCollection(LIBERATION) }
    const fonts = findFallbackFonts(['/a.ttf', '/c.ttc'], {
      exists: (path: string) => path in files,
      read: (path: string) => files[path],
    })
    expect(fonts).toHaveLength(1)
    expect(fontkit.create(fonts[0]).hasGlyphForCodePoint(0x416)).toBe(true)
  })

  it('skips a font that it found before in another folder', () => {
    const fonts = findFallbackFonts(['/one/font.ttf', '/two/font.ttf'], { exists: () => true, read: () => LIBERATION })
    expect(fonts).toEqual([LIBERATION])
  })

  it('skips a file that does not parse as a font', () => {
    const fonts = findFallbackFonts(['/bad.ttf', '/b.ttf'], {
      exists: () => true,
      read: (path: string) => (path === '/bad.ttf' ? new Uint8Array([1, 2, 3]) : LIBERATION),
    })
    expect(fonts).toEqual([LIBERATION])
  })
})

describe('fallbackFontCandidates', () => {
  it('lists the Windows fonts in the Windows font folder', () => {
    const candidates = fallbackFontCandidates('win32', { WINDIR: 'D:\\Windows' })
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.every((path: string) => path.startsWith('D:\\Windows\\Fonts\\'))).toBe(true)
  })

  it('lists fonts for macOS and Linux', () => {
    expect(fallbackFontCandidates('darwin', {}).some((path: string) => path.endsWith('Arial Unicode.ttf'))).toBe(true)
    expect(fallbackFontCandidates('linux', {}).some((path: string) => path.includes('NotoSansCJK'))).toBe(true)
  })
})
