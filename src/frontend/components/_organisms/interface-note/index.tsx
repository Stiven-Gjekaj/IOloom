/**
 * Takes the place of the variables table for an INTERFACE. An interface has no variables of
 * its own: the VAR blocks in it belong to its METHOD prototypes, which the editor below holds.
 */
export const InterfaceNote = () => (
  <p
    aria-label='Interface note'
    className='flex h-full w-full items-center justify-center px-4 text-center font-caption text-xs text-neutral-850 dark:text-neutral-300'
  >
    An interface has no variables. Write its METHOD prototypes, with their VAR_INPUT and VAR_OUTPUT blocks, in the
    editor below.
  </p>
)
