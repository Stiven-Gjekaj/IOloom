/**
 * The variables table has a search field and a "basic types only" filter (upstream issue
 * 620, IOloom #24). After some blocks are added, the instances crowd the table.
 */
import { fireEvent, render as rtlRender, screen } from '@testing-library/react'
import type { ReactElement } from 'react'

vi.mock('@root/frontend/components/_organisms/variables-code-editor', () => ({
  VariablesCodeEditor: () => <div data-testid='variables-code-editor' />,
}))

import type { PLCVariable } from '../../../../../middleware/shared/ports/types'
import type { OpenPLCStore } from '../../../../store'
import { createStoreWrapper, createTestStore } from '../../../../store/testing'
import { VariablesEditor } from '../index'

let store: OpenPLCStore

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: createStoreWrapper(store) })

const variable = (name: string, type: PLCVariable['type']): PLCVariable => ({
  name,
  class: 'local',
  type,
  location: '',
  documentation: '',
  debug: false,
})

/** The names in the table rows, in order. */
const shownNames = () => {
  const rows = screen.getAllByRole('row').map((row) => {
    const values = Array.from(row.querySelectorAll('input, textarea')).map((field) => (field as HTMLInputElement).value)
    return `${row.textContent ?? ''} ${values.join(' ')}`
  })
  return ['start_button', 'motor_speed', 'TON0', 'R_TRIG0'].filter((name) => rows.some((row) => row.includes(name)))
}

beforeEach(() => {
  store = createTestStore()
  expect(store.getState().pouActions.create({ type: 'program', name: 'main', language: 'fbd' }).ok).toBe(true)
  for (const data of [
    variable('start_button', { definition: 'base-type', value: 'BOOL' }),
    variable('motor_speed', { definition: 'base-type', value: 'INT' }),
    variable('TON0', { definition: 'derived', value: 'TON' }),
    variable('R_TRIG0', { definition: 'derived', value: 'R_TRIG' }),
  ]) {
    expect(store.getState().projectActions.createVariable({ scope: 'local', associatedPou: 'main', data }).ok).toBe(
      true,
    )
  }
  render(<VariablesEditor name='main' />)
})

describe('the variables table filters', () => {
  it('shows every variable at first', () => {
    expect(shownNames()).toEqual(['start_button', 'motor_speed', 'TON0', 'R_TRIG0'])
  })

  it('shows only the variables whose name or type holds the search text', () => {
    fireEvent.change(screen.getByLabelText('Search variables'), { target: { value: 'MOTOR' } })
    expect(shownNames()).toEqual(['motor_speed'])

    fireEvent.change(screen.getByLabelText('Search variables'), { target: { value: 'trig' } })
    expect(shownNames()).toEqual(['R_TRIG0'])
  })

  it('hides the function block instances when only basic types are shown', () => {
    fireEvent.click(screen.getByLabelText('Basic types only'))
    expect(shownNames()).toEqual(['start_button', 'motor_speed'])

    fireEvent.click(screen.getByLabelText('Basic types only'))
    expect(shownNames()).toEqual(['start_button', 'motor_speed', 'TON0', 'R_TRIG0'])
  })
})
