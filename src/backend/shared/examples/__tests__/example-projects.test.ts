/** The example projects of the start screen (upstream issue 245, IOloom #26). */
import { describeExampleProjects, type ExampleProjectEntry, isExampleFolder } from '../example-projects'

const entry = (folder: string, name: string | null, mainSource = ''): ExampleProjectEntry => ({
  folder,
  projectJson: name === null ? 'not json' : JSON.stringify({ meta: { name, type: 'plc-project' } }),
  mainSource,
})

describe('describeExampleProjects', () => {
  it('takes the name from project.json and the description from the first comment, without the name', () => {
    expect(describeExampleProjects([entry('blink', 'Blink', '(* Blink: a lamp\n   blinks. *)\nPROGRAM main')])).toEqual(
      [{ folder: 'blink', name: 'Blink', description: 'a lamp blinks.' }],
    )
  })

  it('sorts by name and leaves out a folder without a readable project.json', () => {
    const list = describeExampleProjects([entry('b', 'Zeta'), entry('broken', null), entry('a', 'Alpha')])
    expect(list.map((example) => example.name)).toEqual(['Alpha', 'Zeta'])
  })

  it('gives an empty description when the program has no leading comment', () => {
    expect(describeExampleProjects([entry('x', 'X', 'PROGRAM main\nEND_PROGRAM')])[0].description).toBe('')
  })
})

describe('isExampleFolder', () => {
  const entries = [entry('blink', 'Blink')]

  it('accepts a listed folder only', () => {
    expect(isExampleFolder('blink', entries)).toBe(true)
    expect(isExampleFolder('other', entries)).toBe(false)
  })

  it('refuses a path', () => {
    expect(isExampleFolder('../blink', [entry('../blink', 'X')])).toBe(false)
  })
})
