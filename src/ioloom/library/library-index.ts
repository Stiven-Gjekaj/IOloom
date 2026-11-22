// The index of a symbol library, and the search in it.
// This file has no dependency on Node, Electron, or React.
import type { ElementSymbol } from '../qet/model'

export interface SymbolEntry {
  /** The path of the `.elmt` file in the library, with "/" between the parts. It is the identity. */
  id: string
  uuid: string
  /** The element name in each language, by language code. */
  names: Record<string, string>
  /** The folders from the library root to the file. */
  category: string[]
}

/** Makes the index entry of one element, from its path in the library and its symbol. */
export function toEntry(id: string, symbol: ElementSymbol): SymbolEntry {
  const parts = id.split('/')
  return { id, uuid: symbol.uuid, names: symbol.names, category: parts.slice(0, -1) }
}

const baseName = (id: string): string => (id.split('/').pop() ?? id).replace(/\.elmt$/i, '')

/**
 * Gives the name of an element in a language. A language code such as "de-AT" also finds "de".
 * If the element has no name in that language, the English name, then the French name, then
 * the first name, and last the file name are used.
 */
export function displayName(entry: SymbolEntry, lang: string): string {
  const short = lang.toLowerCase().split(/[-_]/)[0]
  const n = entry.names
  return n[lang] || n[short] || n.en || n.fr || Object.values(n).find(Boolean) || baseName(entry.id)
}

/** Makes a text ready for a search: lower case, with no accents. */
export const fold = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

// The folded text of each entry. A search runs at each key press, so the index keeps this text.
const folded = new WeakMap<SymbolEntry, string>()
const haystack = (e: SymbolEntry): string => {
  let h = folded.get(e)
  if (h === undefined) {
    h = fold([...Object.values(e.names), ...e.category, baseName(e.id)].join('\n'))
    folded.set(e, h)
  }
  return h
}

/**
 * Finds the entries that match a query. Each word of the query must occur in a name (in any
 * language), in a folder name, or in the file name. Case and accents do not matter.
 * The result is sorted by the name in the given language.
 */
export function searchSymbols(entries: SymbolEntry[], query: string, lang: string): SymbolEntry[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  const found = words.length ? entries.filter((e) => words.every((w) => haystack(e).includes(w))) : entries
  return [...found].sort((a, b) => displayName(a, lang).localeCompare(displayName(b, lang), lang))
}
