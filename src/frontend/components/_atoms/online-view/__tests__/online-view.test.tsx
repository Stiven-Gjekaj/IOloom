/** The online view of the program (upstream issue 536, IOloom #10). */
import { createStoreWrapper, createTestStore } from '@root/frontend/store/testing'
import { act, render, screen } from '@testing-library/react'

import { editorPanelBorderClass } from '../editor-panel-border'
import { OnlineViewBadge } from '../index'

describe('OnlineViewBadge', () => {
  it('shows "Online" while a debug session is open, and nothing after it closes', () => {
    const store = createTestStore()
    render(<OnlineViewBadge />, { wrapper: createStoreWrapper(store) })
    expect(screen.queryByTestId('online-view-badge')).toBeNull()

    act(() => store.getState().workspaceActions.setDebuggerVisible(true))
    expect(screen.getByRole('status').textContent).toBe('Online')

    act(() => store.getState().workspaceActions.clearDebugState())
    expect(screen.queryByTestId('online-view-badge')).toBeNull()
  })
})

describe('editorPanelBorderClass', () => {
  it('gives the editor panel a green border only while online', () => {
    expect(editorPanelBorderClass(true)).toContain('border-green-500')
    expect(editorPanelBorderClass(false)).not.toContain('green')
  })
})
