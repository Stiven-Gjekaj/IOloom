/**
 * The structured initial value of a structure or function block variable (upstream issue
 * 1184): `(IN_LO := 800, IN_HI := 4000)`. The Initial Value dialog shows one row for each
 * member, reads an existing initializer into the rows and writes the rows back as one.
 */

import type { PLCDataType, PLCPou, PLCVariableType } from '../../../middleware/shared/ports/types'

export interface InitializerMember {
  name: string
  type: string
  /** The member's own initial value, from its declaration, or '' when it has none. */
  defaultValue: string
}

/** A library POU as far as this module needs it. */
export interface LibraryBlockSource {
  name: string
  type: string
  variables: ReadonlyArray<{ name: string; class?: string; type: { value: string }; initialValue?: unknown }>
}

const isFunctionBlock = (type: string): boolean => type.toLowerCase().replace(/[^a-z]/g, '') === 'functionblock'

/** The classes of a function block member that a declaration can initialize. */
const INITIALIZABLE: ReadonlySet<string> = new Set(['input', 'output', 'local'])

const text = (value: unknown): string => (typeof value === 'string' ? value : '')

/**
 * The members that an initializer of `type` can set, or null when the type is not a
 * structure or a function block. A project POU or data type comes before a library block
 * of the same name, as in the compiler.
 */
export function initializerMembers(
  type: PLCVariableType,
  context: { pous: readonly PLCPou[]; dataTypes: readonly PLCDataType[]; libraries: readonly LibraryBlockSource[] },
): InitializerMember[] | null {
  if (type.definition === 'base-type' || type.definition === 'array') return null
  const wanted = type.value.toUpperCase()

  const structure = context.dataTypes.find((dataType) => dataType.name.toUpperCase() === wanted)
  if (structure) {
    if (structure.derivation !== 'structure') return null
    return structure.variable.map((member) => ({
      name: member.name,
      type: member.type.value,
      defaultValue: member.initialValue?.simpleValue?.value ?? '',
    }))
  }

  const pou = context.pous.find(
    (candidate) => isFunctionBlock(candidate.pouType) && candidate.name.toUpperCase() === wanted,
  )
  if (pou) {
    return (pou.interface?.variables ?? [])
      .filter((variable) => INITIALIZABLE.has(variable.class ?? 'local'))
      .map((variable) => ({
        name: variable.name,
        type: variable.type.value,
        defaultValue: text(variable.initialValue),
      }))
  }

  const block = context.libraries.find(
    (candidate) => isFunctionBlock(candidate.type) && candidate.name.toUpperCase() === wanted,
  )
  if (block) {
    return block.variables
      .filter((variable) => INITIALIZABLE.has(variable.class ?? 'local'))
      .map((variable) => ({
        name: variable.name,
        type: variable.type.value,
        defaultValue: text(variable.initialValue),
      }))
  }

  return null
}

/**
 * The member values of an initializer, by upper-case member name. A nested initializer, a
 * string with a comma and an array value stay one value each. Text that is not an
 * initializer gives no values.
 */
export function parseInitializer(initializer: string): Map<string, string> {
  const values = new Map<string, string>()
  const source = initializer.trim()
  if (!source.startsWith('(') || !source.endsWith(')')) return values

  const inner = source.slice(1, -1)
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0
  for (let index = 0; index < inner.length; index++) {
    const character = inner[index]
    if (quote) {
      if (character === '$') index++
      else if (character === quote) quote = null
    } else if (character === "'" || character === '"') quote = character
    else if (character === '(' || character === '[') depth++
    else if (character === ')' || character === ']') depth--
    else if (character === ',' && depth === 0) {
      parts.push(inner.slice(start, index))
      start = index + 1
    }
  }
  parts.push(inner.slice(start))

  for (const part of parts) {
    const assignment = /^\s*([A-Za-z_]\w*)\s*:=\s*([\s\S]*?)\s*$/.exec(part)
    if (assignment) values.set(assignment[1].toUpperCase(), assignment[2])
  }
  return values
}

/** An initializer from member values. Empty values are left out; none at all gives ''. */
export function buildInitializer(values: ReadonlyArray<{ name: string; value: string }>): string {
  const set = values.filter(({ value }) => value.trim() !== '').map(({ name, value }) => `${name} := ${value.trim()}`)
  return set.length === 0 ? '' : `(${set.join(', ')})`
}
