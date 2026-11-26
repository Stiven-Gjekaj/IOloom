/**
 * The variables, functions and function blocks that nothing in the project uses (upstream
 * issue 552). The result is a list of search matches, so the search results panel shows
 * them and opens each one.
 *
 * A name counts as used when it appears as an identifier anywhere that could refer to it.
 * The reading is deliberately wide: a false "unused" could lead the user to delete
 * something the program needs, while a missed one costs nothing.
 *
 *  - A local, temp or external variable of a POU is unused when its own POU never names
 *    it: not in the body, and not in the declaration of another of its variables (an
 *    initial value, an array bound). An input, output or IN_OUT is part of the interface
 *    of the POU, so it is never reported.
 *  - A global variable is unused when no POU, no server and no remote device names it.
 *  - A function or function block is unused when no variable, structure member or array
 *    has it as its type, and no POU names it.
 */

import type { PLCPou, PLCProjectData, PLCVariable } from '../../../middleware/shared/ports/types'
import type { PouLanguage, ProjectSearchMatch, SearchMatchContainer } from './project-search'

const IDENTIFIER = /[A-Za-z_][A-Za-z0-9_]*/g

/** Keys of a graphical body that describe the drawing, not the program. */
const STRUCTURAL_KEYS: ReadonlySet<string> = new Set([
  'id',
  'parentId',
  'type',
  'source',
  'target',
  'sourceHandle',
  'targetHandle',
  'handleId',
  'className',
  'style',
])

const addIdentifiers = (text: string, into: Set<string>): void => {
  for (const match of text.matchAll(IDENTIFIER)) into.add(match[0].toUpperCase())
}

/** The identifiers of IEC source text, without its comments and string literals. */
const iecIdentifiers = (text: string, into: Set<string>): void => {
  const code = text
    .replace(/\(\*[\s\S]*?\*\)/g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\$.|[^'$])*'/g, ' ')
    .replace(/"(?:\$.|[^"$])*"/g, ' ')
  addIdentifiers(code, into)
}

/** The identifiers in every string of a JSON value, except the keys that only draw. */
const valueIdentifiers = (value: unknown, into: Set<string>, key = ''): void => {
  if (typeof value === 'string') {
    if (!STRUCTURAL_KEYS.has(key)) addIdentifiers(value, into)
  } else if (Array.isArray(value)) {
    for (const item of value) valueIdentifiers(item, into, key)
  } else if (value !== null && typeof value === 'object') {
    for (const [childKey, child] of Object.entries(value)) valueIdentifiers(child, into, childKey)
  }
}

const bodyIdentifiers = (pou: PLCPou, into: Set<string>): void => {
  const { language, value } = pou.body
  if (typeof value !== 'string') valueIdentifiers(value, into)
  // Python and C++ comments are kept: a name in one counts as used, which is the safe side.
  else if (language === 'python' || language === 'cpp') addIdentifiers(value, into)
  else iecIdentifiers(value, into)
}

/** The names a declaration refers to: its type, its array bounds and its initial value. */
const declarationIdentifiers = (variable: PLCVariable, into: Set<string>): void => {
  valueIdentifiers(variable.type, into)
  if (typeof variable.initialValue === 'string') iecIdentifiers(variable.initialValue, into)
}

const LOCAL_CLASSES: ReadonlySet<string> = new Set(['local', 'temp', 'external'])

const isPouLanguage = (language: string): language is PouLanguage =>
  ['il', 'st', 'ld', 'fbd', 'sfc', 'python', 'cpp'].includes(language)

const match = (
  id: number,
  container: SearchMatchContainer,
  field: ProjectSearchMatch['field'],
  name: string,
  detail: string,
) => ({
  id: `unused-${id}`,
  container,
  field,
  preview: `${name}${detail}`,
  previewColumn: 1,
  length: name.length,
})

export function findUnusedElements(data: PLCProjectData): ProjectSearchMatch[] {
  const results: ProjectSearchMatch[] = []
  const pous = data.pous.filter((pou) => pou.pouType !== 'interface')

  // The names each POU refers to, and the names everything else refers to: the globals,
  // the data types, the servers, the remote devices and the resource instances.
  const usesByPou = new Map<PLCPou, Set<string>>()
  for (const pou of pous) {
    const uses = new Set<string>()
    bodyIdentifiers(pou, uses)
    for (const variable of pou.interface?.variables ?? []) declarationIdentifiers(variable, uses)
    usesByPou.set(pou, uses)
  }
  const deviceUses = new Set<string>()
  valueIdentifiers(data.servers ?? [], deviceUses)
  valueIdentifiers(data.remoteDevices ?? [], deviceUses)
  const otherUses = new Set<string>(deviceUses)
  for (const variable of data.configurations.resource.globalVariables) declarationIdentifiers(variable, otherUses)
  for (const list of data.globalVariableLists ?? []) {
    for (const variable of list.variables) declarationIdentifiers(variable, otherUses)
  }
  valueIdentifiers(data.dataTypes, otherUses)
  for (const instance of data.configurations.resource.instances) otherUses.add(instance.program.toUpperCase())

  for (const pou of pous) {
    const language = isPouLanguage(pou.body.language) ? pou.body.language : 'st'
    const container: SearchMatchContainer = { kind: 'pou', name: pou.name, pouType: pou.pouType, language }
    const variables = pou.interface?.variables ?? []
    // The body, and the declarations of the POU's other variables.
    const uses = new Set<string>()
    bodyIdentifiers(pou, uses)
    for (const variable of variables) {
      if (!LOCAL_CLASSES.has(variable.class ?? 'local')) continue
      const others = new Set(uses)
      for (const other of variables) if (other !== variable) declarationIdentifiers(other, others)
      if (!others.has(variable.name.toUpperCase())) {
        results.push(match(results.length, container, 'variable', variable.name, ` : ${variable.type.value}`))
      }
    }

    if ((pou.pouType === 'function' || pou.pouType === 'function-block') && !usedOutside(pou, usesByPou, otherUses)) {
      results.push(match(results.length, container, 'name', pou.name, ` (${pou.pouType.replace('-', ' ')})`))
    }
  }

  for (const variable of data.configurations.resource.globalVariables) {
    const name = variable.name.toUpperCase()
    const usedByPou = pous.some((pou) => usesByPou.get(pou)?.has(name))
    if (!usedByPou && !deviceUses.has(name)) {
      const container: SearchMatchContainer = { kind: 'resource', section: 'global-variable' }
      results.push(match(results.length, container, 'variable', variable.name, ` : ${variable.type.value}`))
    }
  }

  return results
}

/**
 * Whether anything other than the POU itself names it. A function names itself to set its
 * return value, so its own body is not a use.
 */
function usedOutside(pou: PLCPou, usesByPou: Map<PLCPou, Set<string>>, otherUses: Set<string>): boolean {
  const name = pou.name.toUpperCase()
  if (otherUses.has(name)) return true
  for (const [other, uses] of usesByPou) {
    if (other !== pou && uses.has(name)) return true
  }
  return false
}
