import { useIsDebuggerVisible } from '../../../hooks/use-debug-value'
import { ScanStepControls } from './scan-step-controls'

/**
 * The online view of the program (upstream issue 536). While a debug session is open, the
 * editor shows live values, and the user must not take it for the offline editor. The editor
 * panel then gets a green border and an "Online" badge. The window edge and the gaps between
 * the panels keep their normal colours.
 */

/**
 * The badge hangs from the top border of the editor panel, in the padding above the editor
 * controls. The single-stepping buttons hang next to it on a target that can step. It shows
 * nothing while offline.
 */
export const OnlineViewBadge = () => {
  const isOnline = useIsDebuggerVisible()
  if (!isOnline) return null
  return (
    <div className='absolute right-4 top-0 z-10 flex items-start gap-1'>
      <ScanStepControls />
      <span
        role='status'
        data-testid='online-view-badge'
        className='pointer-events-none flex select-none items-center gap-1 rounded-b-md bg-green-500 px-2 text-xs font-medium leading-4 text-white'
      >
        <span aria-hidden='true' className='h-1.5 w-1.5 rounded-full bg-white' />
        Online
      </span>
    </div>
  )
}
