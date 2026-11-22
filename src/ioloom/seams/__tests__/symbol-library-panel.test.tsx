import '@testing-library/jest-dom'

import { render, screen } from '@testing-library/react'

import type { SymbolLibraryApi } from '../../library/api'
import { SymbolLibraryPanel } from '../symbol-library-panel'

afterEach(() => {
  delete window.ioloom
})

describe('SymbolLibraryPanel', () => {
  it('shows nothing when the IOloom API is not there', () => {
    const { container } = render(<SymbolLibraryPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the library browser with the API of the window', async () => {
    const api: SymbolLibraryApi = {
      list: jest.fn(async () => ({
        entries: [{ id: 'k.elmt', uuid: '{k}', names: { en: 'Contactor' }, category: [] }],
        errors: [],
      })),
      svg: jest.fn(async () => '<svg/>'),
      importFile: jest.fn(async () => null),
      importFolder: jest.fn(async () => null),
    }
    window.ioloom = { symbols: api }
    render(<SymbolLibraryPanel />)
    expect(await screen.findByText('Contactor')).toBeInTheDocument()
  })
})
