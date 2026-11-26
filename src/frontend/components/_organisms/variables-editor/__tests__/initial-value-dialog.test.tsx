/**
 * The Initial Value dialog of a function block or structure variable (upstream issue 1184,
 * IOloom #23): one row for each member, written back as one initializer.
 */
import { act, fireEvent, render as rtlRender, screen, within } from '@testing-library/react'
import type { ReactElement } from 'react'

vi.mock('@root/frontend/components/_organisms/variables-code-editor', () => ({
  VariablesCodeEditor: () => <div data-testid='variables-code-editor' />,
}))

import type { OpenPLCStore } from '../../../../store'
import { createStoreWrapper, createTestStore } from '../../../../store/testing'
import { VariablesEditor } from '../index'

let store: OpenPLCStore

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: createStoreWrapper(store) })

const storedInitialValue = () =>
  store.getState().project.data.pous.find((pou) => pou.name === 'main')?.interface?.variables[0]?.initialValue

const seed = (initialValue?: string) => {
  expect(store.getState().pouActions.create({ type: 'program', name: 'main', language: 'st' }).ok).toBe(true)
  expect(
    store.getState().projectActions.createVariable({
      scope: 'local',
      associatedPou: 'main',
      data: {
        name: 'delay',
        class: 'local',
        type: { definition: 'derived', value: 'TON' },
        location: '',
        documentation: '',
        ...(initialValue ? { initialValue } : {}),
      },
    }).ok,
  ).toBe(true)
  render(<VariablesEditor name='main' />)
  act(() => store.getState().workspaceActions.setEditingState('saved'))
  // A cell takes clicks only in the selected row.
  fireEvent.click(screen.getAllByRole('row')[2])
}

beforeEach(() => {
  store = createTestStore()
})

describe('the Initial Value dialog', () => {
  it('writes the member values of a TON as one initializer', () => {
    seed()
    fireEvent.click(screen.getByLabelText('Edit the member initial values'))

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Initial value of PT'), { target: { value: 'T#1s' } })
    fireEvent.click(within(dialog).getByText('Apply'))

    expect(storedInitialValue()).toBe('(PT := T#1s)')
    // The button stays, so the value can be changed again.
    expect(screen.getByLabelText('Edit the member initial values')).toBeTruthy()
  })

  it('opens with the members of the current initializer filled in', () => {
    seed('(IN := TRUE, PT := T#5s)')
    fireEvent.click(screen.getByLabelText('Edit the member initial values'))

    const dialog = screen.getByRole('dialog')
    expect((within(dialog).getByLabelText('Initial value of IN') as HTMLInputElement).value).toBe('TRUE')
    expect((within(dialog).getByLabelText('Initial value of PT') as HTMLInputElement).value).toBe('T#5s')
  })

  it('changes nothing on Cancel', () => {
    seed('(PT := T#5s)')
    fireEvent.click(screen.getByLabelText('Edit the member initial values'))

    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Initial value of PT'), { target: { value: 'T#9s' } })
    fireEvent.click(within(dialog).getByText('Cancel'))

    expect(storedInitialValue()).toBe('(PT := T#5s)')
  })
})
