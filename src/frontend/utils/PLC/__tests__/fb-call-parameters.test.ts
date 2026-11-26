import {
  callParametersSnippet,
  findFunctionBlockOfInstance,
  instanceBeforeOpenParenthesis,
} from '../fb-call-parameters'

const TON = {
  name: 'TON',
  type: 'function-block',
  variables: [
    { name: 'IN', class: 'input' },
    { name: 'PT', class: 'input' },
    { name: 'Q', class: 'output' },
    { name: 'ET', class: 'output' },
  ],
}
const MOTOR = {
  name: 'FB_Motor',
  type: 'function-block',
  variables: [
    { name: 'Start', class: 'input' },
    { name: 'Buffer', class: 'inOut' },
    { name: 'Running', class: 'output' },
    { name: 'count', class: 'local' },
  ],
}

describe('callParametersSnippet', () => {
  it('lists the inputs with := and the outputs with =>, each a tab stop', () => {
    expect(callParametersSnippet(TON.variables)).toBe('IN := ${1}, PT := ${2}, Q => ${3}, ET => ${4}')
  })

  it('gives an IN_OUT := and leaves out the locals', () => {
    expect(callParametersSnippet(MOTOR.variables)).toBe('Start := ${1}, Buffer := ${2}, Running => ${3}')
  })
})

describe('findFunctionBlockOfInstance', () => {
  const declared = [
    { name: 'TON0', type: { definition: 'derived', value: 'TON' } },
    { name: 'motor1', type: { definition: 'derived', value: 'fb_motor' } },
    { name: 'speed', type: { definition: 'base-type', value: 'INT' } },
  ]

  it('finds a library block and a project block by the instance type, in any letter case', () => {
    expect(findFunctionBlockOfInstance('ton0', declared, [TON, MOTOR])).toBe(TON)
    expect(findFunctionBlockOfInstance('MOTOR1', declared, [TON, MOTOR])).toBe(MOTOR)
  })

  it('finds nothing for a variable of a basic type or a name that is not declared', () => {
    expect(findFunctionBlockOfInstance('speed', declared, [TON, MOTOR])).toBeNull()
    expect(findFunctionBlockOfInstance('other', declared, [TON, MOTOR])).toBeNull()
  })
})

describe('instanceBeforeOpenParenthesis', () => {
  it('reads the name before an open parenthesis at the cursor', () => {
    expect(instanceBeforeOpenParenthesis('  TON0(')).toBe('TON0')
    expect(instanceBeforeOpenParenthesis('x := 1; motor1 ( ')).toBe('motor1')
  })

  it('reads nothing after a parameter is typed', () => {
    expect(instanceBeforeOpenParenthesis('TON0(IN := ')).toBeNull()
  })
})
