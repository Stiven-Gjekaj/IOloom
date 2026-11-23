/**
 * A FUNCTION_BLOCK keeps its header: ABSTRACT or FINAL before the name, and the
 * EXTENDS and IMPLEMENTS clauses after it (upstream issues 1264 and 1266). The
 * parser read only `FUNCTION_BLOCK name`, so a save and a compile dropped the rest.
 */
import { parseTextualPouFromString } from '../pou-text-parser'
import { serializeTextualPouToString } from '../pou-text-serializer'

const fb = (header: string) => `${header}\n  VAR\n    m : INT;\n  END_VAR\n  m := n + 10;\nEND_FUNCTION_BLOCK`

describe('FUNCTION_BLOCK header clauses', () => {
  it('reads EXTENDS', () => {
    const pou = parseTextualPouFromString(fb('FUNCTION_BLOCK FB_Derived EXTENDS FB_Base'), 'st', 'function-block')
    expect(pou.name).toBe('FB_Derived')
    expect(pou.declarationClauses).toBe('EXTENDS FB_Base')
    expect(pou.declarationQualifier).toBeUndefined()
  })

  it('reads a qualifier and both clauses', () => {
    const pou = parseTextualPouFromString(
      fb('FUNCTION_BLOCK ABSTRACT FB_Mid EXTENDS FB_Base IMPLEMENTS I_Run, I_Stop'),
      'st',
      'function-block',
    )
    expect(pou.name).toBe('FB_Mid')
    expect(pou.declarationQualifier).toBe('ABSTRACT')
    expect(pou.declarationClauses).toBe('EXTENDS FB_Base IMPLEMENTS I_Run, I_Stop')
  })

  it('reads a plain header with no clause', () => {
    const pou = parseTextualPouFromString(fb('FUNCTION_BLOCK FB_Plain'), 'st', 'function-block')
    expect(pou.name).toBe('FB_Plain')
    expect(pou.declarationClauses).toBeUndefined()
  })

  it('writes the header back on save', () => {
    const source = fb('FUNCTION_BLOCK FINAL FB_Derived EXTENDS FB_Base')
    const saved = serializeTextualPouToString(parseTextualPouFromString(source, 'st', 'function-block'))
    expect(saved.split('\n')[0]).toBe('FUNCTION_BLOCK FINAL FB_Derived EXTENDS FB_Base')
  })
})
