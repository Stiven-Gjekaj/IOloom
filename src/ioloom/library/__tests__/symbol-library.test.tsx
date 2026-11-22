import '@testing-library/jest-dom'

import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type { ImportResult, ListResult, SymbolLibraryApi } from '../api'
import type { SymbolEntry } from '../library-index'
import { importSummary, MAX_SHOWN } from '../summary'
import { SymbolLibrary } from '../symbol-library'

const entry = (id: string, names: Record<string, string>): SymbolEntry => ({
  id,
  uuid: `{${id}}`,
  names,
  category: id.split('/').slice(0, -1),
})

const contactor = entry('relays/contactor.elmt', { en: 'Contactor', de: 'Schütz' })
const lamp = entry('lamp.elmt', { en: 'Lamp', de: 'Leuchte' })

// A fake user library. Each test gives it its own entries.
function fakeApi(start: ListResult, overrides: Partial<SymbolLibraryApi> = {}): SymbolLibraryApi {
  let current = start
  return {
    list: jest.fn(async () => current),
    svg: jest.fn(async (id: string) => `<svg xmlns="http://www.w3.org/2000/svg"><title>${id}</title></svg>`),
    importFile: jest.fn(async () => null),
    importFolder: jest.fn(async () => null),
    ...overrides,
    // Lets a test change what the next list() gives.
    set: (next: ListResult) => {
      current = next
    },
  } as SymbolLibraryApi & { set: (next: ListResult) => void }
}

const names = (): string[] =>
  within(screen.getByRole('list', { name: 'Symbols' }))
    .queryAllByRole('listitem')
    .map((li) => li.querySelector('p')?.textContent ?? '')

describe('SymbolLibrary', () => {
  it('shows each symbol of the library, with its name in the language and its folders', async () => {
    render(<SymbolLibrary api={fakeApi({ entries: [lamp, contactor], errors: [] })} lang='de' />)
    await screen.findByText('2 symbols')
    expect(names()).toEqual(['Leuchte', 'Schütz'])
    expect(screen.getByText('relays')).toBeInTheDocument()
  })

  it('draws a thumbnail of each symbol as an image', async () => {
    const api = fakeApi({ entries: [lamp], errors: [] })
    const { container } = render(<SymbolLibrary api={api} lang='en' />)
    await waitFor(() => expect(container.querySelector('img')).not.toBeNull())
    expect(api.svg).toHaveBeenCalledWith('lamp.elmt')
    expect(container.querySelector('img')?.getAttribute('src')).toMatch(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/)
  })

  it('shows a question mark when a thumbnail does not load', async () => {
    const api = fakeApi({ entries: [lamp], errors: [] }, { svg: jest.fn(async () => Promise.reject(new Error('x'))) })
    render(<SymbolLibrary api={api} lang='en' />)
    expect(await screen.findByText('?')).toBeInTheDocument()
  })

  it('filters the list with the search, in all languages', async () => {
    render(<SymbolLibrary api={fakeApi({ entries: [lamp, contactor], errors: [] })} lang='en' />)
    await screen.findByText('2 symbols')
    // The project search in the explorer has the placeholder 'Search'. Two boxes with one placeholder confuse the user.
    expect(screen.getByRole('searchbox', { name: 'Search symbols' })).toHaveAttribute('placeholder', 'Search symbols')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search symbols' }), 'schutz')
    expect(names()).toEqual(['Contactor'])
    expect(screen.getByText('1 symbol')).toBeInTheDocument()
  })

  it('shows no more than the maximum, and says how many it found', async () => {
    const many = Array.from({ length: MAX_SHOWN + 5 }, (_, i) => entry(`s${i}.elmt`, { en: `S${i}` }))
    render(<SymbolLibrary api={fakeApi({ entries: many, errors: [] })} lang='en' />)
    expect(await screen.findByText(`${MAX_SHOWN} of ${MAX_SHOWN + 5} symbols. Type more words to find the others.`))
    expect(names()).toHaveLength(MAX_SHOWN)
  })

  it('says how many files of the library do not load', async () => {
    render(<SymbolLibrary api={fakeApi({ entries: [], errors: [{ path: 'x.elmt', message: 'bad' }] })} lang='en' />)
    expect(await screen.findByText(/1 files in the library do not load/)).toBeInTheDocument()
  })

  it('shows the error when the library does not load', async () => {
    const api = fakeApi({ entries: [], errors: [] }, { list: jest.fn(async () => Promise.reject(new Error('EACCES'))) })
    render(<SymbolLibrary api={api} lang='en' />)
    expect(await screen.findByRole('alert')).toHaveTextContent('EACCES')
  })

  it('imports a file, shows the report with the reasons, and loads the library again', async () => {
    const result: ImportResult = {
      imported: ['contactor.elmt'],
      unchanged: [],
      failed: [{ path: '/in/bad.elmt', message: 'The XML is not valid' }],
    }
    const api = fakeApi({ entries: [lamp], errors: [] }) as SymbolLibraryApi & { set: (n: ListResult) => void }
    ;(api.importFile as jest.Mock).mockImplementation(async () => {
      api.set({ entries: [lamp, contactor], errors: [] })
      return result
    })
    render(<SymbolLibrary api={api} lang='en' />)
    await screen.findByText('1 symbol')
    await userEvent.click(screen.getByRole('button', { name: '+ Import file…' }))
    expect(await screen.findByRole('status')).toHaveTextContent('1 file imported, 1 not valid.')
    expect(screen.getByRole('status')).toHaveTextContent('/in/bad.elmt: The XML is not valid')
    expect(await screen.findByText('2 symbols')).toBeInTheDocument()
  })

  it('does nothing when the user cancels a folder import', async () => {
    const api = fakeApi({ entries: [lamp], errors: [] })
    render(<SymbolLibrary api={api} lang='en' />)
    await screen.findByText('1 symbol')
    await userEvent.click(screen.getByRole('button', { name: '+ Import folder…' }))
    expect(api.importFolder).toHaveBeenCalled()
    expect(screen.queryByRole('status')).toBeNull()
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it('disables the import buttons while an import runs', async () => {
    let finish: (r: ImportResult | null) => void = () => undefined
    const api = fakeApi(
      { entries: [], errors: [] },
      { importFolder: jest.fn(() => new Promise<ImportResult | null>((r) => (finish = r))) },
    )
    render(<SymbolLibrary api={api} lang='en' />)
    await screen.findByText('0 symbols')
    await userEvent.click(screen.getByRole('button', { name: '+ Import folder…' }))
    expect(screen.getByRole('button', { name: '+ Import file…' })).toBeDisabled()
    await act(async () => finish(null))
    expect(screen.getByRole('button', { name: '+ Import file…' })).toBeEnabled()
  })

  it('shows the error when an import fails', async () => {
    const api = fakeApi(
      { entries: [], errors: [] },
      { importFile: jest.fn(async () => Promise.reject(new Error('No main window'))) },
    )
    render(<SymbolLibrary api={api} lang='en' />)
    await screen.findByText('0 symbols')
    await userEvent.click(screen.getByRole('button', { name: '+ Import file…' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No main window')
  })
})

describe('importSummary', () => {
  it('gives each count that is not zero', () => {
    expect(importSummary({ imported: [], unchanged: [], failed: [] })).toBe('0 files imported.')
    expect(importSummary({ imported: ['a', 'b'], unchanged: ['c'], failed: [] })).toBe(
      '2 files imported, 1 already in the library.',
    )
  })
})
