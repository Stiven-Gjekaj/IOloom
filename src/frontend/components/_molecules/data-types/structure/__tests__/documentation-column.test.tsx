/**
 * A structure member has a Documentation column (upstream issue 450, IOloom #25). The
 * member's documentation is the `(* ... *)` comment after it in the .dt file, which the
 * model already kept; the table had no column to show or change it.
 */
import { fireEvent, render, screen } from '@testing-library/react'

import type { OpenPLCStore } from '@root/frontend/store'
import { createStoreWrapper, createTestStore } from '@root/frontend/store/testing'

import { StructureDataType } from '../index'

let store: OpenPLCStore

const membersOf = () => {
  const dataType = store.getState().project.data.dataTypes.find((candidate) => candidate.name === 'Motor')
  return dataType?.derivation === 'structure' ? dataType.variable : []
}

beforeEach(() => {
  store = createTestStore()
  store.getState().datatypeActions.create({ name: 'Motor', derivation: 'structure' })
  store.getState().projectActions.updateDatatype('Motor', {
    name: 'Motor',
    derivation: 'structure',
    variable: [
      { name: 'bStart', type: { definition: 'base-type', value: 'BOOL' }, documentation: 'Start signal to device' },
      { name: 'bRun', type: { definition: 'base-type', value: 'BOOL' } },
    ],
  })
  render(<StructureDataType dataTypeName='Motor' />, { wrapper: createStoreWrapper(store) })
})

describe('the Documentation column of a structure', () => {
  it('has a header and shows the documentation of each member', () => {
    expect(screen.getByText('Documentation')).toBeTruthy()
    expect(screen.getByDisplayValue('Start signal to device')).toBeTruthy()
  })

  it('writes an edit into the member', () => {
    const cells = screen.getAllByLabelText('Member documentation')
    fireEvent.change(cells[1], { target: { value: 'Run feedback' } })
    fireEvent.blur(cells[1])

    expect(membersOf().map((member) => member.documentation)).toEqual(['Start signal to device', 'Run feedback'])
  })

  it('removes the documentation when the cell is emptied', () => {
    const cells = screen.getAllByLabelText('Member documentation')
    fireEvent.change(cells[0], { target: { value: '  ' } })
    fireEvent.blur(cells[0])

    expect('documentation' in membersOf()[0]).toBe(false)
  })
})
