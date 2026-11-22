// The texts and limits of the library browser.
import type { ImportResult } from './api'

/** The browser shows no more than this number of results. A narrower search shows the others. */
export const MAX_SHOWN = 200

export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`

export function importSummary(r: ImportResult): string {
  const parts = [`${plural(r.imported.length, 'file')} imported`]
  if (r.unchanged.length) parts.push(`${r.unchanged.length} already in the library`)
  if (r.failed.length) parts.push(`${r.failed.length} not valid`)
  return `${parts.join(', ')}.`
}
