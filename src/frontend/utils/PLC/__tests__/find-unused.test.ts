/** Finding the unused variables, functions and function blocks (upstream issue 552, IOloom #22). */
import type { PLCPou, PLCProjectData, PLCVariable } from '../../../../middleware/shared/ports/types'
import { findUnusedElements } from '../find-unused'

const v = (name: string, cls: PLCVariable['class'], type = 'INT', initialValue?: string): PLCVariable => ({
  name,
  class: cls,
  type:
    type === 'INT' || type === 'BOOL'
      ? { definition: 'base-type', value: type }
      : { definition: 'derived', value: type },
  location: '',
  documentation: '',
  ...(initialValue ? { initialValue } : {}),
})

const st = (name: string, pouType: PLCPou['pouType'], variables: PLCVariable[], body: string): PLCPou => ({
  name,
  pouType,
  interface: { variables },
  body: { language: 'st', value: body },
})

const project = (pous: PLCPou[], globals: PLCVariable[] = [], extra: Partial<PLCProjectData> = {}): PLCProjectData => ({
  dataTypes: [],
  pous,
  configurations: {
    resource: {
      tasks: [],
      instances: [{ name: 'instance0', program: 'main', task: 'task0' }],
      globalVariables: globals,
    },
  },
  ...extra,
})

/** `<POU or resource>:<name>` for each result, which reads well in a failure. */
const names = (data: PLCProjectData) =>
  findUnusedElements(data).map(
    (m) => `${m.container.kind === 'pou' ? m.container.name : 'resource'}:${m.preview.split(' ')[0]}`,
  )

describe('findUnusedElements', () => {
  it('reports a local variable that its POU never names', () => {
    const main = st('main', 'program', [v('used', 'local'), v('spare', 'local')], 'used := used + 1;')
    expect(names(project([main]))).toEqual(['main:spare'])
  })

  it('does not count a name in a comment or a string as a use', () => {
    const main = st('main', 'program', [v('a', 'local'), v('s', 'local')], "(* a is old *) // a too\ns := 'a';")
    expect(names(project([main]))).toEqual(['main:a'])
  })

  it('counts a use in any letter case, as a field, or as an array index', () => {
    const main = st(
      'main',
      'program',
      [v('Motor', 'local', 'FB_Motor'), v('i', 'local'), v('arr', 'local')],
      'MOTOR.speed := arr[i];',
    )
    const motor = st('FB_Motor', 'function-block', [v('speed', 'input')], '')
    expect(names(project([main, motor]))).toEqual([])
  })

  it('counts a name in the initial value of another variable as a use', () => {
    const main = st('main', 'program', [v('base', 'local'), v('x', 'local', 'INT', 'base + 1')], 'x := 0;')
    expect(names(project([main]))).toEqual([])
  })

  it('never reports an input or output, which belong to the interface of the POU', () => {
    const add = st('Add', 'function', [v('a', 'input'), v('unusedIn', 'input')], 'Add := a;')
    const main = st('main', 'program', [], 'x := Add(1, 2);')
    expect(names(project([main, add]))).toEqual([])
  })

  it('reports a function block that no variable has as its type, and a function nobody calls', () => {
    const main = st('main', 'program', [], '')
    const fb = st('FB_Old', 'function-block', [], '')
    const fn = st('Twice', 'function', [v('x', 'input')], 'Twice := x * 2;')
    expect(names(project([main, fb, fn]))).toEqual(['FB_Old:FB_Old', 'Twice:Twice'])
  })

  it('counts a block as used through a structure member type or a graphical block', () => {
    const main: PLCPou = {
      name: 'main',
      pouType: 'program',
      interface: { variables: [] },
      body: {
        language: 'ld',
        value: {
          name: 'main',
          rungs: [{ nodes: [{ id: 'n1', type: 'block', data: { variant: { name: 'Twice' } } }] }],
        },
      },
    }
    const fb = st('FB_Pump', 'function-block', [], '')
    const fn = st('Twice', 'function', [v('x', 'input')], 'Twice := x * 2;')
    const dataTypes = [
      {
        name: 'Plant',
        derivation: 'structure' as const,
        variable: [{ name: 'pump', type: { definition: 'user-data-type' as const, value: 'FB_Pump' } }],
      },
    ]
    expect(names(project([main, fb, fn], [], { dataTypes }))).toEqual([])
  })

  it('reports a global that no POU names, and keeps one a server names', () => {
    const main = st('main', 'program', [v('gUsed', 'external')], 'gUsed := TRUE;')
    const servers = [
      { name: 'modbus', protocol: 'modbus-tcp', config: { mapping: 'gServed' } },
    ] as unknown as PLCProjectData['servers']
    expect(
      names(
        project([main], [v('gUsed', 'global', 'BOOL'), v('gServed', 'global'), v('gSpare', 'global')], { servers }),
      ),
    ).toEqual(['resource:gSpare'])
  })

  it('does not report the variables of an interface', () => {
    const iface = st('I_Run', 'interface', [], 'METHOD Run : BOOL\nEND_METHOD')
    expect(names(project([st('main', 'program', [], ''), iface]))).toEqual([])
  })
})
