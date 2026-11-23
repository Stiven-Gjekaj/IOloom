/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'

import type { ConfiguredEtherCATDevice } from '../../../middleware/shared/ports/esi-types'
import type { PLCProjectData, PLCVariable } from '../../../middleware/shared/ports/types'
import type { OpenPLCStore } from '../../store'
import { createTestStore } from '../../store/testing'
import { getScopeCompletions, resolveScopeExpressionType } from '../graphical-scope'
import {
  collectDeclaredConstantTypes,
  collectDeclaredRoots,
  findDeclaredVariable,
  rootIdentifierOf,
} from '../project-scope-roots'
import { registerScopedQueryApi, type ScopedCompletionItem } from '../st-lsp/scoped-query'

/** strucpp emits Variable(6) for instance members, Field(5) for STRUCT members. */
const VARIABLE = 6
const FIELD = 5
/** strucpp emits Constant(21), with no type, for a name in a VAR CONSTANT block. */
const CONSTANT = 21

/** Records the prefixes asked of the LSP, so a test can prove a round-trip never happened. */
function withScopedQuery(items: Record<string, ScopedCompletionItem[]>) {
  const asked: string[] = []
  registerScopedQueryApi({
    completeInScope: (_pou, prefix) => {
      asked.push(prefix)
      return Promise.resolve(items[prefix] ?? [])
    },
  })
  return asked
}

function variable(name: string, value: string): PLCVariable {
  return {
    id: name,
    name,
    type: { definition: 'base-type', value },
    class: 'local',
    location: '',
    documentation: '',
    debug: false,
  } as PLCVariable
}

function constant(name: string, value: string, variableClass: PLCVariable['class'] = 'local'): PLCVariable {
  return { ...variable(name, value), class: variableClass, flag: 'constant' }
}

/** A drive with both mandatory CiA 402 objects mapped, which is what makes it an axis. */
function cia402Drive(name: string): ConfiguredEtherCATDevice {
  return {
    name,
    cia402: { enabled: true, scaleNum: 1, scaleDenom: 1, scaleFactor: 1 },
    channelInfo: [
      { channelId: 'c1', direction: 'output', entryIndex: '0x6040' },
      { channelId: 'c2', direction: 'input', entryIndex: '0x6041' },
    ],
    channelMappings: [
      { channelId: 'c1', iecLocation: '%QW100' },
      { channelId: 'c2', iecLocation: '%IW100' },
    ],
  } as ConfiguredEtherCATDevice
}

function projectData(variables: PLCVariable[], extra: Partial<PLCProjectData> = {}): PLCProjectData {
  return {
    dataTypes: [],
    pous: [
      {
        name: 'main',
        pouType: 'program',
        interface: { variables },
        body: { language: 'ld', value: {} as never },
        documentation: '',
      },
    ],
    configurations: { resource: { tasks: [], instances: [], globalVariables: [] } },
    globalVariableLists: [],
    remoteDevices: [],
    ...extra,
  } as PLCProjectData
}

function setProject(variables: PLCVariable[], extra: Partial<PLCProjectData> = {}) {
  const data = projectData(variables, extra)
  store.setState((s) => ({ ...s, project: { ...s.project, data: { ...s.project.data, ...data } } }))
}

let store: OpenPLCStore

beforeEach(() => {
  store = createTestStore()
})

afterEach(() => registerScopedQueryApi(null))

describe('rootIdentifierOf', () => {
  it('takes the leading identifier, uppercased', () => {
    expect(rootIdentifierOf('TON0')).toBe('TON0')
    expect(rootIdentifierOf('ton0.Q')).toBe('TON0')
    expect(rootIdentifierOf('s.a.b')).toBe('S')
  })

  it('cuts at a subscript, so an array element resolves to its array', () => {
    expect(rootIdentifierOf('arr[3]')).toBe('ARR')
    expect(rootIdentifierOf('grid[1,2].x')).toBe('GRID')
  })

  it('ignores surrounding whitespace', () => {
    expect(rootIdentifierOf('  b1  ')).toBe('B1')
  })
})

describe('collectDeclaredRoots', () => {
  it('collects the POU interface, the resource globals and the global variable lists', () => {
    const roots = collectDeclaredRoots(
      projectData([variable('b1', 'BOOL')], {
        configurations: { resource: { tasks: [], instances: [], globalVariables: [variable('g1', 'BOOL')] } },
        globalVariableLists: [{ name: 'GVL', variables: [variable('Output1', 'BOOL')] }],
      }),
      'main',
    )

    expect(roots).toEqual(new Set(['B1', 'G1', 'GVL']))
  })

  it('collects SoftMotion axes, which the project declares nowhere else', () => {
    const roots = collectDeclaredRoots(
      projectData([], {
        remoteDevices: [
          { name: 'bus', protocol: 'ethercat', ethercatConfig: { devices: [cia402Drive('X_Axis')] } },
        ] as PLCProjectData['remoteDevices'],
      }),
      'main',
    )

    expect(roots.has('X_AXIS')).toBe(true)
  })

  it('is scoped to one POU: another POU’s locals are not roots here', () => {
    const data = projectData([variable('mine', 'BOOL')])
    data.pous.push({
      name: 'other',
      pouType: 'program',
      interface: { variables: [variable('theirs', 'BOOL')] },
      body: { language: 'ld', value: {} as never },
      documentation: '',
    })

    const roots = collectDeclaredRoots(data, 'main')

    expect(roots.has('MINE')).toBe(true)
    expect(roots.has('THEIRS')).toBe(false)
  })
})

describe('getScopeCompletions', () => {
  it('lists every type-compatible symbol in scope when the box is empty', async () => {
    setProject([variable('b1', 'BOOL'), variable('b2', 'BOOL'), variable('n1', 'INT')])
    withScopedQuery({
      '': [
        { label: 'b1', insertText: 'b1', type: 'BOOL', kind: VARIABLE },
        { label: 'b2', insertText: 'b2', type: 'BOOL', kind: VARIABLE },
        { label: 'n1', insertText: 'n1', type: 'INT', kind: VARIABLE },
      ],
    })

    const items = await getScopeCompletions(store, 'main', '', 'BOOL')

    expect(items.map((i) => i.insertText)).toEqual(['b1', 'b2'])
  })

  it('never drills into a member when the box is empty, even with no direct hit', async () => {
    setProject([variable('TON0', 'TON')])
    const asked = withScopedQuery({
      '': [{ label: 'TON0', insertText: 'TON0', type: 'TON', kind: VARIABLE }],
      'TON0.': [{ label: 'Q', insertText: 'Q', type: 'BOOL', kind: VARIABLE }],
    })

    const items = await getScopeCompletions(store, 'main', '', 'BOOL')

    expect(items).toEqual([])
    expect(asked).toEqual([''])
  })

  it('drills into a member under an anchor that has no direct hit', async () => {
    setProject([], {
      globalVariableLists: [{ name: 'GVL', variables: [variable('TON0', 'TON')] }],
    })
    withScopedQuery({
      'GVL.': [{ label: 'TON0', insertText: 'TON0', type: 'TON', kind: FIELD }],
      'GVL.TON0.': [
        { label: 'Q', insertText: 'Q', type: 'BOOL', kind: VARIABLE },
        { label: 'PT', insertText: 'PT', type: 'TIME', kind: VARIABLE },
      ],
    })

    const items = await getScopeCompletions(store, 'main', 'GVL.', 'BOOL')

    expect(items.map((i) => i.insertText)).toEqual(['GVL.TON0.Q'])
  })

  it('still drills into an instance member for a typed partial', async () => {
    setProject([variable('TON0', 'TON')])
    withScopedQuery({
      '': [{ label: 'TON0', insertText: 'TON0', type: 'TON', kind: VARIABLE }],
      'TON0.': [
        { label: 'Q', insertText: 'Q', type: 'BOOL', kind: VARIABLE },
        { label: 'PT', insertText: 'PT', type: 'TIME', kind: VARIABLE },
      ],
    })

    const items = await getScopeCompletions(store, 'main', 'TO', 'BOOL')

    expect(items.map((i) => i.insertText)).toEqual(['TON0.Q'])
  })

  it('drops a type-compatible candidate whose root the project never declared', async () => {
    setProject([variable('b1', 'BOOL')])
    withScopedQuery({
      '': [
        { label: 'b1', insertText: 'b1', type: 'BOOL', kind: VARIABLE },
        { label: 'LIB_FLAG', insertText: 'LIB_FLAG', type: 'BOOL', kind: VARIABLE },
      ],
    })

    const items = await getScopeCompletions(store, 'main', '', 'BOOL')

    expect(items.map((i) => i.insertText)).toEqual(['b1'])
  })

  it('never reaches a library global through the drill-down', async () => {
    setProject([])
    const asked = withScopedQuery({
      '': [{ label: 'SETUP', insertText: 'SETUP', type: 'CONSTANTS_SETUP', kind: VARIABLE }],
      'SETUP.': [{ label: 'EXTENDED_ASCII', insertText: 'EXTENDED_ASCII', type: 'BOOL', kind: FIELD }],
    })

    const items = await getScopeCompletions(store, 'main', 'SET', 'BOOL')

    expect(items).toEqual([])
    expect(asked).toEqual([''])
  })

  it('asks the LSP nothing when the anchor root is undeclared', async () => {
    setProject([variable('b1', 'BOOL')])
    const asked = withScopedQuery({
      'SETUP.': [{ label: 'EXTENDED_ASCII', insertText: 'EXTENDED_ASCII', type: 'BOOL', kind: FIELD }],
    })

    const items = await getScopeCompletions(store, 'main', 'SETUP.EXT', 'BOOL')

    expect(items).toEqual([])
    expect(asked).toEqual([])
  })

  it('keeps a struct member whose root is declared', async () => {
    setProject([variable('s', 'MyStruct')])
    withScopedQuery({
      's.': [
        { label: 'a', insertText: 'a', type: 'BOOL', kind: FIELD },
        { label: 'n', insertText: 'n', type: 'INT', kind: FIELD },
      ],
    })

    const items = await getScopeCompletions(store, 'main', 's.', 'BOOL')

    expect(items.map((i) => i.insertText)).toEqual(['s.a'])
  })

  it('keeps an array element, whose root is the array', async () => {
    setProject([variable('arr', 'ARRAY [0..3] OF BOOL')])
    withScopedQuery({
      '': [
        { label: 'arr[0]', insertText: 'arr[0]', type: 'BOOL', kind: VARIABLE },
        { label: 'arr[1]', insertText: 'arr[1]', type: 'BOOL', kind: VARIABLE },
      ],
    })

    const items = await getScopeCompletions(store, 'main', '', 'BOOL')

    expect(items.map((i) => i.insertText)).toEqual(['arr[0]', 'arr[1]'])
  })

  it('keeps a global variable list member', async () => {
    setProject([], {
      globalVariableLists: [{ name: 'GVL', variables: [variable('Output1', 'BOOL')] }],
    })
    withScopedQuery({
      'GVL.': [{ label: 'Output1', insertText: 'Output1', type: 'BOOL', kind: FIELD }],
    })

    const items = await getScopeCompletions(store, 'main', 'GVL.', 'BOOL')

    expect(items.map((i) => i.insertText)).toEqual(['GVL.Output1'])
  })
})

describe('declared constants (upstream issue 1232)', () => {
  it('maps each constant of the POU and of the resource to its type, and leaves out plain variables', () => {
    const types = collectDeclaredConstantTypes(
      projectData([constant('aConst', 'INT'), variable('n1', 'INT')], {
        configurations: {
          resource: { tasks: [], instances: [], globalVariables: [constant('gConst', 'REAL', 'global')] },
        },
      }),
      'main',
    )

    expect(types).toEqual(
      new Map([
        ['GCONST', 'REAL'],
        ['ACONST', 'INT'],
      ]),
    )
  })

  it('offers a local constant of a compatible type on a typed pin', async () => {
    setProject([constant('aConst', 'INT'), variable('n1', 'INT')])
    withScopedQuery({
      '': [
        { label: 'aConst', insertText: 'aConst', kind: CONSTANT },
        { label: 'n1', insertText: 'n1', type: 'INT', kind: VARIABLE },
      ],
    })

    const items = await getScopeCompletions(store, 'main', 'a', 'INT')

    expect(items).toEqual([{ label: 'aConst', insertText: 'aConst', type: 'INT' }])
  })

  it('does not offer a constant of an incompatible type', async () => {
    setProject([constant('aConst', 'INT')])
    withScopedQuery({ '': [{ label: 'aConst', insertText: 'aConst', kind: CONSTANT }] })

    expect(await getScopeCompletions(store, 'main', '', 'BOOL')).toEqual([])
  })

  it('does not offer a constant that the project does not declare', async () => {
    setProject([])
    withScopedQuery({ '': [{ label: 'LIB_CONST', insertText: 'LIB_CONST', kind: CONSTANT }] })

    expect(await getScopeCompletions(store, 'main', '', undefined)).toEqual([])
  })

  it('resolves the type of a typed-in constant, so the box is not flagged', async () => {
    withScopedQuery({ '': [{ label: 'aConst', insertText: 'aConst', kind: CONSTANT }] })

    const types = new Map([['ACONST', 'INT']])
    expect(await resolveScopeExpressionType('main', 'aConst', types)).toEqual({ status: 'resolved', type: 'INT' })
    expect(await resolveScopeExpressionType('main', 'aConst')).toEqual({ status: 'unknown' })
  })
})

describe('findDeclaredVariable (upstream issue 1232)', () => {
  const data = () =>
    projectData([variable('d', 'BOOL')], {
      configurations: { resource: { tasks: [], instances: [], globalVariables: [variable('g', 'INT')] } },
    })

  it('finds a variable of the POU whatever the case', () => {
    expect(findDeclaredVariable(data(), 'main', 'D')?.name).toBe('d')
  })

  it('finds a resource global', () => {
    expect(findDeclaredVariable(data(), 'main', 'g')?.name).toBe('g')
  })

  it('prefers the POU variable over a global of the same name', () => {
    const project = projectData([variable('x', 'BOOL')], {
      configurations: { resource: { tasks: [], instances: [], globalVariables: [variable('x', 'INT')] } },
    })
    expect(findDeclaredVariable(project, 'main', 'x')?.type.value).toBe('BOOL')
  })

  it('finds nothing for an undeclared or empty name', () => {
    expect(findDeclaredVariable(data(), 'main', 'missing')).toBeUndefined()
    expect(findDeclaredVariable(data(), 'main', '  ')).toBeUndefined()
  })
})
