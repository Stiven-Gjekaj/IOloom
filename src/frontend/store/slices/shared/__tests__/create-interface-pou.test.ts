/**
 * An INTERFACE is a POU type (upstream issue 1266). A new one is ST, empty, and valid
 * against the project schema.
 */
import { PLCPouSchema } from '../../../../../backend/shared/types/PLC/open-plc'
import { createPouObject } from '../utils'

describe('a new INTERFACE POU', () => {
  it('is ST with no variables and an empty body', () => {
    const pou = createPouObject({ type: 'interface', name: 'I_Run', language: 'st' })

    expect(pou).toEqual({
      type: 'interface',
      data: { name: 'I_Run', language: 'st', body: { language: 'st', value: '' }, variables: [], documentation: '' },
    })
  })

  it('is ST also when another language is asked for', () => {
    const pou = createPouObject({ type: 'interface', name: 'I_Run', language: 'ld' })

    expect(pou.data.language).toBe('st')
    expect(pou.data.body.language).toBe('st')
  })

  it('passes the project schema, with its EXTENDS clause', () => {
    const pou = createPouObject({ type: 'interface', name: 'I_Motor', language: 'st' })
    const parsed = PLCPouSchema.parse({ ...pou, data: { ...pou.data, declarationClauses: 'EXTENDS I_Run' } })

    expect(parsed).toMatchObject({ type: 'interface', data: { declarationClauses: 'EXTENDS I_Run' } })
  })

  it('is refused by the project schema in a language other than ST', () => {
    const pou = createPouObject({ type: 'interface', name: 'I_Run', language: 'st' })

    expect(() => PLCPouSchema.parse({ ...pou, data: { ...pou.data, language: 'il' } })).toThrow()
  })
})
