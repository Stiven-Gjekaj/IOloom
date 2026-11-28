import { type ScanStepAction, useScanStepping } from '../../../hooks/use-scan-stepping'
import { cn } from '../../../utils/cn'

/**
 * Single stepping of the PLC (upstream issue 557, IOloom #11). The buttons hang from the top
 * border of the editor panel, next to the "Online" badge. A running PLC offers Pause. A paused
 * PLC offers Step, which runs one scan, and Resume.
 */
export const ScanStepControls = () => {
  const { available, paused, busy, run } = useScanStepping()
  if (!available) return null

  const button = (action: ScanStepAction, label: string, title: string) => (
    <button
      type='button'
      data-testid={`scan-step-${action.toLowerCase()}`}
      title={title}
      disabled={busy}
      onClick={() => void run(action)}
      className={cn(
        'rounded-b-md bg-green-600 px-2 text-xs font-medium leading-4 text-white hover:bg-green-700',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-green-700',
        'disabled:cursor-wait disabled:opacity-60',
      )}
    >
      {label}
    </button>
  )

  return (
    <div role='group' aria-label='Single stepping' data-testid='scan-step-controls' className='flex gap-1'>
      {paused ? (
        <>
          <span
            data-testid='scan-step-paused'
            className='select-none rounded-b-md bg-amber-500 px-2 text-xs font-medium leading-4 text-white'
          >
            Paused
          </span>
          {button('STEP', 'Step', 'Run one scan of the program, then hold the PLC again')}
          {button('RESUME', 'Resume', 'Let the PLC run freely again')}
        </>
      ) : (
        button('PAUSE', 'Pause', 'Hold the PLC between two scans. The values and the outputs keep their state.')
      )}
    </div>
  )
}
