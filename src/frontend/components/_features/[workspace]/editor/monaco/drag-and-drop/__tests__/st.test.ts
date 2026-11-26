/**
 * A block dragged from the library into ST, or picked in IL, comes with all its parameters
 * (upstream issue 576, IOloom #20). Before, only the inputs came.
 */
import { parsePouToStText } from '../st'

const pin = (name: string, cls: string, value: string) => ({
  name,
  class: cls,
  type: { definition: 'base-type', value },
})

describe('parsePouToStText', () => {
  it('writes the inputs and IN_OUTs with := and the outputs with =>', () => {
    const text = parsePouToStText({
      name: 'TON',
      type: 'function-block',
      variables: [
        pin('IN', 'input', 'BOOL'),
        pin('PT', 'input', 'TIME'),
        pin('Q', 'output', 'BOOL'),
        pin('ET', 'output', 'TIME'),
      ],
    })
    expect(text).toBe('TON (\n    IN := ${1:TRUE},\n    PT := ${2:T#100ms},\n    Q => ${3},\n    ET => ${4}\n);')
  })

  it('gives an IN_OUT := and leaves out the locals', () => {
    const text = parsePouToStText(
      {
        name: 'FB_Motor',
        type: 'function-block',
        variables: [pin('Start', 'input', 'BOOL'), pin('Buffer', 'inOut', 'INT'), pin('count', 'local', 'INT')],
      },
      'motor1',
    )
    expect(text).toBe('motor1 (\n    Start := ${1:TRUE},\n    Buffer := ${2:0}\n);')
  })
})
