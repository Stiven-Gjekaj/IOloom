/**
 * An INTERFACE is a POU of its own (upstream issue 1266). Its file holds the header, the
 * METHOD prototypes and END_INTERFACE. It has no variables: the VAR blocks in the file
 * belong to the methods, so the parser must not read them as POU variables.
 */
import { parseTextualPouFromString } from '../pou-text-parser'
import { serializePouToText } from '../pou-text-serializer'

const methods = `METHOD Run : BOOL
  VAR_INPUT
    speed : INT;
  END_VAR
END_METHOD
METHOD Stop
END_METHOD`

describe('INTERFACE POU text', () => {
  it('reads the name, the methods as the body, and no variables', () => {
    const pou = parseTextualPouFromString(`INTERFACE I_Run\n${methods}\nEND_INTERFACE\n`, 'st', 'interface')

    expect(pou.name).toBe('I_Run')
    expect(pou.pouType).toBe('interface')
    expect(pou.interface?.variables).toEqual([])
    expect(pou.body).toEqual({ language: 'st', value: methods })
    expect(pou.declarationClauses).toBeUndefined()
  })

  it('reads the EXTENDS clause with more than one base', () => {
    const pou = parseTextualPouFromString('INTERFACE I_Motor EXTENDS I_Run, I_Stop\nEND_INTERFACE', 'st', 'interface')

    expect(pou.name).toBe('I_Motor')
    expect(pou.declarationClauses).toBe('EXTENDS I_Run, I_Stop')
    expect(pou.body).toEqual({ language: 'st', value: '' })
  })

  it('refuses a file with no END_INTERFACE', () => {
    expect(() => parseTextualPouFromString(`INTERFACE I_Run\n${methods}\n`, 'st', 'interface')).toThrow(/END_INTERFACE/)
  })

  it('writes the same interface back on save', () => {
    const source = `INTERFACE I_Motor EXTENDS I_Run\n${methods}\nEND_INTERFACE`
    const saved = serializePouToText(parseTextualPouFromString(source, 'st', 'interface'))

    expect(saved).toBe(source)
  })

  it('writes an empty interface as a header and END_INTERFACE', () => {
    const saved = serializePouToText(parseTextualPouFromString('INTERFACE I_Empty\nEND_INTERFACE', 'st', 'interface'))

    expect(saved).toBe('INTERFACE I_Empty\nEND_INTERFACE')
  })
})
