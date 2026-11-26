/** Auto-connect in FBD (upstream issue 539, IOloom #21). */
import { AUTO_CONNECT_DISTANCE, autoConnections } from '../auto-connect'

/** An input variable box: one output handle on its right edge. */
const inputVariable = (id: string, x: number, y: number) => ({
  id,
  position: { x, y },
  data: { handles: [{ id: 'output-variable', type: 'source' as const, relPosition: { x: 80, y: 16 } }] },
})

/** A block with two inputs on its left edge and one output on its right edge. */
const block = (id: string, x: number, y: number) => ({
  id,
  position: { x, y },
  data: {
    handles: [
      { id: 'IN', type: 'target' as const, relPosition: { x: 0, y: 16 } },
      { id: 'PT', type: 'target' as const, relPosition: { x: 0, y: 40 } },
      { id: 'Q', type: 'source' as const, relPosition: { x: 100, y: 16 } },
    ],
  },
})

describe('autoConnections', () => {
  it('connects an output that touches a free input of a moved block', () => {
    const nodes = [inputVariable('a', 0, 0), block('b', 80, 0)]
    expect(autoConnections(nodes, [], new Set(['b']))).toEqual([
      { source: 'a', sourceHandle: 'output-variable', target: 'b', targetHandle: 'IN' },
    ])
  })

  it('connects within the distance and not beyond it', () => {
    const near = [inputVariable('a', 0, 0), block('b', 80 + AUTO_CONNECT_DISTANCE - 1, 0)]
    const far = [inputVariable('a', 0, 0), block('b', 80 + AUTO_CONNECT_DISTANCE + 1, 0)]
    expect(autoConnections(near, [], new Set(['b']))).toHaveLength(1)
    expect(autoConnections(far, [], new Set(['b']))).toEqual([])
  })

  it('does nothing when neither node moved', () => {
    const nodes = [inputVariable('a', 0, 0), block('b', 80, 0)]
    expect(autoConnections(nodes, [], new Set(['other']))).toEqual([])
  })

  it('leaves an input that already has a connection alone', () => {
    const nodes = [inputVariable('a', 0, 0), block('b', 80, 0)]
    const edges = [{ source: 'x', target: 'b', sourceHandle: 'out', targetHandle: 'IN' }]
    expect(autoConnections(nodes, edges, new Set(['b']))).toEqual([])
  })

  it('connects the nearer of two outputs, and a block output to the next block', () => {
    const nodes = [inputVariable('far', 0, 6), inputVariable('near', 0, 1), block('b', 80, 0), block('c', 180, 0)]
    expect(autoConnections(nodes, [], new Set(['b']))).toEqual([
      { source: 'near', sourceHandle: 'output-variable', target: 'b', targetHandle: 'IN' },
      { source: 'b', sourceHandle: 'Q', target: 'c', targetHandle: 'IN' },
    ])
  })

  it('never connects a node to itself', () => {
    const loop = {
      id: 'n',
      position: { x: 0, y: 0 },
      data: {
        handles: [
          { id: 'in', type: 'target' as const, relPosition: { x: 0, y: 0 } },
          { id: 'out', type: 'source' as const, relPosition: { x: 0, y: 0 } },
        ],
      },
    }
    expect(autoConnections([loop], [], new Set(['n']))).toEqual([])
  })
})
