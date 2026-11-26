/**
 * The example projects that come with the editor (upstream issue 245). The platform reads
 * each example folder; this module turns what it read into what the start screen shows.
 */

/** One example folder as the platform read it. */
export interface ExampleProjectEntry {
  /** The folder name, which also identifies the example. */
  folder: string
  /** The text of project.json, or '' when the platform could not read it. */
  projectJson: string
  /** The text of pous/programs/main.st, or '' when there is none. */
  mainSource: string
}

export interface ExampleProject {
  folder: string
  name: string
  description: string
}

const projectName = (projectJson: string): string | null => {
  try {
    const parsed: unknown = JSON.parse(projectJson)
    const name = (parsed as { meta?: { name?: unknown } } | null)?.meta?.name
    return typeof name === 'string' && name.trim() !== '' ? name.trim() : null
  } catch {
    return null
  }
}

/**
 * The first comment of the main program, without a leading `<name>:` and with a capital
 * first letter. The examples start with one that says what they do.
 */
const leadingComment = (source: string, name: string): string => {
  const match = /^\s*\(\*([\s\S]*?)\*\)/.exec(source)
  if (!match) return ''
  const text = match[1].replace(/\s+/g, ' ').trim()
  const prefix = `${name}:`
  const description = text.toLowerCase().startsWith(prefix.toLowerCase()) ? text.slice(prefix.length).trim() : text
  return description.charAt(0).toUpperCase() + description.slice(1)
}

/** The examples to show, sorted by name. A folder without a readable project.json is left out. */
export function describeExampleProjects(entries: readonly ExampleProjectEntry[]): ExampleProject[] {
  return entries
    .flatMap((entry) => {
      const name = projectName(entry.projectJson)
      return name ? [{ folder: entry.folder, name, description: leadingComment(entry.mainSource, name) }] : []
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Whether `folder` names one of the examples: the only folders the platform may copy. */
export function isExampleFolder(folder: string, entries: readonly ExampleProjectEntry[]): boolean {
  return /^[A-Za-z0-9_-]+$/.test(folder) && entries.some((entry) => entry.folder === folder)
}
