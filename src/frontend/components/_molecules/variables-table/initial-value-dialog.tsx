import { useEffect, useState } from 'react'

import { buildInitializer, type InitializerMember, parseInitializer } from '../../../utils/PLC/structured-initial-value'
import { Modal, ModalContent, ModalTitle } from '../modal'

type InitialValueDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  variableName: string
  typeName: string
  members: readonly InitializerMember[]
  /** The variable's initial value now, an initializer such as `(PT := T#1s)` or ''. */
  initialValue: string
  onApply: (initialValue: string) => void
}

/**
 * The Initial Value dialog of a structure or function block variable (upstream issue 1184):
 * one row for each member, with its type and its own default. A value left empty keeps the
 * default, so it is not written into the initializer.
 */
export const InitialValueDialog = ({
  open,
  onOpenChange,
  variableName,
  typeName,
  members,
  initialValue,
  onApply,
}: InitialValueDialogProps) => {
  const [values, setValues] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    const current = parseInitializer(initialValue)
    setValues(members.map((member) => current.get(member.name.toUpperCase()) ?? ''))
  }, [open, initialValue, members])

  const apply = () => {
    onApply(buildInitializer(members.map((member, index) => ({ name: member.name, value: values[index] ?? '' }))))
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className='w-[640px]' onClose={() => onOpenChange(false)}>
        <ModalTitle className='text-base font-medium text-neutral-950 dark:text-white'>
          Initial value of {variableName} : {typeName}
        </ModalTitle>
        <table
          aria-label='Member initial values'
          className='w-full text-left text-xs text-neutral-850 dark:text-neutral-300'
        >
          <thead>
            <tr className='border-b border-neutral-300 dark:border-neutral-850'>
              <th className='py-1'>Member</th>
              <th className='py-1'>Type</th>
              <th className='py-1'>Default</th>
              <th className='py-1'>Initial value</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member, index) => (
              <tr key={member.name} className='border-b border-neutral-100 dark:border-neutral-900'>
                <td className='py-1 pr-2'>{member.name}</td>
                <td className='py-1 pr-2'>{member.type}</td>
                <td className='py-1 pr-2 text-neutral-500'>{member.defaultValue}</td>
                <td className='py-1'>
                  <input
                    aria-label={`Initial value of ${member.name}`}
                    value={values[index] ?? ''}
                    placeholder={member.defaultValue}
                    autoComplete='off'
                    spellCheck={false}
                    onChange={(event) =>
                      setValues((previous) => previous.map((value, at) => (at === index ? event.target.value : value)))
                    }
                    className='h-7 w-full rounded-md border border-neutral-300 bg-inherit px-2 outline-none focus:border-brand dark:border-neutral-850'
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className='flex h-8 w-full gap-4'>
          <button
            type='button'
            onClick={() => onOpenChange(false)}
            className='h-full w-full rounded-lg bg-neutral-100 font-medium text-neutral-1000 dark:bg-neutral-850 dark:text-neutral-100'
          >
            Cancel
          </button>
          <button type='button' onClick={apply} className='h-full w-full rounded-lg bg-brand font-medium text-white'>
            Apply
          </button>
        </div>
      </ModalContent>
    </Modal>
  )
}
