// Measures the text of an element with the metrics of Liberation Sans.
// QElectroTech uses Liberation Sans. It has the same advance widths as Arial and Helvetica.

/** Qt gives a point size. At 96 dpi, one point is 96 / 72 pixels, and one pixel is one element unit. */
export const PX_PER_PT = 96 / 72

/** The margin of a Qt text document (QTextDocument::documentMargin) on each side, in pixels. */
export const DOCUMENT_MARGIN = 4

// The vertical metrics of Liberation Sans, as a fraction of the em size.
const ASCENT = 0.905
const DESCENT = 0.212

// The advance widths of the characters from U+0020 to U+007E, in 1/1000 em.
// prettier-ignore
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // space to /
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, // 0 to ?
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, // @ to O
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, // P to _
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, // ` to o
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584, // p to ~
]
// The width for a character outside the table: the width of a digit.
const OTHER_WIDTH = 556

/** The advance width of a line of text, in pixels, for a font size in points. */
export function lineWidth(text: string, sizePt: number): number {
  let units = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    units += code >= 0x20 && code <= 0x7e ? WIDTHS[code - 0x20] : OTHER_WIDTH
  }
  return (units / 1000) * sizePt * PX_PER_PT
}

export interface FontMetrics {
  /** The distance from the top of a line to its baseline, in pixels. */
  ascent: number
  /** The height of one line, in pixels. */
  lineHeight: number
}

export function fontMetrics(sizePt: number): FontMetrics {
  const px = sizePt * PX_PER_PT
  return { ascent: ASCENT * px, lineHeight: (ASCENT + DESCENT) * px }
}

// Breaks a paragraph into lines that are not wider than `max`, at the spaces.
// A word that is wider than `max` stays on its own line, as in Qt.
function wrap(paragraph: string, sizePt: number, max: number): string[] {
  const words = paragraph.split(' ')
  const lines: string[] = []
  let line = words[0]
  for (const word of words.slice(1)) {
    const next = `${line} ${word}`
    if (lineWidth(next, sizePt) <= max) line = next
    else {
      lines.push(line)
      line = word
    }
  }
  lines.push(line)
  return lines
}

export type HAlign = 'left' | 'center' | 'right'

export interface TextLine {
  text: string
  /** The left end of the line, in element units. */
  x: number
  /** The baseline of the line, in element units. */
  baseline: number
}

export interface TextBox {
  /** The top left corner of the box, in element units. It includes the document margin. */
  x: number
  y: number
  width: number
  height: number
  lines: TextLine[]
}

export interface DynamicTextLayout {
  x: number
  y: number
  text: string
  size: number
  /** The width of the text document in pixels. A value of 0 or less is an automatic width. */
  textWidth: number
  hAlign: HAlign
}

/**
 * Gives the box of a `dynamic_text`, as Qt makes it for a QGraphicsTextItem.
 * The position of the item is the top left corner of the box. The box has a margin of
 * DOCUMENT_MARGIN on each side. With a fixed width, the text wraps at the spaces. If one word
 * is wider than the fixed width, the box gets the width of the longest line (QET does this too).
 */
export function dynamicTextBox(t: DynamicTextLayout): TextBox {
  const m = DOCUMENT_MARGIN
  const { ascent, lineHeight } = fontMetrics(t.size)
  const fixed = t.textWidth > 0 ? t.textWidth - 2 * m : 0
  const texts = t.text.split('\n').flatMap((paragraph) => (fixed > 0 ? wrap(paragraph, t.size, fixed) : [paragraph]))
  const widths = texts.map((s) => lineWidth(s, t.size))
  const content = Math.max(fixed, ...widths)
  const lines = texts.map((text, i) => {
    const free = content - widths[i]
    const offset = t.hAlign === 'right' ? free : t.hAlign === 'center' ? free / 2 : 0
    return { text, x: t.x + m + offset, baseline: t.y + m + ascent + i * lineHeight }
  })
  return { x: t.x, y: t.y, width: content + 2 * m, height: texts.length * lineHeight + 2 * m, lines }
}
