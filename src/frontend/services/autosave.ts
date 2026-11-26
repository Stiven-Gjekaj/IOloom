/**
 * Autosave (upstream issue 443): save the project at a fixed interval, so a
 * crash loses at most that much work.
 *
 * The save is the same save as File > Save. Autosave only decides when it runs.
 */

import type { OpenPLCStore } from '../store'

/** Ten minutes, the default that the issue asks for. */
export const AUTOSAVE_INTERVAL_MS = 10 * 60 * 1000

/**
 * True when an autosave must run now. It does not run for a project that has no
 * folder yet, that the user cannot edit, that has no unsaved change, or that is
 * saving at the moment.
 */
export function shouldAutosave(state: ReturnType<OpenPLCStore['getState']>): boolean {
  const { workspace, project } = state
  if (!project.meta.path) return false
  if (workspace.isEphemeralProject || workspace.isExampleProject || !workspace.canEdit) return false
  if (workspace.editingState === 'save-request') return false
  return state.sharedWorkspaceActions.hasUnsavedChanges()
}

/**
 * Starts the autosave timer. `save` is the File > Save action. Returns the
 * function that stops the timer.
 */
export function startAutosave(
  store: OpenPLCStore,
  save: () => Promise<unknown>,
  intervalMs: number = AUTOSAVE_INTERVAL_MS,
): () => void {
  let saving = false
  const timer = setInterval(() => {
    if (saving || !shouldAutosave(store.getState())) return
    saving = true
    void save().finally(() => {
      saving = false
    })
  }, intervalMs)
  return () => clearInterval(timer)
}
