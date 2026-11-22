import type { ElementSymbol } from '../../qet/model'
import { displayName, fold, searchSymbols, type SymbolEntry, toEntry } from '../library-index'

const entry = (id: string, names: Record<string, string>): SymbolEntry => ({
  id,
  uuid: `{${id}}`,
  names,
  category: id.split('/').slice(0, -1),
})

const contactor = entry('relays/contactor.elmt', { en: 'Contactor', fr: 'Contacteur', de: 'Schütz' })
const lamp = entry('signals/lamp.elmt', { en: 'Indicator lamp', fr: 'Voyant lumineux' })
const button = entry('switches/push/nc.elmt', { fr: 'Bouton poussoir NF', es: 'Pulsador NC' })
const unnamed = entry('misc/my_part.elmt', {})
const all = [contactor, lamp, button, unnamed]

describe('toEntry', () => {
  it('takes the identity and the category from the path, and the names from the symbol', () => {
    const symbol = { uuid: '{u1}', names: { en: 'Coil' } } as unknown as ElementSymbol
    expect(toEntry('a/b/coil.elmt', symbol)).toEqual({
      id: 'a/b/coil.elmt',
      uuid: '{u1}',
      names: { en: 'Coil' },
      category: ['a', 'b'],
    })
    expect(toEntry('coil.elmt', symbol).category).toEqual([])
  })
})

describe('displayName', () => {
  it('gives the name in the language', () => {
    expect(displayName(contactor, 'de')).toBe('Schütz')
  })

  it('finds the language from a code with a region', () => {
    expect(displayName(contactor, 'de-AT')).toBe('Schütz')
    expect(displayName(contactor, 'fr_CA')).toBe('Contacteur')
  })

  it('uses English, then French, then the first name, then the file name', () => {
    expect(displayName(lamp, 'it')).toBe('Indicator lamp')
    expect(displayName(button, 'it')).toBe('Bouton poussoir NF')
    expect(displayName(entry('x.elmt', { es: 'Motor' }), 'it')).toBe('Motor')
    expect(displayName(unnamed, 'it')).toBe('my_part')
  })
})

describe('fold', () => {
  it('removes the accents and the case', () => {
    expect(fold('SCHÜTZ Élément')).toBe('schutz element')
  })
})

describe('searchSymbols', () => {
  const ids = (r: SymbolEntry[]): string[] => r.map((e) => e.id)

  it('gives all entries, sorted by name, for an empty query', () => {
    expect(ids(searchSymbols(all, '  ', 'en'))).toEqual([
      'switches/push/nc.elmt',
      'relays/contactor.elmt',
      'signals/lamp.elmt',
      'misc/my_part.elmt',
    ])
  })

  it('finds a name in a language that is not the display language', () => {
    expect(ids(searchSymbols(all, 'schutz', 'en'))).toEqual(['relays/contactor.elmt'])
    expect(ids(searchSymbols(all, 'pulsador', 'en'))).toEqual(['switches/push/nc.elmt'])
  })

  it('ignores the case and the accents of the query', () => {
    expect(ids(searchSymbols(all, 'SCHÜTZ', 'en'))).toEqual(['relays/contactor.elmt'])
  })

  it('finds a folder name and a file name', () => {
    expect(ids(searchSymbols(all, 'push', 'en'))).toEqual(['switches/push/nc.elmt'])
    expect(ids(searchSymbols(all, 'my_part', 'en'))).toEqual(['misc/my_part.elmt'])
  })

  it('needs each word of the query, in any field', () => {
    expect(ids(searchSymbols(all, 'signals lamp', 'en'))).toEqual(['signals/lamp.elmt'])
    expect(ids(searchSymbols(all, 'signals contactor', 'en'))).toEqual([])
  })

  it('sorts the result by the name in the given language', () => {
    const r = searchSymbols([lamp, contactor], '', 'fr')
    expect(r.map((e) => displayName(e, 'fr'))).toEqual(['Contacteur', 'Voyant lumineux'])
  })

  it('does not change the list that it gets', () => {
    const list = [lamp, contactor]
    searchSymbols(list, '', 'en')
    expect(list).toEqual([lamp, contactor])
  })
})
