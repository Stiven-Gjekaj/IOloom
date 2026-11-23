/**
 * An INTERFACE POU compiles (upstream issue 1266). The emitter writes its header with the
 * EXTENDS clause, its METHOD prototypes, and END_INTERFACE. It writes no VAR block, because
 * the VAR blocks of an interface belong to its methods. Both converters that feed the
 * emitter keep the EXTENDS clause.
 */
import type { PLCPou } from '../../../../../middleware/shared/ports/types'
import type { PLCProjectData as SchemaPLCProjectData } from '../../../types/PLC/open-plc'
import { fromPortShape } from '../../transpile-from-port'
import { fromSchemaShape } from '../from-schema'
import { transpileToSt } from '../index'
import type { TranspilePou } from '../types'

const methods = 'METHOD Run : BOOL\n  VAR_INPUT\n    speed : INT;\n  END_VAR\nEND_METHOD'

const st = (pou: TranspilePou): string => {
  const result = transpileToSt({
    pous: [pou],
    dataTypes: [],
    configuration: { tasks: [], instances: [], globalVariables: [] },
  })
  expect(result.errors).toEqual([])
  return result.programSt ?? ''
}

describe('INTERFACE emission', () => {
  it('writes the header, the methods and END_INTERFACE, with no POU VAR block', () => {
    const out = st({
      name: 'I_Motor',
      pouType: 'interface',
      declarationClauses: 'EXTENDS I_Run',
      interface: { variables: [] },
      body: { language: 'st', value: methods },
    })

    expect(out).toContain(
      'INTERFACE I_Motor EXTENDS I_Run\n\n  METHOD Run : BOOL\n    VAR_INPUT\n      speed : INT;\n    END_VAR\n  END_METHOD\nEND_INTERFACE\n',
    )
  })

  it('writes an empty interface', () => {
    expect(
      st({ name: 'I_Empty', pouType: 'interface', interface: { variables: [] }, body: { language: 'st', value: '' } }),
    ).toContain('INTERFACE I_Empty\n\nEND_INTERFACE\n')
  })

  it('keeps the EXTENDS clause through the schema converter', () => {
    const data = {
      dataTypes: [],
      configuration: { resource: { tasks: [], instances: [], globalVariables: [] } },
      libraries: [],
      pous: [
        {
          type: 'interface',
          data: {
            name: 'I_Motor',
            language: 'st',
            variables: [],
            body: { language: 'st', value: methods },
            documentation: '',
            declarationClauses: 'EXTENDS I_Run',
          },
        },
      ],
    } as unknown as SchemaPLCProjectData

    expect(fromSchemaShape(data).pous[0]).toMatchObject({ pouType: 'interface', declarationClauses: 'EXTENDS I_Run' })
  })

  it('keeps the EXTENDS clause through the port converter', () => {
    const pou: PLCPou = {
      name: 'I_Motor',
      pouType: 'interface',
      declarationClauses: 'EXTENDS I_Run',
      interface: { variables: [] },
      body: { language: 'st', value: methods },
    }
    const ir = fromPortShape({
      dataTypes: [],
      pous: [pou],
      configurations: { resource: { tasks: [], instances: [], globalVariables: [] } },
    } as unknown as Parameters<typeof fromPortShape>[0])

    expect(ir.pous[0]).toMatchObject({ pouType: 'interface', declarationClauses: 'EXTENDS I_Run' })
  })
})
