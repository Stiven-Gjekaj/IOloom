/**
 * Nested parallel branches (upstream issue 1202): a parallel inside the top leg
 * of another parallel. Target rung: c := TOF0(IN := a OR d).Q OR b.
 */
import type { Node } from '@xyflow/react'

import type { BlockVariant } from '@root/frontend/components/_atoms/graphical-editor/ladder/utils/types'
import type { RungLadderState } from '@root/frontend/store/slices/ladder/types'
import { buildRungFromSpec } from '@root/frontend/store/slices/ladder/utils/rung-spec'
import type { PLCVariable } from '@root/middleware/shared/ports/types'

import { emitLdBody } from '@root/backend/shared/transpilers/st-transpiler/walker/ld'
import type { RFBody } from '@root/backend/shared/transpilers/st-transpiler/walker/types'

import { addNewElement } from '../elements'
import { renderPlaceholderElements } from '../elements/placeholder'

const variable = (name: string, value = 'bool', definition: 'base-type' | 'derived' = 'base-type'): PLCVariable => ({
  name,
  class: 'local',
  type: { definition, value },
  location: '',
  documentation: '',
})

const tofVariant: BlockVariant = {
  name: 'TOF',
  type: 'function-block',
  documentation: '',
  extensible: false,
  variables: [
    { name: 'IN', class: 'input', type: { definition: 'base-type', value: 'bool' } },
    { name: 'PT', class: 'input', type: { definition: 'base-type', value: 'time' } },
    { name: 'Q', class: 'output', type: { definition: 'base-type', value: 'bool' } },
    { name: 'ET', class: 'output', type: { definition: 'base-type', value: 'time' } },
  ],
}

const VARIABLES = [variable('a'), variable('b'), variable('c'), variable('d'), variable('TOF0', 'TOF', 'derived')]

/** a -> c */
function startRung(): RungLadderState {
  const result = buildRungFromSpec({
    rungId: 'r1',
    spec: {
      elements: [
        { kind: 'contact', variable: 'a' },
        { kind: 'coil', variable: 'c' },
      ],
    },
    variables: VARIABLES,
    resolveBlock: (name) => (name === 'TOF' ? tofVariant : undefined),
  })
  if (!result.ok) throw new Error(result.errors.join('; '))
  return result.rung
}

const nodeNamed = (rung: RungLadderState, name: string): Node | undefined =>
  rung.nodes.find((n) => (n.data as { variable?: { name?: string } }).variable?.name === name)

/** The drop targets the editor shows next to `name`. */
function placeholdersOf(rung: RungLadderState, name: string): string[] {
  const target = nodeNamed(rung, name)
  return renderPlaceholderElements(rung)
    .filter((n) => n.type === 'placeholder' || n.type === 'parallelPlaceholder')
    .filter((n) => (n.data as { relatedNode?: Node }).relatedNode?.id === target?.id)
    .map((n) => (n.data as { position: string }).position)
    .sort()
}

/** Drops a new element on the placeholder at `side` of `name`, as the editor does. Returns null when there is none. */
function drop(
  rung: RungLadderState,
  name: string,
  side: 'left' | 'right' | 'bottom',
  element: { elementType: string; blockVariant?: BlockVariant },
  newName: string,
): RungLadderState | null {
  const target = nodeNamed(rung, name)
  const nodes = renderPlaceholderElements(rung).map((n) => ({ ...n }))
  const placeholder = nodes.find(
    (n) =>
      (n.type === 'placeholder' || n.type === 'parallelPlaceholder') &&
      (n.data as { relatedNode?: Node }).relatedNode?.id === target?.id &&
      (n.data as { position: string }).position === side,
  )
  if (!placeholder) return null
  placeholder.selected = true
  const result = addNewElement({ ...rung, nodes }, element)
  if (!result.newNode) return null
  const newId = result.newNode.id
  return {
    ...rung,
    nodes: result.nodes.map((n) =>
      n.id === newId ? { ...n, data: { ...n.data, variable: { ...variable(newName), id: newName } } } : n,
    ),
    edges: result.edges,
  }
}

describe('nested parallel branches (upstream issue 1202)', () => {
  it('offers a drop point under an element on the top leg of a parallel', () => {
    // a -> c, then b under a: (a | b) -> c, then TOF0 after a inside the top leg: (a -> TOF0 | b) -> c
    let rung = drop(startRung(), 'a', 'bottom', { elementType: 'contact' }, 'b')!
    expect(rung).not.toBeNull()
    rung = drop(rung, 'a', 'right', { elementType: 'block', blockVariant: tofVariant }, 'TOF0')!
    expect(rung).not.toBeNull()

    expect(placeholdersOf(rung, 'a')).toContain('bottom')
  })

  it('nests d in parallel with a inside the top leg, so the rung is c := TOF0(IN := a OR d).Q OR b', () => {
    let rung = drop(startRung(), 'a', 'bottom', { elementType: 'contact' }, 'b')!
    rung = drop(rung, 'a', 'right', { elementType: 'block', blockVariant: tofVariant }, 'TOF0')!
    rung = drop(rung, 'a', 'bottom', { elementType: 'contact' }, 'd')!
    expect(rung).not.toBeNull()

    const opens = rung.nodes.filter((n) => n.type === 'parallel' && (n.data as { type: string }).type === 'open')
    expect(opens).toHaveLength(2)

    const body = {
      rungs: [{ nodes: rung.nodes, edges: rung.edges, reactFlowViewport: [800, 300] }],
    } as unknown as RFBody
    const { bodySt, warnings } = emitLdBody(body)
    expect(warnings).toEqual([])
    const st = bodySt.replace(/\s+/g, ' ')
    expect(st).toMatch(/TOF0\(IN := \(?a OR d\)?/)
    expect(st).toMatch(/c := \(?TOF0\.Q OR b\)?;/)
  })
})
