/**
 * Auto-connect in FBD (upstream issue 539, as in CODESYS): when a drag ends with an output
 * handle on an input handle of another node, the two are connected.
 */

/** Two handles connect when their anchor points are this close, in flow units. */
export const AUTO_CONNECT_DISTANCE = 12

interface HandleLike {
  id?: string
  type: 'source' | 'target'
  relPosition: { x: number; y: number }
}

interface NodeLike {
  id: string
  position: { x: number; y: number }
  data: unknown
}

interface EdgeLike {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export interface AutoConnection {
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}

const handlesOf = (node: NodeLike): HandleLike[] => {
  const handles = (node.data as { handles?: unknown } | null)?.handles
  return Array.isArray(handles) ? (handles as HandleLike[]).filter((handle) => typeof handle.id === 'string') : []
}

const anchor = (node: NodeLike, handle: HandleLike) => ({
  x: node.position.x + handle.relPosition.x,
  y: node.position.y + handle.relPosition.y,
})

/**
 * The connections to make after a drag: each free input handle that now nearly touches an
 * output handle of another node, where at least one of the two nodes moved. An input that
 * already has a connection is left alone. When two outputs are near one input, the nearer
 * one connects.
 */
export function autoConnections(
  nodes: readonly NodeLike[],
  edges: readonly EdgeLike[],
  movedIds: ReadonlySet<string>,
): AutoConnection[] {
  const connectedInputs = new Set(edges.map((edge) => `${edge.target}\u0000${edge.targetHandle ?? ''}`))
  const outputs = nodes.flatMap((node) =>
    handlesOf(node)
      .filter((handle) => handle.type === 'source')
      .map((handle) => ({ node, handle, at: anchor(node, handle) })),
  )

  const connections: AutoConnection[] = []
  for (const node of nodes) {
    for (const input of handlesOf(node).filter((handle) => handle.type === 'target')) {
      if (connectedInputs.has(`${node.id}\u0000${input.id}`)) continue
      const at = anchor(node, input)
      let best: { output: (typeof outputs)[number]; distance: number } | null = null
      for (const output of outputs) {
        if (output.node.id === node.id) continue
        if (!movedIds.has(node.id) && !movedIds.has(output.node.id)) continue
        const distance = Math.hypot(output.at.x - at.x, output.at.y - at.y)
        if (distance <= AUTO_CONNECT_DISTANCE && (!best || distance < best.distance)) best = { output, distance }
      }
      if (best) {
        connections.push({
          source: best.output.node.id,
          sourceHandle: best.output.handle.id!,
          target: node.id,
          targetHandle: input.id!,
        })
      }
    }
  }
  return connections
}
