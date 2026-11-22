import type { ElementSymbol, Primitive, StrokeStyle } from '../model'
import { arcPath, renderSvg } from '../render-svg'

const plain: StrokeStyle = { stroke: 'black', fill: 'none', hatch: null, width: 1, dash: null }

const symbol = (primitives: Primitive[], extra: Partial<ElementSymbol> = {}): ElementSymbol => ({
  uuid: '',
  names: {},
  linkType: 'simple',
  width: 40,
  height: 60,
  hotspotX: 20,
  hotspotY: 10,
  primitives,
  terminals: [],
  unknown: [],
  ...extra,
})

describe('renderSvg', () => {
  it('puts the hotspot at the origin of the view box and scales the size', () => {
    const svg = renderSvg(symbol([]))
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="-20 -10 40 60" width="80" height="120"/)
    expect(renderSvg(symbol([]), { scale: 1 })).toContain('width="40" height="60"')
  })

  it('draws a line with its stroke, width and dash', () => {
    const svg = renderSvg(
      symbol([{ kind: 'line', x1: 0, y1: 0, x2: 1.234, y2: 5, style: { ...plain, width: 2, dash: '4 2' } }]),
    )
    expect(svg).toContain(
      '<line x1="0" y1="0" x2="1.23" y2="5" stroke="black" stroke-width="2" fill="none" stroke-dasharray="4 2"/>',
    )
  })

  it('draws a rect and an ellipse with their fill', () => {
    const svg = renderSvg(
      symbol([
        { kind: 'rect', x: 1, y: 2, w: 3, h: 4, rx: 0, ry: 0, style: { ...plain, fill: 'red' } },
        { kind: 'ellipse', cx: 1, cy: 2, rx: 3, ry: 4, style: plain },
      ]),
    )
    expect(svg).toContain(
      '<rect x="1" y="2" width="3" height="4" rx="0" ry="0" stroke="black" stroke-width="1" fill="red"/>',
    )
    expect(svg).toContain('<ellipse cx="1" cy="2" rx="3" ry="4" stroke="black"')
  })

  it('draws a closed polygon and an open polyline with no fill', () => {
    const svg = renderSvg(
      symbol([
        {
          kind: 'polygon',
          points: [
            [0, 0],
            [1, 1],
          ],
          closed: true,
          style: { ...plain, fill: 'blue' },
        },
        {
          kind: 'polygon',
          points: [
            [2, 2],
            [3, 3],
          ],
          closed: false,
          style: { ...plain, fill: 'blue' },
        },
      ]),
    )
    expect(svg).toContain('<polygon points="0,0 1,1" stroke="black" stroke-width="1" fill="blue"/>')
    expect(svg).toContain('<polyline points="2,2 3,3" stroke="black" stroke-width="1" fill="none"/>')
  })

  it('draws an arc as a path with no fill', () => {
    const svg = renderSvg(
      symbol([{ kind: 'arc', cx: 0, cy: 0, rx: 4, ry: 2, start: 0, sweep: 90, style: { ...plain, fill: 'red' } }]),
    )
    expect(svg).toContain('<path d="M4 0 A4 2 0 0 0 0 -2" stroke="black" stroke-width="1" fill="none"/>')
  })

  it('escapes the text and anchors dynamic text at the top', () => {
    const svg = renderSvg(
      symbol([
        { kind: 'text', x: 1, y: 2, text: 'a<b>&c', size: 9, color: 'red', rotation: 0, anchorTop: false },
        { kind: 'text', x: 3, y: 4, text: 'Q', size: 9, color: 'black', rotation: 90, anchorTop: true },
      ]),
    )
    expect(svg).toContain('font-size="11.97" fill="red"')
    expect(svg).toContain('>a&lt;b&gt;&amp;c</text>')
    expect(svg).toContain('dominant-baseline="hanging" transform="rotate(90 3 4)">Q</text>')
  })

  it('draws a dot on each terminal, if the option is not off', () => {
    const s = symbol([], { terminals: [{ id: 't', name: '', x: 0, y: -10, orientation: 'n' }] })
    expect(renderSvg(s)).toContain('<circle cx="0" cy="-10" r="1.5" fill="red"/>')
    expect(renderSvg(s, { showTerminals: false })).not.toContain('<circle')
  })
})

describe('renderSvg with hatch fills', () => {
  const hatched = (hatch: StrokeStyle['hatch']): Primitive => ({
    kind: 'rect',
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    rx: 0,
    ry: 0,
    style: { ...plain, hatch },
  })

  it('fills a shape with a black pattern for each hatch', () => {
    for (const h of ['hor', 'ver', 'bdiag', 'fdiag'] as const) {
      const svg = renderSvg(symbol([hatched(h)]))
      expect(svg).toContain(`fill="url(#qet-hatch-${h})"`)
      expect(svg).toMatch(
        new RegExp(
          `<defs><pattern id="qet-hatch-${h}" width="8" height="8" patternUnits="userSpaceOnUse"><path d="[^"]+" stroke="black"`,
        ),
      )
    }
  })

  it('draws the lines of each pattern in the correct direction', () => {
    const path = (h: 'hor' | 'ver' | 'bdiag' | 'fdiag'): string =>
      /<pattern id="qet-hatch-\w+"[^>]*><path d="([^"]+)"/.exec(renderSvg(symbol([hatched(h)])))?.[1] ?? ''
    expect(path('hor')).toBe('M0 4H8')
    expect(path('ver')).toBe('M4 0V8')
    // "bdiag" goes from the bottom left to the top right, "fdiag" from the top left to the bottom right.
    expect(path('bdiag')).toContain('M0 8L8 0')
    expect(path('fdiag')).toContain('M0 0L8 8')
  })

  it('adds each pattern only one time, and only the patterns that it uses', () => {
    const svg = renderSvg(symbol([hatched('hor'), hatched('hor'), hatched('ver')]))
    expect(svg.match(/<pattern /g)).toHaveLength(2)
    expect(renderSvg(symbol([hatched(null)]))).not.toContain('<defs>')
  })

  it('gives no fill and no pattern to an arc or an open polyline', () => {
    const style = { ...plain, hatch: 'hor' as const }
    const svg = renderSvg(
      symbol([
        { kind: 'arc', cx: 0, cy: 0, rx: 1, ry: 1, start: 0, sweep: 90, style },
        {
          kind: 'polygon',
          points: [
            [0, 0],
            [1, 1],
          ],
          closed: false,
          style,
        },
      ]),
    )
    expect(svg).not.toContain('url(')
    expect(svg).not.toContain('<defs>')
  })

  it('uses the ID prefix of the options', () => {
    const svg = renderSvg(symbol([hatched('fdiag')]), { idPrefix: 'sym7-' })
    expect(svg).toContain('<pattern id="sym7-hatch-fdiag"')
    expect(svg).toContain('fill="url(#sym7-hatch-fdiag)"')
  })
})

describe('arcPath', () => {
  const arc = (start: number, sweep: number): Extract<Primitive, { kind: 'arc' }> => ({
    kind: 'arc',
    cx: 0,
    cy: 0,
    rx: 10,
    ry: 10,
    start,
    sweep,
    style: plain,
  })

  it('goes counterclockwise for a positive sweep, on a canvas where y goes down', () => {
    expect(arcPath(arc(0, 90))).toBe('M10 0 A10 10 0 0 0 0 -10')
  })

  it('goes clockwise for a negative sweep', () => {
    expect(arcPath(arc(0, -90))).toBe('M10 0 A10 10 0 0 1 0 10')
  })

  it('sets the large arc flag for a sweep of more than 180 degrees', () => {
    expect(arcPath(arc(0, 270))).toMatch(/^M10 0 A10 10 0 1 0 /)
  })

  it('draws a full ellipse as two half arcs', () => {
    expect(arcPath(arc(0, 360))).toBe('M-10 0 a10 10 0 1 0 20 0 a10 10 0 1 0 -20 0')
  })
})
