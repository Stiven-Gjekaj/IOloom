// The library browser: it shows the symbols of the user library, with a search and the import.
// It uses only React. The seam gives it the API to the user library and the language.
import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ImportResult, ListResult, SymbolLibraryApi } from './api'
import { displayName, searchSymbols, type SymbolEntry } from './library-index'
import { importSummary, MAX_SHOWN, plural } from './summary'

export interface SymbolLibraryProps {
  api: SymbolLibraryApi
  /** The language of the names, for example "en" or "de-AT". */
  lang: string
}

function Thumbnail({ api, id }: { api: SymbolLibraryApi; id: string }): ReactElement {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    api.svg(id).then(
      (svg) => live && setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [api, id])
  // An <img> runs no script, so an SVG from a file of the user is safe here.
  return (
    <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-white p-0.5'>
      {src ? <img src={src} alt='' className='max-h-full max-w-full' /> : failed ? '?' : null}
    </div>
  )
}

export function SymbolLibrary({ api, lang }: SymbolLibraryProps): ReactElement {
  const [list, setList] = useState<ListResult | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [report, setReport] = useState<ImportResult | null>(null)
  const [busy, setBusy] = useState(false)
  const live = useRef(true)

  const load = useCallback(async () => {
    try {
      const r = await api.list()
      if (live.current) {
        setList(r)
        setLoadError(null)
      }
    } catch (e) {
      if (live.current) setLoadError(e instanceof Error ? e.message : String(e))
    }
  }, [api])

  useEffect(() => {
    live.current = true
    void load()
    return () => {
      live.current = false
    }
  }, [load])

  const runImport = async (start: () => Promise<ImportResult | null>): Promise<void> => {
    setBusy(true)
    try {
      const r = await start()
      if (r && live.current) {
        setReport(r)
        await load()
      }
    } catch (e) {
      if (live.current) setLoadError(e instanceof Error ? e.message : String(e))
    } finally {
      if (live.current) setBusy(false)
    }
  }

  const found = useMemo<SymbolEntry[]>(
    () => (list ? searchSymbols(list.entries, query, lang) : []),
    [list, query, lang],
  )
  const shown = found.slice(0, MAX_SHOWN)

  const button =
    'rounded-md px-2 py-1 font-caption text-xs font-medium text-brand hover:bg-neutral-100 disabled:opacity-50 dark:hover:bg-neutral-850'

  return (
    <div className='flex h-full w-full flex-col overflow-hidden text-neutral-1000 dark:text-neutral-50'>
      <div className='flex items-center gap-2 px-2 pt-3'>
        <span className='font-caption text-xs font-medium'>Symbols</span>
        <input
          type='search'
          aria-label='Search symbols'
          placeholder='Search symbols'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className='h-8 min-w-0 flex-1 rounded-lg bg-neutral-100 px-2 font-caption text-xs focus:outline-none dark:bg-brand-dark'
        />
      </div>
      <div className='flex gap-1 px-1 py-1'>
        <button type='button' className={button} disabled={busy} onClick={() => void runImport(() => api.importFile())}>
          + Import file…
        </button>
        <button
          type='button'
          className={button}
          disabled={busy}
          onClick={() => void runImport(() => api.importFolder())}
        >
          + Import folder…
        </button>
      </div>

      {report && (
        <div role='status' className='mx-2 mb-1 rounded bg-neutral-100 p-2 font-caption text-xs dark:bg-neutral-850'>
          <p>{importSummary(report)}</p>
          {report.failed.length > 0 && (
            <ul className='mt-1 max-h-24 list-disc overflow-auto pl-4'>
              {report.failed.map((f) => (
                <li key={f.path}>
                  <span className='font-medium'>{f.path}</span>: {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loadError && (
        <p role='alert' className='mx-2 font-caption text-xs text-red-500'>
          {loadError}
        </p>
      )}

      {list && (
        <>
          <p className='px-2 pb-1 font-caption text-xs text-neutral-500'>
            {found.length > MAX_SHOWN
              ? `${MAX_SHOWN} of ${found.length} symbols. Type more words to find the others.`
              : plural(found.length, 'symbol')}
            {list.errors.length > 0 && ` ${list.errors.length} files in the library do not load.`}
          </p>
          <ul aria-label='Symbols' className='flex-1 overflow-auto px-1'>
            {shown.map((e) => (
              <li
                key={e.id}
                title={e.id}
                className='flex items-center gap-2 rounded px-1 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-850'
              >
                <Thumbnail api={api} id={e.id} />
                <div className='min-w-0'>
                  <p className='truncate font-caption text-xs'>{displayName(e, lang)}</p>
                  {e.category.length > 0 && (
                    <p className='truncate font-caption text-[10px] text-neutral-500'>{e.category.join(' / ')}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
