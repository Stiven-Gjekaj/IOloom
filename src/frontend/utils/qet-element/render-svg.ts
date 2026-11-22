// Draws the symbol model as an SVG document.
import type { ElementSymbol, Primitive, StrokeStyle } from './model'

export interface RenderOptions {
  /** Draw a red dot on each terminal. The default is true. */
  showTerminals?: boolean
  /** The SVG width and height are the element size times this value. The default is 2. */
  scale?: number
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const f = (n: number): string => (Math.round(n * 100) / 100).toString()
const paint = (s: StrokeStyle): string =>
  `stroke="${s.stroke}" stroke-width="${s.width}" fill="${s.fill}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}`

// Qt angles go counterclockwise from 3 o'clock, in degrees, on a canvas where y goes down.
export function arcPath(p: Extract<Primitive, { kind: 'arc' }>): string {
  if (Math.abs(p.sweep) >= 360) {
    const r = `${f(p.rx)} ${f(p.ry)}`
    return `M${f(p.cx - p.rx)} ${f(p.cy)} a${r} 0 1 0 ${f(2 * p.rx)} 0 a${r} 0 1 0 ${f(-2 * p.rx)} 0`
  }
  const pt = (deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180
    return [p.cx + p.rx * Math.cos(rad), p.cy - p.ry * Math.sin(rad)]
  }
  const [x1, y1] = pt(p.start)
  const [x2, y2] = pt(p.start + p.sweep)
  const large = Math.abs(p.sweep) > 180 ? 1 : 0
  const sweepFlag = p.sweep > 0 ? 0 : 1
  return `M${f(x1)} ${f(y1)} A${f(p.rx)} ${f(p.ry)} 0 ${large} ${sweepFlag} ${f(x2)} ${f(y2)}`
}

function drawPrimitive(p: Primitive): string {
  switch (p.kind) {
    case 'line':
      return `<line x1="${f(p.x1)}" y1="${f(p.y1)}" x2="${f(p.x2)}" y2="${f(p.y2)}" ${paint(p.style)}/>`
    case 'rect':
      return `<rect x="${f(p.x)}" y="${f(p.y)}" width="${f(p.w)}" height="${f(p.h)}" rx="${f(p.rx)}" ry="${f(p.ry)}" ${paint(p.style)}/>`
    case 'ellipse':
      return `<ellipse cx="${f(p.cx)}" cy="${f(p.cy)}" rx="${f(p.rx)}" ry="${f(p.ry)}" ${paint(p.style)}/>`
    case 'arc':
      return `<path d="${arcPath(p)}" ${paint({ ...p.style, fill: 'none' })}/>`
    case 'polygon': {
      const pts = p.points.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')
      return p.closed
        ? `<polygon points="${pts}" ${paint(p.style)}/>`
        : `<polyline points="${pts}" ${paint({ ...p.style, fill: 'none' })}/>`
    }
    case 'text': {
      const rot = p.rotation ? ` transform="rotate(${f(p.rotation)} ${f(p.x)} ${f(p.y)})"` : ''
      const base = p.anchorTop ? ' dominant-baseline="hanging"' : ''
      // A Qt point is 1.33 pixels at 96 dpi.
      return `<text x="${f(p.x)}" y="${f(p.y)}" font-size="${f(p.size * 1.33)}" fill="${p.color}" font-family="Liberation Sans, Arial, sans-serif"${base}${rot}>${esc(p.text)}</text>`
    }
  }
}

/** Draws one element as an SVG document. The view box puts the hotspot at the origin. */
export function renderSvg(s: ElementSymbol, options: RenderOptions = {}): string {
  const { showTerminals = true, scale = 2 } = options
  const out = s.primitives.map(drawPrimitive)
  if (showTerminals) {
    for (const t of s.terminals) out.push(`<circle cx="${f(t.x)}" cy="${f(t.y)}" r="1.5" fill="red"/>`)
  }
  const vb = `${f(-s.hotspotX)} ${f(-s.hotspotY)} ${f(s.width)} ${f(s.height)}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${f(s.width * scale)}" height="${f(s.height * scale)}" stroke-linecap="square">${out.join('')}</svg>`
}
