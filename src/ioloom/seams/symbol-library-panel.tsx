// Seam: the symbol library panel of the explorer.
import type { ReactElement } from 'react'

import { SymbolLibrary } from '../library/symbol-library'
import type {} from './symbol-library-preload'

/** Shows the library browser. It shows nothing if the IOloom API is not there. */
export function SymbolLibraryPanel(): ReactElement | null {
  const api = window.ioloom?.symbols
  if (!api) return null
  return <SymbolLibrary api={api} lang={navigator.language || 'en'} />
}
