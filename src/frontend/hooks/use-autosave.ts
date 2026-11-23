import { useEffect, useState } from 'react'

import { useAutosave, useCapabilities, useProject } from '../../middleware/shared/providers'
import { startAutosave } from '../services/autosave'
import { executeSaveProject } from '../services/save-actions'
import { useOpenPLCStoreApi } from '../store'

/**
 * The autosave setting and its setter. Off while the platform has no autosave
 * port, and while the first read is on its way.
 */
export function useAutosaveSetting(): { available: boolean; enabled: boolean; setEnabled: (enabled: boolean) => void } {
  const autosave = useAutosave()
  const [enabled, setEnabledState] = useState(false)

  useEffect(() => {
    if (!autosave) return
    let active = true
    autosave
      .isEnabled()
      .then((value) => active && setEnabledState(value))
      .catch(() => undefined)
    const unsubscribe = autosave.onChanged((value) => active && setEnabledState(value))
    return () => {
      active = false
      unsubscribe()
    }
  }, [autosave])

  const setEnabled = (value: boolean) => {
    setEnabledState(value)
    autosave?.setEnabled(value)
  }

  return { available: autosave !== undefined, enabled, setEnabled }
}

/** Runs the autosave timer while the setting is on (upstream issue 443). Mount it once. */
export function useAutosaveTimer(): void {
  const store = useOpenPLCStoreApi()
  const projectPort = useProject()
  const capabilities = useCapabilities()
  const { enabled } = useAutosaveSetting()

  useEffect(() => {
    if (!enabled) return
    return startAutosave(store, () => executeSaveProject(store, projectPort, capabilities, 'autosave'))
  }, [enabled, store, projectPort, capabilities])
}
