import { colour, ElmtError, parseStyle, readElmt } from '../read-elmt'

// Each test builds its own small element. The tests do not read the QElectroTech collection.
const element = (description: string, extra = ''): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<definition type="element" width="40" height="60" hotspot_x="20" hotspot_y="10" link_type="master" version="0.100.0"${extra}>
  <uuid uuid="{1234-abcd}"/>
  <names>
    <name lang="en">Contactor</name>
    <name lang="de">Schütz</name>
  </names>
  <description>${description}</description>
</definition>`

describe('readElmt', () => {
  it('reads the definition, the UUID and the names', () => {
    const s = readElmt(element(''))
    expect(s).toMatchObject({
      uuid: '{1234-abcd}',
      names: { en: 'Contactor', de: 'Schütz' },
      linkType: 'master',
      width: 40,
      height: 60,
      hotspotX: 20,
      hotspotY: 10,
      primitives: [],
      terminals: [],
      unknown: [],
    })
  })

  it('uses "simple" when the link type is missing', () => {
    const xml = '<definition type="element" width="10" height="10"><description/></definition>'
    expect(readElmt(xml).linkType).toBe('simple')
  })

  it('reads a line with its style', () => {
    const s = readElmt(
      element(
        '<line x1="0" y1="-5" x2="0" y2="5.5" style="line-style:dashed;line-weight:hight;filling:none;color:HTMLBlueDarkBlue"/>',
      ),
    )
    expect(s.primitives).toEqual([
      {
        kind: 'line',
        x1: 0,
        y1: -5,
        x2: 0,
        y2: 5.5,
        style: { stroke: 'darkblue', fill: 'none', hatch: null, width: 2, dash: '4 2' },
      },
    ])
  })

  it('reads a rect, an ellipse and a circle', () => {
    const s = readElmt(
      element(
        '<rect x="-10" y="-5" width="20" height="10" rx="1" ry="2" style="filling:red"/>' +
          '<ellipse x="0" y="0" width="10" height="4"/>' +
          '<circle x="2" y="2" diameter="6"/>',
      ),
    )
    expect(s.primitives).toEqual([
      expect.objectContaining({ kind: 'rect', x: -10, y: -5, w: 20, h: 10, rx: 1, ry: 2 }),
      expect.objectContaining({ kind: 'ellipse', cx: 5, cy: 2, rx: 5, ry: 2 }),
      expect.objectContaining({ kind: 'ellipse', cx: 5, cy: 5, rx: 3, ry: 3 }),
    ])
    expect(s.primitives[0]).toHaveProperty('style.fill', 'red')
  })

  it('reads an arc as a centre, radii, a start angle and a sweep', () => {
    const s = readElmt(element('<arc x="-4" y="-2" width="8" height="4" start="90" angle="-180"/>'))
    expect(s.primitives[0]).toMatchObject({ kind: 'arc', cx: 0, cy: 0, rx: 4, ry: 2, start: 90, sweep: -180 })
  })

  it('reads the points of a polygon and its closed flag', () => {
    const s = readElmt(
      element(
        '<polygon x1="0" y1="0" x2="5" y2="0" x3="5" y3="5" closed="false"/><polygon x1="1" y1="1" x2="2" y2="2"/>',
      ),
    )
    expect(s.primitives).toEqual([
      expect.objectContaining({
        kind: 'polygon',
        points: [
          [0, 0],
          [5, 0],
          [5, 5],
        ],
        closed: false,
      }),
      expect.objectContaining({ kind: 'polygon', closed: true }),
    ])
  })

  it('reads static text, dynamic text and input text', () => {
    const s = readElmt(
      element(
        '<text x="1" y="2" text="K1" font="Sans Serif,7,-1,5,50,0,0,0,0,0" color="#ff0000" rotation="90"/>' +
          '<dynamic_text x="3" y="4" text_size="8" font="Arial,11,-1"><text>-Q1</text></dynamic_text>' +
          '<input x="5" y="6" text="_" size="6"/>',
      ),
    )
    expect(s.primitives).toEqual([
      { kind: 'text', x: 1, y: 2, text: 'K1', size: 7, color: '#ff0000', rotation: 90, anchorTop: false },
      { kind: 'text', x: 3, y: 4, text: '-Q1', size: 11, color: 'black', rotation: 0, anchorTop: true },
      { kind: 'text', x: 5, y: 6, text: '_', size: 6, color: 'black', rotation: 0, anchorTop: false },
    ])
  })

  it('uses the size attribute of a text before its font', () => {
    const s = readElmt(element('<text x="0" y="0" text="A" size="12" font="Arial,7"/>'))
    expect(s.primitives[0]).toHaveProperty('size', 12)
  })

  it('reads terminals with their UUID, name and orientation', () => {
    const s = readElmt(
      element(
        '<terminal x="0" y="-10" orientation="n" uuid="{t1}" name="A1"/>' +
          '<terminal x="0" y="10" orientation="s" uuid="{t2}"/>' +
          '<terminal x="5" y="0" orientation="x"/>',
      ),
    )
    expect(s.terminals).toEqual([
      { id: '{t1}', name: 'A1', x: 0, y: -10, orientation: 'n' },
      { id: '{t2}', name: '', x: 0, y: 10, orientation: 's' },
      { id: '', name: '', x: 5, y: 0, orientation: 'n' },
    ])
  })

  it('records the tags that it does not know', () => {
    const s = readElmt(element('<line x1="0" y1="0" x2="1" y2="1"/><spline/><kindInformations/>'))
    expect(s.unknown).toEqual(['spline', 'kindInformations'])
    expect(s.primitives).toHaveLength(1)
  })

  it('gives zero for a missing or bad number', () => {
    const s = readElmt(element('<line x1="abc" y2="3"/>'))
    expect(s.primitives[0]).toMatchObject({ x1: 0, y1: 0, x2: 0, y2: 3 })
  })

  it('gives a clear error for XML that is not valid', () => {
    expect(() => readElmt('<definition type="element"><description></definition>')).toThrow(ElmtError)
    expect(() => readElmt('<definition type="element"><description></definition>')).toThrow(/not valid/)
  })

  it('gives a clear error when the root is not <definition>', () => {
    expect(() => readElmt('<project/>')).toThrow('The file has no <definition> root element.')
  })

  it('gives a clear error when the definition is not an element', () => {
    expect(() => readElmt('<definition type="borders"/>')).toThrow('The definition type is "borders"')
    expect(() => readElmt('<definition/>')).toThrow('The definition type is ""')
  })
})

describe('parseStyle', () => {
  it('gives the defaults for an empty style', () => {
    expect(parseStyle(undefined)).toEqual({ stroke: 'black', fill: 'none', hatch: null, width: 1, dash: null })
  })

  it('reads each line weight and line style', () => {
    expect(parseStyle('line-weight:thin').width).toBe(0.5)
    expect(parseStyle('line-weight:eleve').width).toBe(5)
    expect(parseStyle('line-weight:unknown').width).toBe(1)
    expect(parseStyle('line-style:dotted').dash).toBe('1 2')
    expect(parseStyle('line-style:dashdotted').dash).toBe('4 2 1 2')
    expect(parseStyle('line-style:wavy').dash).toBeNull()
  })

  it('reads each hatch fill, with no colour fill', () => {
    for (const h of ['hor', 'ver', 'bdiag', 'fdiag']) {
      expect(parseStyle(`filling:${h}`)).toMatchObject({ fill: 'none', hatch: h })
    }
  })

  it('draws no stroke for the line weight "none"', () => {
    expect(parseStyle('line-weight:none;color:red;filling:blue')).toMatchObject({ stroke: 'none', fill: 'blue' })
  })

  it('ignores a part with no colon and spaces around the values', () => {
    expect(parseStyle(' color : red ;junk; filling : white ')).toMatchObject({ stroke: 'red', fill: 'white' })
  })
})

describe('colour', () => {
  it('converts a Qt colour name to a CSS name', () => {
    expect(colour('HTMLRedDarkRed', 'black')).toBe('darkred')
  })

  it('keeps a plain name, a hex value and "none"', () => {
    expect(colour('Green', 'black')).toBe('green')
    expect(colour('#A0B0C0', 'black')).toBe('#a0b0c0')
    expect(colour('none', 'black')).toBe('none')
  })

  it('gives the default for a missing value', () => {
    expect(colour(undefined, 'black')).toBe('black')
  })

  it('refuses a value that can break out of an SVG attribute', () => {
    expect(colour('red" onload="alert(1)', 'black')).toBe('black')
    expect(colour('url(#x)', 'none')).toBe('none')
  })
})
