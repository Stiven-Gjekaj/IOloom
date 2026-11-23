/**
 * Keyboard navigation in a ladder rung (upstream issue 496).
 *
 * Pure functions: the rung body calls them from its key handler.
 */
import type { Node } from '@xyflow/react'

export type ArrowDirection = 'left' | 'right' | 'up' | 'down'

/** The element kinds that the keyboard visits. Rails, junctions and drop points are skipped. */
const NAVIGABLE_TYPES = new Set(['contact', 'coil', 'block'])

const centreOf = (node: Node) => ({
  x: node.position.x + (node.measured?.width ?? node.width ?? 0) / 2,
  y: node.position.y + (node.measured?.height ?? node.height ?? 0) / 2,
})

/**
 * The element nearest to `fromId` in `direction`, or undefined when there is none.
 *
 * "Nearest" weighs the distance across the direction three times as much as the
 * distance along it, so Right keeps to the same leg of a parallel when it can.
 */
export function nextNodeInDirection(nodes: Node[], fromId: string, direction: ArrowDirection): Node | undefined {
  const from = nodes.find((n) => n.id === fromId)
  if (!from) return undefined
  const origin = centreOf(from)

  let best: Node | undefined
  let bestScore = Infinity
  for (const node of nodes) {
    if (node.id === fromId || !node.type || !NAVIGABLE_TYPES.has(node.type)) continue
    const { x, y } = centreOf(node)
    const dx = x - origin.x
    const dy = y - origin.y
    const along = direction === 'left' ? -dx : direction === 'right' ? dx : direction === 'up' ? -dy : dy
    const across = direction === 'left' || direction === 'right' ? Math.abs(dy) : Math.abs(dx)
    if (along <= 0) continue
    const score = along + 3 * across
    if (score < bestScore) {
      bestScore = score
      best = node
    }
  }
  return best
}

const CONTACT_VARIANTS = [
  'default',
  'negated',
  'risingEdge',
  'fallingEdge',
  'negatedRisingEdge',
  'negatedFallingEdge',
] as const
const COIL_VARIANTS = ['default', 'negated', 'risingEdge', 'fallingEdge', 'set', 'reset'] as const

/** The next kind of a contact or coil, in the order of its dialog. Undefined for other elements. */
export function nextVariant(node: Node): string | undefined {
  const list: readonly string[] | undefined =
    node.type === 'contact' ? CONTACT_VARIANTS : node.type === 'coil' ? COIL_VARIANTS : undefined
  if (!list) return undefined
  const current = (node.data as { variant?: string }).variant ?? 'default'
  const index = list.indexOf(current)
  return list[(index + 1) % list.length]
}
