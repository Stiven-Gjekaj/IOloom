/**
 * The parameter list of a function block call, for code completion (upstream issue 576).
 *
 * Typing `TON0(` on an instance of TON offers `IN := , PT := , Q => , ET => `: every input
 * and IN_OUT with `:=`, every output with `=>`. The first version of this completed only the
 * inputs, and only for a block picked from the library, not for a declared instance.
 */

interface PinSource {
  name: string
  class?: string
}

interface BlockSource {
  name: string
  /** `function-block` for a project POU or a library entry. */
  type: string
  variables: readonly PinSource[]
}

/** The text of a call's parameters as a Monaco snippet, one tab stop for each parameter. */
export function callParametersSnippet(pins: readonly PinSource[]): string {
  const inputs = pins.filter((pin) => pin.class === 'input' || pin.class === 'inOut')
  const outputs = pins.filter((pin) => pin.class === 'output')
  return [
    ...inputs.map((pin, index) => `${pin.name} := \${${index + 1}}`),
    ...outputs.map((pin, index) => `${pin.name} => \${${inputs.length + index + 1}}`),
  ].join(', ')
}

/**
 * The function block type of `instanceName` in the POU, from its declaration, or null when
 * it is not declared there or its type is not a function block. IEC names are not case
 * sensitive.
 */
export function findFunctionBlockOfInstance(
  instanceName: string,
  declared: ReadonlyArray<{ name: string; type: { definition: string; value: string } }>,
  blocks: readonly BlockSource[],
): BlockSource | null {
  const instance = declared.find((variable) => variable.name.toUpperCase() === instanceName.toUpperCase())
  if (!instance || instance.type.definition === 'base-type' || instance.type.definition === 'array') return null
  const typeName = instance.type.value.toUpperCase()
  return (
    blocks.find(
      (block) =>
        block.type.toLowerCase().replace(/[^a-z]/g, '') === 'functionblock' && block.name.toUpperCase() === typeName,
    ) ?? null
  )
}

/** The instance name right before an open parenthesis at the end of `textBeforeCursor`. */
export function instanceBeforeOpenParenthesis(textBeforeCursor: string): string | null {
  return /([A-Za-z_]\w*)\s*\(\s*$/.exec(textBeforeCursor)?.[1] ?? null
}
