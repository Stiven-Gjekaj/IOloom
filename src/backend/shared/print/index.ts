import { paginate } from './paginate'
import { createPdfLibBackend, drawPages } from './pdf-writer'
import type { EmbeddedFontSet, PrintRequest } from './types'

export type {
  ColoredLine,
  ContentBlock,
  DrawOp,
  EmbeddedFontSet,
  PageMarginsPt,
  PageOrientation,
  PagePolicy,
  PaperSize,
  PdfPageContent,
  PrintFontKey,
  PrintPageSetup,
  PrintPou,
  PrintRenderMode,
  PrintRequest,
  PrintTextKind,
  PrintVar,
  RgbHex,
  TextRun,
} from './types'

/**
 * Renders a print/export-to-PDF request to bytes. Font embedding is
 * adapter-owned (per-repo, per Vite/webpack's own asset pipeline) — callers
 * supply the already-loaded embedded fonts.
 */
export async function renderProjectToPdf(req: PrintRequest, fonts: EmbeddedFontSet): Promise<Uint8Array> {
  const pages = paginate(req)
  const usedText = pages.flatMap((page) => page.ops.map((op) => (op.kind === 'text' ? op.text : ''))).join('')
  const backend = await createPdfLibBackend(fonts, usedText)
  drawPages(backend, pages)
  return backend.finish()
}
