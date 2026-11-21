// Spike: read a QElectroTech .elmt file into a symbol model, and draw it as SVG.
import { XMLParser } from 'fast-xml-parser'

export interface Style {
  stroke: string
  fill: string
  width: number
  dash: string | null
}
export type Primitive =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; style: Style }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number; ry: number; style: Style }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; style: Style }
  | { kind: 'arc'; cx: number; cy: number; rx: number; ry: number; start: number; sweep: number; style: Style }
  | { kind: 'polygon'; points: [number, number][]; closed: boolean; style: Style }
  | { kind: 'text'; x: number; y: number; text: string; size: number; color: string; rotation: number; anchorTop: boolean }
export interface Terminal {
  id: string
  name: string
  x: number
  y: number
  orientation: 'n' | 'e' | 's' | 'w'
}
export interface Symbol {
  uuid: string
  names: Record<string, string>
  linkType: string
  width: number
  height: number
  hotspotX: number
  hotspotY: number
  primitives: Primitive[]
  terminals: Terminal[]
  unknown: string[]
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

// Qt colour names in QET: "HTMLBlueDarkBlue" means the CSS name "darkblue".
const colour = (v: string | undefined, d: string): string => {
  if (!v) return d
  if (v === 'none') return 'none'
  const m = /^HTML[A-Z][a-z]+(.+)$/.exec(v)
  return (m ? m[1] : v).toLowerCase()
}
const WEIGHT: Record<string, number> = { none: 0.5, thin: 0.5, normal: 1, hight: 2, eleve: 5 }
const DASH: Record<string, string | null> = { normal: null, dashed: '4 2', dotted: '1 2', dashdotted: '4 2 1 2' }
const HATCH = new Set(['hor', 'ver', 'bdiag', 'fdiag'])

function parseStyle(s: string | undefined): Style {
  const kv: Record<string, string> = {}
  for (const part of (s ?? '').split(';')) {
    const i = part.indexOf(':')
    if (i > 0) kv[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  const filling = kv.filling ?? 'none'
  return {
    stroke: colour(kv.color, 'black'),
    fill: HATCH.has(filling) ? 'none' : colour(filling, 'none'),
    width: WEIGHT[kv['line-weight'] ?? 'normal'] ?? 1,
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
    .map((k) => (typeof k['#text'] === 'string' ? (k['#text'] as string) : ''))
    .join('')

// A QFont string is "family,pointSize,...". Only the size matters here.
const fontSize = (font: string | undefined, d: number): number => {
  const p = (font ?? '').split(',')
  const n = Number.parseFloat(p[1] ?? '')
  return Number.isFinite(n) && n > 0 ? n : d
}

export function readElmt(xml: string): Symbol {
  const doc = parser.parse(xml) as Node[]
  const def = doc.find((n) => tagOf(n) === 'definition')
  if (!def) throw new Error('no <definition> root')
  const a = def[':@'] ?? {}
  if (a.type !== 'element') throw new Error(`definition type is "${a.type}", not "element"`)
  const sym: Symbol = {
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
    const at = n[':@'] ?? {}
    if (t === 'uuid') sym.uuid = at.uuid ?? ''
    else if (t === 'names') {
      for (const nm of kids(n)) if (tagOf(nm) === 'name') sym.names[nm[':@']?.lang ?? '?'] = textOf(nm)
    } else if (t === 'description') readDescription(n, sym)
  }
  return sym
}

function readDescription(desc: Node, sym: Symbol): void {
  for (const n of kids(desc)) {
    const t = tagOf(n)
    if (t === '#text') continue
    const a = n[':@'] ?? {}
    const style = parseStyle(a.style)
    switch (t) {
      case 'line':
        sym.primitives.push({ kind: 'line', x1: num(a.x1), y1: num(a.y1), x2: num(a.x2), y2: num(a.y2), style })
        break
      case 'rect':
        sym.primitives.push({
          kind: 'rect', x: num(a.x), y: num(a.y), w: num(a.width), h: num(a.height),
          rx: num(a.rx), ry: num(a.ry), style,
        })
        break
      case 'ellipse': {
        const w = num(a.width), h = num(a.height)
        sym.primitives.push({ kind: 'ellipse', cx: num(a.x) + w / 2, cy: num(a.y) + h / 2, rx: w / 2, ry: h / 2, style })
        break
      }
      case 'circle': {
        const d = num(a.diameter)
        sym.primitives.push({ kind: 'ellipse', cx: num(a.x) + d / 2, cy: num(a.y) + d / 2, rx: d / 2, ry: d / 2, style })
        break
      }
      case 'arc': {
        const w = num(a.width), h = num(a.height)
        sym.primitives.push({
          kind: 'arc', cx: num(a.x) + w / 2, cy: num(a.y) + h / 2, rx: w / 2, ry: h / 2,
          start: num(a.start), sweep: num(a.angle), style,
        })
        break
      }
      case 'polygon': {
        const points: [number, number][] = []
        for (let i = 1; `x${i}` in a; i++) points.push([num(a[`x${i}`]), num(a[`y${i}`])])
        sym.primitives.push({ kind: 'polygon', points, closed: a.closed !== 'false', style })
        break
      }
      case 'text':
        sym.primitives.push({
          kind: 'text', x: num(a.x), y: num(a.y), text: a.text ?? '', size: num(a.size, fontSize(a.font, 9)),
          color: colour(a.color, 'black'), rotation: num(a.rotation), anchorTop: false,
        })
        break
      case 'dynamic_text': {
        const txt = kids(n).find((k) => tagOf(k) === 'text')
        sym.primitives.push({
          kind: 'text', x: num(a.x), y: num(a.y), text: txt ? textOf(txt) : '', size: fontSize(a.font, num(a.text_size, 9)),
          color: colour(a.color, 'black'), rotation: num(a.rotation), anchorTop: true,
        })
        break
      }
      case 'input':
        sym.primitives.push({
          kind: 'text', x: num(a.x), y: num(a.y), text: a.text ?? '', size: num(a.size, 9),
          color: 'black', rotation: 0, anchorTop: false,
        })
        break
      case 'terminal': {
        const o = a.orientation
        sym.terminals.push({
          id: a.uuid ?? '', name: a.name ?? '', x: num(a.x), y: num(a.y),
          orientation: o === 'e' || o === 's' || o === 'w' ? o : 'n',
        })
        break
      }
      default:
        sym.unknown.push(t)
    }
  }
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const f = (n: number): string => (Math.round(n * 100) / 100).toString()
const stroke = (s: Style): string =>
  `stroke="${s.stroke}" stroke-width="${s.width}" fill="${s.fill}"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}`

// Qt angles go counterclockwise from 3 o'clock, in degrees, on a y-down canvas.
function arcPath(p: Extract<Primitive, { kind: 'arc' }>): string {
  const pt = (deg: number): [number, number] => {
    const r = (deg * Math.PI) / 180
    return [p.cx + p.rx * Math.cos(r), p.cy - p.ry * Math.sin(r)]
  }
  if (Math.abs(p.sweep) >= 360) return `M${f(p.cx - p.rx)} ${f(p.cy)} a${f(p.rx)} ${f(p.ry)} 0 1 0 ${f(2 * p.rx)} 0 a${f(p.rx)} ${f(p.ry)} 0 1 0 ${f(-2 * p.rx)} 0`
  const [x1, y1] = pt(p.start)
  const [x2, y2] = pt(p.start + p.sweep)
  const large = Math.abs(p.sweep) > 180 ? 1 : 0
  const sweepFlag = p.sweep > 0 ? 0 : 1
  return `M${f(x1)} ${f(y1)} A${f(p.rx)} ${f(p.ry)} 0 ${large} ${sweepFlag} ${f(x2)} ${f(y2)}`
}

export function toSvg(s: Symbol): string {
  const out: string[] = []
  for (const p of s.primitives) {
    switch (p.kind) {
      case 'line':
        out.push(`<line x1="${f(p.x1)}" y1="${f(p.y1)}" x2="${f(p.x2)}" y2="${f(p.y2)}" ${stroke(p.style)}/>`)
        break
      case 'rect':
        out.push(`<rect x="${f(p.x)}" y="${f(p.y)}" width="${f(p.w)}" height="${f(p.h)}" rx="${f(p.rx)}" ry="${f(p.ry)}" ${stroke(p.style)}/>`)
        break
      case 'ellipse':
        out.push(`<ellipse cx="${f(p.cx)}" cy="${f(p.cy)}" rx="${f(p.rx)}" ry="${f(p.ry)}" ${stroke(p.style)}/>`)
        break
      case 'arc':
        out.push(`<path d="${arcPath(p)}" ${stroke({ ...p.style, fill: 'none' })}/>`)
        break
      case 'polygon': {
        const pts = p.points.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')
        out.push(p.closed ? `<polygon points="${pts}" ${stroke(p.style)}/>` : `<polyline points="${pts}" ${stroke({ ...p.style, fill: 'none' })}/>`)
        break
      }
      case 'text': {
        const rot = p.rotation ? ` transform="rotate(${f(p.rotation)} ${f(p.x)} ${f(p.y)})"` : ''
        const base = p.anchorTop ? ' dominant-baseline="hanging"' : ''
        out.push(`<text x="${f(p.x)}" y="${f(p.y)}" font-size="${f(p.size * 1.33)}" fill="${p.color}" font-family="Liberation Sans, Arial, sans-serif"${base}${rot}>${esc(p.text)}</text>`)
        break
      }
    }
  }
  for (const t of s.terminals) out.push(`<circle cx="${f(t.x)}" cy="${f(t.y)}" r="1.5" fill="red"/>`)
  const vb = `${f(-s.hotspotX)} ${f(-s.hotspotY)} ${f(s.width)} ${f(s.height)}`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${f(s.width * 2)}" height="${f(s.height * 2)}" stroke-linecap="square">${out.join('')}</svg>`
}
