// The symbol model of one QElectroTech element (a `.elmt` file).
// The reader fills it. The SVG renderer draws it.
// All coordinates are in element units, relative to the hotspot.

export interface StrokeStyle {
  /** A CSS colour name, a hex colour, or "none". */
  stroke: string
  /** A CSS colour name, a hex colour, or "none". */
  fill: string
  width: number
  /** An SVG `stroke-dasharray` value, or null for a solid line. */
  dash: string | null
}

export type Primitive =
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; style: StrokeStyle }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number; ry: number; style: StrokeStyle }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; style: StrokeStyle }
  | {
      kind: 'arc'
      cx: number
      cy: number
      rx: number
      ry: number
      /** The start angle in degrees, counterclockwise from 3 o'clock (Qt rule). */
      start: number
      /** The sweep in degrees. A positive value goes counterclockwise. */
      sweep: number
      style: StrokeStyle
    }
  | { kind: 'polygon'; points: [number, number][]; closed: boolean; style: StrokeStyle }
  | {
      kind: 'text'
      x: number
      y: number
      text: string
      /** The font size in points. */
      size: number
      color: string
      rotation: number
      /** True for `dynamic_text`: the anchor is the top left corner, not the baseline. */
      anchorTop: boolean
    }

export type Orientation = 'n' | 'e' | 's' | 'w'

export interface Terminal {
  /** The UUID of the terminal. Many terminals have no name, so the UUID is the identity. */
  id: string
  name: string
  x: number
  y: number
  orientation: Orientation
}

export interface ElementSymbol {
  uuid: string
  /** The element name in each language, by language code (for example "en", "fr"). */
  names: Record<string, string>
  linkType: string
  width: number
  height: number
  hotspotX: number
  hotspotY: number
  primitives: Primitive[]
  terminals: Terminal[]
  /** The tags in `<description>` that the reader does not know. */
  unknown: string[]
}
