import type { Node } from '@xyflow/react'

import { nextNodeInDirection, nextVariant } from '../keyboard'

const node = (id: string, type: string, x: number, y: number, variant?: string): Node => ({
  id,
  type,
  position: { x, y },
  width: 20,
  height: 20,
  data: variant ? { variant } : {},
})

/**
 * rail  OPEN  a(100,100)  t(200,100)  CLOSE  c(400,100)  rail
 *             b(100,200)
 */
const NODES = [
  node('rail-l', 'powerRail', 0, 100),
  node('open', 'parallel', 60, 100),
  node('a', 'contact', 100, 100),
  node('t', 'block', 200, 100),
  node('b', 'contact', 100, 200),
  node('close', 'parallel', 300, 100),
  node('c', 'coil', 400, 100),
  node('rail-r', 'powerRail', 500, 100),
]

describe('nextNodeInDirection', () => {
  it('moves along the leg, and skips rails and junctions', () => {
    expect(nextNodeInDirection(NODES, 'a', 'right')?.id).toBe('t')
    expect(nextNodeInDirection(NODES, 't', 'right')?.id).toBe('c')
    expect(nextNodeInDirection(NODES, 't', 'left')?.id).toBe('a')
  })

  it('moves between the legs of a parallel', () => {
    expect(nextNodeInDirection(NODES, 'a', 'down')?.id).toBe('b')
    expect(nextNodeInDirection(NODES, 'b', 'up')?.id).toBe('a')
  })

  it('keeps to the same leg when one is there, and leaves it when not', () => {
    expect(nextNodeInDirection(NODES, 'b', 'right')?.id).toBe('t')
    expect(nextNodeInDirection(NODES, 'a', 'left')).toBeUndefined()
  })

  it('finds nothing at the end of the rung or for an unknown id', () => {
    expect(nextNodeInDirection(NODES, 'c', 'right')).toBeUndefined()
    expect(nextNodeInDirection(NODES, 'missing', 'right')).toBeUndefined()
  })
})

describe('nextVariant', () => {
  it('cycles a contact through its six kinds', () => {
    const order = ['default', 'negated', 'risingEdge', 'fallingEdge', 'negatedRisingEdge', 'negatedFallingEdge']
    order.forEach((variant, i) => {
      expect(nextVariant(node('x', 'contact', 0, 0, variant))).toBe(order[(i + 1) % order.length])
    })
  })

  it('cycles a coil through its six kinds in the dialog order', () => {
    const order = ['default', 'negated', 'risingEdge', 'fallingEdge', 'set', 'reset']
    order.forEach((variant, i) => {
      expect(nextVariant(node('x', 'coil', 0, 0, variant))).toBe(order[(i + 1) % order.length])
    })
  })

  it('has no next kind for a block', () => {
    expect(nextVariant(node('x', 'block', 0, 0))).toBeUndefined()
  })
})
