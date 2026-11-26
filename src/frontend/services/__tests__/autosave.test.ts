/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

import type { OpenPLCStore } from '../../store'
import { createTestStore } from '../../store/testing'
import { AUTOSAVE_INTERVAL_MS, shouldAutosave, startAutosave } from '../autosave'

let store: OpenPLCStore

/** A project with a folder, which the user can edit, with one unsaved change. */
function dirtyProject() {
  store.getState().projectActions.updateMetaPath('/projects/tank')
  store.setState((s) => ({
    ...s,
    workspace: { ...s.workspace, canEdit: true, isEphemeralProject: false, editingState: 'unsaved' },
  }))
}

beforeEach(() => {
  store = createTestStore()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('shouldAutosave', () => {
  it('is true for an unsaved project with a folder', () => {
    dirtyProject()
    expect(shouldAutosave(store.getState())).toBe(true)
  })

  it('is false when nothing changed', () => {
    dirtyProject()
    store.getState().workspaceActions.setEditingState('saved')
    expect(shouldAutosave(store.getState())).toBe(false)
  })

  it('is false for a project with no folder', () => {
    dirtyProject()
    store.getState().projectActions.updateMetaPath('')
    expect(shouldAutosave(store.getState())).toBe(false)
  })

  it('is false for a project retrieved from a device, which has no location yet', () => {
    dirtyProject()
    store.setState((s) => ({ ...s, workspace: { ...s.workspace, isEphemeralProject: true } }))
    expect(shouldAutosave(store.getState())).toBe(false)
  })

  it('is false for a copy of an example, which has no location the user chose', () => {
    dirtyProject()
    store.setState((s) => ({ ...s, workspace: { ...s.workspace, isExampleProject: true } }))
    expect(shouldAutosave(store.getState())).toBe(false)
  })

  it('is false when the user cannot edit the project', () => {
    dirtyProject()
    store.setState((s) => ({ ...s, workspace: { ...s.workspace, canEdit: false } }))
    expect(shouldAutosave(store.getState())).toBe(false)
  })

  it('is false while a save runs', () => {
    dirtyProject()
    store.getState().workspaceActions.setEditingState('save-request')
    expect(shouldAutosave(store.getState())).toBe(false)
  })
})

describe('startAutosave', () => {
  it('saves once each interval while the project has unsaved changes', async () => {
    jest.useFakeTimers()
    dirtyProject()
    const save = jest.fn(() => Promise.resolve())
    const stop = startAutosave(store, save)

    jest.advanceTimersByTime(AUTOSAVE_INTERVAL_MS - 1)
    expect(save).not.toHaveBeenCalled()
    jest.advanceTimersByTime(1)
    expect(save).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    jest.advanceTimersByTime(AUTOSAVE_INTERVAL_MS)
    expect(save).toHaveBeenCalledTimes(2)
    stop()
  })

  it('does not start a second save while the first one runs', () => {
    jest.useFakeTimers()
    dirtyProject()
    const save = jest.fn(() => new Promise<void>(() => undefined))
    const stop = startAutosave(store, save)

    jest.advanceTimersByTime(AUTOSAVE_INTERVAL_MS * 3)
    expect(save).toHaveBeenCalledTimes(1)
    stop()
  })

  it('saves nothing after stop', () => {
    jest.useFakeTimers()
    dirtyProject()
    const save = jest.fn(() => Promise.resolve())
    startAutosave(store, save)()

    jest.advanceTimersByTime(AUTOSAVE_INTERVAL_MS * 2)
    expect(save).not.toHaveBeenCalled()
  })
})
