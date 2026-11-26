import { useCallback, useMemo } from 'react'

import { useOpenPLCStore } from '../store'
import { resolveDebugKey } from '../utils/debug-variable-finder'

/**
 * Hook that returns a memoized function to build composite keys for debug variable lookups.
 * Handles both program POUs (simple `pouName:variableName` format) and function block POUs
 * (resolved to `programName:fbVariableName.variableName` using the selected FB instance context).
 *
 * Uses targeted Zustand selectors so it only re-renders when the active editor,
 * the current POU's type, or the selected FB instance changes — not on every
 * unrelated project or workspace mutation.
 */
export const useDebugCompositeKey = () => {
  const editorName = useOpenPLCStore(useCallback((s) => s.editor.meta.name, []))
  const pouType = useOpenPLCStore(
    useCallback((s) => s.project.data.pous.find((p) => p.name === s.editor.meta.name)?.pouType, []),
  )
  const variables = useOpenPLCStore(
    useCallback((s) => s.project.data.pous.find((p) => p.name === s.editor.meta.name)?.interface?.variables, []),
  )
  const fbSelectedInstance = useOpenPLCStore(useCallback((s) => s.workspace.fbSelectedInstance, []))
  const fbDebugInstances = useOpenPLCStore(useCallback((s) => s.workspace.fbDebugInstances, []))

  const fbInstanceContext = useMemo(() => {
    if (pouType !== 'function-block') return null
    const fbTypeKey = editorName.toUpperCase()
    const selectedKey = fbSelectedInstance.get(fbTypeKey)
    if (!selectedKey) return null
    const instances = fbDebugInstances.get(fbTypeKey) || []
    return instances.find((inst) => inst.key === selectedKey) || null
  }, [pouType, editorName, fbSelectedInstance, fbDebugInstances])

  const getCompositeKey = useCallback(
    (variableName: string): string =>
      // The declared spelling, and the global key for a VAR_EXTERNAL (upstream issue 585).
      resolveDebugKey(variables ?? [], variableName, (name) =>
        fbInstanceContext
          ? `${fbInstanceContext.programName}:${fbInstanceContext.fbVariableName}.${name}`
          : `${editorName}:${name}`,
      ),
    [fbInstanceContext, editorName, variables],
  )

  return getCompositeKey
}
