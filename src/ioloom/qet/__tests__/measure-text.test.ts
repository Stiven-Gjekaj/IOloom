import { DOCUMENT_MARGIN, dynamicTextBox, fontMetrics, lineWidth, PX_PER_PT } from '../measure-text'

// At 7.5 points, one em is 10 pixels. Thus 1/1000 em is 0.01 pixel.
const EM10 = 10 / PX_PER_PT

describe('lineWidth', () => {
  it('adds the advance width of each character', () => {
    // "K" is 667 and "1" is 556.
    expect(lineWidth('K1', EM10)).toBeCloseTo(12.23, 5)
  })

  it('gives a narrow "i" and a wide "W"', () => {
    expect(lineWidth('i', EM10)).toBeCloseTo(2.22, 5)
    expect(lineWidth('W', EM10)).toBeCloseTo(9.44, 5)
  })

  it('gives the width of a digit to a character outside the table', () => {
    expect(lineWidth('é', EM10)).toBeCloseTo(lineWidth('0', EM10), 5)
  })

  it('gives zero for an empty text', () => {
    expect(lineWidth('', 9)).toBe(0)
  })

  it('grows in proportion to the font size', () => {
    expect(lineWidth('Motor', 18)).toBeCloseTo(2 * lineWidth('Motor', 9), 5)
  })
})

describe('fontMetrics', () => {
  it('gives the ascent and the line height of Liberation Sans', () => {
    expect(fontMetrics(EM10).ascent).toBeCloseTo(9.05, 5)
    expect(fontMetrics(EM10).lineHeight).toBeCloseTo(11.17, 5)
  })
})

describe('dynamicTextBox', () => {
  const m = DOCUMENT_MARGIN
  const base = { x: -2, y: -80, size: EM10, textWidth: -1, hAlign: 'left' as const }

  it('puts the text inside the document margin, below the position of the item', () => {
    const box = dynamicTextBox({ ...base, text: 'K1' })
    expect(box.x).toBe(-2)
    expect(box.y).toBe(-80)
    expect(box.width).toBeCloseTo(12.23 + 2 * m, 5)
    expect(box.height).toBeCloseTo(11.17 + 2 * m, 5)
    expect(box.lines).toHaveLength(1)
    expect(box.lines[0].x).toBe(-2 + m)
    expect(box.lines[0].baseline).toBeCloseTo(-80 + m + 9.05, 5)
  })

  it('gives a box with only the margins to an empty text', () => {
    const box = dynamicTextBox({ ...base, text: '' })
    expect(box.width).toBe(2 * m)
    expect(box.lines).toEqual([{ text: '', x: -2 + m, baseline: expect.any(Number) }])
  })

  it('puts each line of a text with line breaks one line height lower', () => {
    const box = dynamicTextBox({ ...base, text: 'A\nBB' })
    expect(box.lines.map((l) => l.text)).toEqual(['A', 'BB'])
    expect(box.lines[1].baseline - box.lines[0].baseline).toBeCloseTo(11.17, 5)
    expect(box.width).toBeCloseTo(13.34 + 2 * m, 5)
  })

  it('aligns the shorter lines to the right or the centre of the longest line', () => {
    const right = dynamicTextBox({ ...base, text: 'A\nBB', hAlign: 'right' })
    expect(right.lines[0].x).toBeCloseTo(-2 + m + 6.67, 5)
    expect(right.lines[1].x).toBeCloseTo(-2 + m, 5)
    const centre = dynamicTextBox({ ...base, text: 'A\nBB', hAlign: 'center' })
    expect(centre.lines[0].x).toBeCloseTo(-2 + m + 3.335, 5)
  })

  it('wraps a text at the spaces when the width is fixed', () => {
    // Each "AA" is 13.34 wide and "AA AA" is 29.46. The content width is 30 - 8 = 22.
    const box = dynamicTextBox({ ...base, text: 'AA AA AA', textWidth: 30 })
    expect(box.lines.map((l) => l.text)).toEqual(['AA', 'AA', 'AA'])
    expect(box.width).toBe(30)
  })

  it('aligns the wrapped lines inside the fixed width', () => {
    const box = dynamicTextBox({ ...base, text: 'A', textWidth: 30, hAlign: 'right' })
    expect(box.lines[0].x).toBeCloseTo(-2 + m + 22 - 6.67, 5)
  })

  it('widens the box to the longest word when one word is wider than the fixed width', () => {
    const box = dynamicTextBox({ ...base, text: 'WWWW A', textWidth: 20 })
    expect(box.lines.map((l) => l.text)).toEqual(['WWWW', 'A'])
    expect(box.width).toBeCloseTo(37.76 + 2 * m, 5)
  })

  it('does not wrap when the width is 0', () => {
    const box = dynamicTextBox({ ...base, text: 'AA AA', textWidth: 0 })
    expect(box.lines).toHaveLength(1)
  })
})
