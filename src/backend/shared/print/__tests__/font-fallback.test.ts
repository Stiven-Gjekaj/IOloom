/**
 * Print and export draw a character that the Latin faces lack with a fallback face
 * (upstream issue 1171, IOloom #15). Before, CJK text, Cyrillic, Greek and signs such as
 * `№` came out blank. The fallback is embedded only when a page uses it, so a project in
 * Latin text gives the same PDF as before.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { PDFDict, PDFDocument, PDFName } from 'pdf-lib'

import { renderProjectToPdf } from '../index'
import { splitTextByFont } from '../pdf-writer'
import type { PrintRequest } from '../types'
import { getTestFontSet } from './fixtures/test-font-set'

/** Liberation Sans (SIL OFL) covers Cyrillic, Greek and `№`, which Noto Sans as embedded here does not. */
const LIBERATION = new Uint8Array(
  readFileSync(join(__dirname, '../../../../../node_modules/pdfjs-dist/standard_fonts/LiberationSans-Regular.ttf')),
)

const request = (name: string): PrintRequest => ({
  projectName: 'Test Project',
  mode: 'normal',
  pagePolicy: 'new-page-per-pou',
  page: { size: 'a4', orientation: 'portrait', marginsPt: { top: 36, right: 36, bottom: 36, left: 36 } },
  pous: [{ name, kind: 'il', lines: [{ runs: [{ text: 'LD X', color: '#111111' }] }], variables: [] }],
})

/** The BaseFont names of every font the PDF embeds. */
async function embeddedFontNames(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes)
  const names: string[] = []
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (object instanceof PDFDict && object.get(PDFName.of('Type')) === PDFName.of('Font')) {
      const base = object.get(PDFName.of('BaseFont'))
      if (base) names.push(base.toString())
    }
  }
  return names
}

describe('splitTextByFont', () => {
  const latin = (cp: number) => cp < 0x250
  const symbols = (cp: number) => cp === 0x2116 || cp === 0x416

  it('keeps a text that the first face covers in one run', () => {
    expect(splitTextByFont('Motor 1', [latin, symbols])).toEqual([{ text: 'Motor 1', face: 0 }])
  })

  it('gives each character the first face that has it', () => {
    expect(splitTextByFont('M№1Ж', [latin, symbols])).toEqual([
      { text: 'M', face: 0 },
      { text: '№', face: 1 },
      { text: '1', face: 0 },
      { text: 'Ж', face: 1 },
    ])
  })

  it('gives a character that no face has to the first face', () => {
    expect(splitTextByFont('a😀b', [latin, symbols])).toEqual([{ text: 'a😀b', face: 0 }])
  })
})

describe('the fallback face in the PDF', () => {
  it('draws Cyrillic and the numero sign with the fallback face', async () => {
    const bytes = await renderProjectToPdf(request('Мотор_№1'), { ...getTestFontSet(), fallbacks: [LIBERATION] })

    expect((await embeddedFontNames(bytes)).some((name) => name.includes('LiberationSans'))).toBe(true)
  })

  it('does not embed the fallback face when no text needs it', async () => {
    const bytes = await renderProjectToPdf(request('Motor_1'), { ...getTestFontSet(), fallbacks: [LIBERATION] })

    expect((await embeddedFontNames(bytes)).some((name) => name.includes('LiberationSans'))).toBe(false)
  })
})
