/** The structured initial value of a structure or block variable (upstream issue 1184, IOloom #23). */
import type { PLCDataType, PLCPou } from '../../../../middleware/shared/ports/types'
import { buildInitializer, initializerMembers, parseInitializer } from '../structured-initial-value'

const scaling: PLCDataType = {
  name: 'Scaling',
  derivation: 'structure',
  variable: [
    { name: 'IN_LO', type: { definition: 'base-type', value: 'INT' }, initialValue: { simpleValue: { value: '0' } } },
    { name: 'PV_HI', type: { definition: 'base-type', value: 'REAL' } },
  ],
}

const pid: PLCPou = {
  name: 'FB_Pid',
  pouType: 'function-block',
  interface: {
    variables: [
      {
        name: 'Kp',
        class: 'input',
        type: { definition: 'base-type', value: 'REAL' },
        location: '',
        documentation: '',
        initialValue: '1.0',
      },
      {
        name: 'Buffer',
        class: 'inOut',
        type: { definition: 'base-type', value: 'INT' },
        location: '',
        documentation: '',
      },
      {
        name: 'Out',
        class: 'output',
        type: { definition: 'base-type', value: 'REAL' },
        location: '',
        documentation: '',
      },
      {
        name: 'acc',
        class: 'local',
        type: { definition: 'base-type', value: 'REAL' },
        location: '',
        documentation: '',
      },
      { name: 'tmp', class: 'temp', type: { definition: 'base-type', value: 'REAL' }, location: '', documentation: '' },
    ],
  },
  body: { language: 'st', value: '' },
}

const ton = {
  name: 'TON',
  type: 'function-block',
  variables: [
    { name: 'IN', class: 'input', type: { value: 'BOOL' } },
    { name: 'PT', class: 'input', type: { value: 'TIME' } },
    { name: 'Q', class: 'output', type: { value: 'BOOL' } },
  ],
}

const context = { pous: [pid], dataTypes: [scaling], libraries: [ton] }

describe('initializerMembers', () => {
  it('lists the members of a structure with their defaults', () => {
    expect(initializerMembers({ definition: 'user-data-type', value: 'scaling' }, context)).toEqual([
      { name: 'IN_LO', type: 'INT', defaultValue: '0' },
      { name: 'PV_HI', type: 'REAL', defaultValue: '' },
    ])
  })

  it('lists the inputs, outputs and locals of a project block, not its IN_OUT or temp', () => {
    expect(initializerMembers({ definition: 'derived', value: 'FB_Pid' }, context)?.map((m) => m.name)).toEqual([
      'Kp',
      'Out',
      'acc',
    ])
  })

  it('lists the members of a library block', () => {
    expect(initializerMembers({ definition: 'derived', value: 'TON' }, context)?.map((m) => m.name)).toEqual([
      'IN',
      'PT',
      'Q',
    ])
  })

  it('gives null for a basic type, an array and an unknown type', () => {
    expect(initializerMembers({ definition: 'base-type', value: 'INT' }, context)).toBeNull()
    expect(initializerMembers({ definition: 'array', value: 'ARRAY [0..1] OF INT' }, context)).toBeNull()
    expect(initializerMembers({ definition: 'derived', value: 'NOPE' }, context)).toBeNull()
  })
})

describe('parseInitializer', () => {
  it('reads the members by upper-case name', () => {
    expect(parseInitializer('(IN_LO := 800, pv_hi := 100.0)')).toEqual(
      new Map([
        ['IN_LO', '800'],
        ['PV_HI', '100.0'],
      ]),
    )
  })

  it('keeps a nested initializer, an array and a string with a comma as one value', () => {
    expect(parseInitializer("(a := (x := 1, y := 2), b := [1, 2], c := 'p, q', d := 'it$'s')")).toEqual(
      new Map([
        ['A', '(x := 1, y := 2)'],
        ['B', '[1, 2]'],
        ['C', "'p, q'"],
        ['D', "'it$'s'"],
      ]),
    )
  })

  it('gives no values for text that is not an initializer', () => {
    expect(parseInitializer('42').size).toBe(0)
    expect(parseInitializer('').size).toBe(0)
  })
})

describe('buildInitializer', () => {
  it('writes the set values and leaves out the empty ones', () => {
    expect(
      buildInitializer([
        { name: 'IN_LO', value: '800' },
        { name: 'PV_HI', value: ' ' },
        { name: 'IN_HI', value: ' 4000 ' },
      ]),
    ).toBe('(IN_LO := 800, IN_HI := 4000)')
  })

  it('gives an empty text when no value is set', () => {
    expect(buildInitializer([{ name: 'a', value: '' }])).toBe('')
  })

  it('reads back what it writes', () => {
    const written = buildInitializer([
      { name: 'a', value: '(x := 1)' },
      { name: 'b', value: "'p, q'" },
    ])
    expect(parseInitializer(written)).toEqual(
      new Map([
        ['A', '(x := 1)'],
        ['B', "'p, q'"],
      ]),
    )
  })
})
