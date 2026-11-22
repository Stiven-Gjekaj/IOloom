// Reads a QElectroTech `.elmt` file into the symbol model.
import { XMLParser, XMLValidator } from 'fast-xml-parser'

import type { ElementSymbol, Orientation, Primitive, StrokeStyle } from './model'

/** The error that the reader gives for a file that it cannot read. */
export class ElmtError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ElmtError'
  }
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  preserveOrder: true,
  parseAttributeValue: false,
  trimValues: false,
  processEntities: true,
})

const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'string' ? Number.parseFloat(v) : Number.NaN
  return Number.isFinite(n) ? n : d
}

// A colour goes into an SVG attribute, and the file comes from the user.
// Thus the reader accepts only a plain name or a hex value.
const SAFE_COLOUR = /^(?:[a-z]+|#[0-9a-f]{3,8})$/

// QElectroTech writes Qt colour names: "HTMLBlueDarkBlue" is the CSS name "darkblue".
export const colour = (v: string | undefined, d: string): string => {
  if (!v) return d
  const m = /^HTML[A-Z][a-z]+(.+)$/.exec(v)
  const c = (m ? m[1] : v).toLowerCase()
  return SAFE_COLOUR.test(c) ? c : d
}

// QElectroTech draws the weight "none" with a transparent pen, and "thin" with a cosmetic pen of 1 pixel.
const WEIGHT: Record<string, number> = { thin: 0.5, normal: 1, hight: 2, eleve: 5 }
const DASH: Record<string, string | null> = {
  normal: null,
  dashed: '4 2',
  dotted: '1 2',
  dashdotted: '4 2 1 2',
}
const HATCH = new Set(['hor', 'ver', 'bdiag', 'fdiag'])

export function parseStyle(s: string | undefined): StrokeStyle {
  const kv: Record<string, string> = {}
  for (const part of (s ?? '').split(';')) {
    const i = part.indexOf(':')
    if (i > 0) kv[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  const filling = kv.filling ?? 'none'
  const weight = kv['line-weight'] ?? 'normal'
  return {
    stroke: weight === 'none' ? 'none' : colour(kv.color, 'black'),
    fill: HATCH.has(filling) ? 'none' : colour(filling, 'none'),
    width: WEIGHT[weight] ?? 1,
    dash: DASH[kv['line-style'] ?? 'normal'] ?? null,
  }
}

type Node = Record<string, unknown> & { ':@'?: Record<string, string> }
const tagOf = (n: Node): string => Object.keys(n).find((k) => k !== ':@') ?? ''
const kids = (n: Node): Node[] => {
  const v = n[tagOf(n)]
  return Array.isArray(v) ? (v as Node[]) : []
}
const textOf = (n: Node): string =>
  kids(n)
    .map((k) => (typeof k['#text'] === 'string' ? k['#text'] : ''))
    .join('')

// A QFont string is "family,pointSize,...". The reader uses only the size.
const fontSize = (font: string | undefined, d: number): number => {
  const n = Number.parseFloat((font ?? '').split(',')[1] ?? '')
  return Number.isFinite(n) && n > 0 ? n : d
}

const orientation = (o: string | undefined): Orientation => (o === 'e' || o === 's' || o === 'w' ? o : 'n')

/**
 * Reads the XML text of one `.elmt` file.
 * Throws an `ElmtError` with a clear message if the file is not a valid element.
 */
export function readElmt(xml: string): ElementSymbol {
  const valid = XMLValidator.validate(xml)
  if (valid !== true) {
    throw new ElmtError(`The XML is not valid: ${valid.err.msg} (line ${valid.err.line})`)
  }
  const doc = parser.parse(xml) as Node[]
  const def = doc.find((n) => tagOf(n) === 'definition')
  if (!def) throw new ElmtError('The file has no <definition> root element.')
  const a = def[':@'] ?? {}
  if (a.type !== 'element') {
    throw new ElmtError(`The definition type is "${a.type ?? ''}". It must be "element".`)
  }
  const sym: ElementSymbol = {
    uuid: '',
    names: {},
    linkType: a.link_type ?? 'simple',
    width: num(a.width),
    height: num(a.height),
    hotspotX: num(a.hotspot_x),
    hotspotY: num(a.hotspot_y),
    primitives: [],
    terminals: [],
    unknown: [],
  }
  for (const n of kids(def)) {
    const t = tagOf(n)
    if (t === 'uuid') sym.uuid = n[':@']?.uuid ?? ''
    else if (t === 'names') {
      for (const nm of kids(n)) if (tagOf(nm) === 'name') sym.names[nm[':@']?.lang ?? '?'] = textOf(nm)
    } else if (t === 'description') readDescription(n, sym)
  }
  return sym
}

function readPrimitive(t: string, n: Node, a: Record<string, string>): Primitive | null {
  const style = parseStyle(a.style)
  switch (t) {
    case 'line':
      return { kind: 'line', x1: num(a.x1), y1: num(a.y1), x2: num(a.x2), y2: num(a.y2), style }
    case 'rect':
      return {
        kind: 'rect',
        x: num(a.x),
        y: num(a.y),
        w: num(a.width),
        h: num(a.height),
        rx: num(a.rx),
        ry: num(a.ry),
        style,
      }
    case 'ellipse': {
      const w = num(a.width)
      const h = num(a.height)
      return { kind: 'ellipse', cx: num(a.x) + w / 2, cy: num(a.y) + h / 2, rx: w / 2, ry: h / 2, style }
    }
    case 'circle': {
      const d = num(a.diameter)
      return { kind: 'ellipse', cx: num(a.x) + d / 2, cy: num(a.y) + d / 2, rx: d / 2, ry: d / 2, style }
    }
    case 'arc': {
      const w = num(a.width)
      const h = num(a.height)
      return {
        kind: 'arc',
        cx: num(a.x) + w / 2,
        cy: num(a.y) + h / 2,
        rx: w / 2,
        ry: h / 2,
        start: num(a.start),
        sweep: num(a.angle),
        style,
      }
    }
    case 'polygon': {
      const points: [number, number][] = []
      for (let i = 1; `x${i}` in a; i++) points.push([num(a[`x${i}`]), num(a[`y${i}`])])
      return { kind: 'polygon', points, closed: a.closed !== 'false', style }
    }
    case 'text':
      return {
        kind: 'text',
        x: num(a.x),
        y: num(a.y),
        text: a.text ?? '',
        size: num(a.size, fontSize(a.font, 9)),
        color: colour(a.color, 'black'),
        rotation: num(a.rotation),
        anchorTop: false,
      }
    case 'dynamic_text': {
      const txt = kids(n).find((k) => tagOf(k) === 'text')
      return {
        kind: 'text',
        x: num(a.x),
        y: num(a.y),
        text: txt ? textOf(txt) : '',
        size: fontSize(a.font, num(a.text_size, 9)),
        color: colour(a.color, 'black'),
        rotation: num(a.rotation),
        anchorTop: true,
      }
    }
    case 'input':
      return {
        kind: 'text',
        x: num(a.x),
        y: num(a.y),
        text: a.text ?? '',
        size: num(a.size, 9),
        color: 'black',
        rotation: 0,
        anchorTop: false,
      }
    default:
      return null
  }
}

function readDescription(desc: Node, sym: ElementSymbol): void {
  for (const n of kids(desc)) {
    const t = tagOf(n)
    if (t === '#text') continue
    const a = n[':@'] ?? {}
    if (t === 'terminal') {
      sym.terminals.push({
        id: a.uuid ?? '',
        name: a.name ?? '',
        x: num(a.x),
        y: num(a.y),
        orientation: orientation(a.orientation),
      })
      continue
    }
    const p = readPrimitive(t, n, a)
    if (p) sym.primitives.push(p)
    else sym.unknown.push(t)
  }
}
