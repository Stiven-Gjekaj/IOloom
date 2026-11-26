import { useEffect, useState } from 'react'

import type { ExampleProject } from '../../../../backend/shared/examples/example-projects'
import { useProject } from '../../../../middleware/shared/providers'
import { useOpenPLCStore } from '../../../store'
import { toast } from '../../_features/[app]/toast/use-toast'

/**
 * The example projects that come with the editor (upstream issue 245). An example opens as
 * a copy in the temporary folder, so the app's own copy never changes, and a save of the
 * copy runs Save As.
 */
const DisplayExampleProjects = () => {
  const project = useProject()
  const handleOpenProjectResponse = useOpenPLCStore((state) => state.sharedWorkspaceActions.handleOpenProjectResponse)
  const setIsExampleProject = useOpenPLCStore((state) => state.workspaceActions.setIsExampleProject)
  const [examples, setExamples] = useState<ExampleProject[]>([])

  useEffect(() => {
    let live = true
    void project.listExampleProjects?.().then((list) => {
      if (live) setExamples(list)
    })
    return () => {
      live = false
    }
  }, [project])

  if (examples.length === 0) return null

  const openExample = async (example: ExampleProject) => {
    const copy = await project.copyExampleProject?.(example.folder)
    const opened = copy?.success && copy.path ? await project.openProjectByPath(copy.path) : null
    if (!copy?.path || !opened?.success || !opened.data) {
      toast({
        title: 'Cannot open the example.',
        description: copy?.error ?? opened?.error?.description ?? `The example ${example.name} could not be copied.`,
        variant: 'fail',
      })
      return
    }
    handleOpenProjectResponse(opened.data)
    setIsExampleProject(true)
    // The copy is temporary, so it does not belong in the recent projects.
    void project.removeRecentProject(copy.path)
  }

  return (
    <section aria-label='Example projects' className='flex w-full shrink-0 select-none flex-col pb-4 pr-9 4xl:pr-0'>
      <h2 className='mb-4 flex cursor-default justify-start font-caption text-xl font-medium text-neutral-1000 dark:text-white'>
        Examples
      </h2>
      <div className='flex w-full gap-4 overflow-x-auto pb-2'>
        {examples.map((example) => (
          <button
            key={example.folder}
            type='button'
            onClick={() => void openExample(example)}
            className='flex w-64 shrink-0 flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-3 text-left hover:border-brand dark:border-neutral-800 dark:bg-neutral-900'
          >
            <span className='font-caption text-sm font-medium text-neutral-1000 dark:text-white'>{example.name}</span>
            <span className='line-clamp-3 font-caption text-xs text-neutral-600 dark:text-neutral-400'>
              {example.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export { DisplayExampleProjects }
