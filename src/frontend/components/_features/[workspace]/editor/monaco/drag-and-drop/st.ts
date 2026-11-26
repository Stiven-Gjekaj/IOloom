export const parsePouToStText = (
  pou: {
    name: string
    language?: string
    type: string
    body?: string
    documentation?: string
    variables?: {
      name: string
      class: string | undefined
      type: { definition: string; value: string }
    }[]
  },
  variableName?: string,
) => {
  if (!pou.variables) {
    return `${variableName ? variableName : pou.name} (\n \n);`
  }

  // Every parameter, each a tab stop (upstream issue 576): inputs and IN_OUTs with `:=` and a
  // default value, outputs with `=>`. The outputs used to be left out.
  const inputs = pou.variables.filter((variable) => variable.class === 'input' || variable.class === 'inOut')
  const outputs = pou.variables.filter((variable) => variable.class === 'output')
  const parameters = [
    ...inputs.map((variable, index) => `${variable.name} := \${${index + 1}:${getDefaultValueForType(variable.type)}}`),
    ...outputs.map((variable, index) => `${variable.name} => \${${inputs.length + index + 1}}`),
  ]

  return `${variableName ? variableName : pou.name} (\n    ${parameters.join(',\n    ')}\n);`
}

// Function default values for type
function getDefaultValueForType(type: { definition: string; value: string }): string {
  switch (type.value.toLowerCase()) {
    case 'bool':
      return 'TRUE'
    case 'time':
      return 'T#100ms'
    case 'int':
    case 'dint':
      return '0'
    case 'real':
      return '0.0'
    case 'string':
      return "''"
    default:
      return 'value'
  }
}
