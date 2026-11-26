/**
 * The key a diagram node looks up in debug mode is the key the debug tree uses
 * (upstream issue 585, IOloom #9). A contact on an element of a VAR_EXTERNAL array
 * looked up `main:gSensor[0]`, the tree had `Config0:gSensor[0]`, and the contact
 * stayed red.
 */
import { renderHook } from '@testing-library/react'

import type { PLCVariable } from '../../../middleware/shared/ports/types'
import { createPouObject } from '../../store/slices/shared/utils'
import { createStoreWrapper, createTestStore } from '../../store/testing'
import { useDebugCompositeKey } from '../use-debug-composite-key'

const boolArray = (name: string, cls: PLCVariable['class']): PLCVariable => ({
  name,
  class: cls,
  type: {
    definition: 'array',
    value: 'ARRAY [0..1] OF BOOL',
    data: { baseType: { definition: 'base-type', value: 'BOOL' }, dimensions: [{ dimension: '0..1' }] },
  },
  location: '',
  documentation: '',
})

const renderFor = (variables: PLCVariable[]) => {
  const store = createTestStore()
  const pou = createPouObject({ name: 'main', type: 'program', language: 'ld' })
  store.getState().projectActions.createPou({ ...pou, data: { ...pou.data, variables } } as typeof pou)
  store.getState().editorActions.setEditor({
    type: 'plc-graphical',
    meta: { name: 'main', path: '/data/pous/program/main', language: 'ld', pouType: 'program' },
  } as never)
  return renderHook(() => useDebugCompositeKey(), { wrapper: createStoreWrapper(store) }).result.current
}

describe('useDebugCompositeKey', () => {
  it('gives an element of a VAR_EXTERNAL array the global key', () => {
    const key = renderFor([boolArray('gSensor', 'external')])
    expect(key('gsensor[0]')).toBe('Config0:gSensor[0]')
  })

  it('gives an element of a local array the declared spelling', () => {
    const key = renderFor([boolArray('sensor', 'local')])
    expect(key('SENSOR[ 1 ]')).toBe('main:sensor[1]')
  })
})
