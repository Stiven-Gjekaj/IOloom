import { planZipExtraction, type ZipEntryInfo } from '../zip-entry-safety'

const file = (name: string, unixPermissions: number | string | null = 0o100644): ZipEntryInfo => ({
  name,
  dir: false,
  unixPermissions,
})

describe('planZipExtraction', () => {
  it('returns the path segments of safe entries in archive order', () => {
    const plan = planZipExtraction([
      { name: 'lib/', dir: true, unixPermissions: 0o040755 },
      file('lib/core.c'),
      file('./manifest.json', null),
    ])
    expect(plan).toEqual([
      { segments: ['lib'], dir: true },
      { segments: ['lib', 'core.c'], dir: false },
      { segments: ['manifest.json'], dir: false },
    ])
  })

  it.each(['../evil', 'a/../../evil', 'a\\..\\..\\evil', 'a/..'])('refuses the traversal %s', (name) => {
    expect(() => planZipExtraction([file(name)])).toThrow(/outside the target folder/)
  })

  it.each(['/etc/evil', '\\evil', 'C:/evil', 'c:evil', 'a\0b'])('refuses the absolute path %s', (name) => {
    expect(() => planZipExtraction([file(name)])).toThrow(/absolute path/)
  })

  it('refuses a symbolic link', () => {
    expect(() => planZipExtraction([file('link', 0o120777)])).toThrow(/symbolic link/)
  })

  it('refuses a symbolic link with the mode as an octal string', () => {
    expect(() => planZipExtraction([file('link', '120777')])).toThrow(/symbolic link/)
  })

  it('refuses a file entry with no name', () => {
    expect(() => planZipExtraction([file('./')])).toThrow(/no file name/)
  })

  it('refuses the whole archive when one entry is unsafe', () => {
    expect(() => planZipExtraction([file('ok.txt'), file('../evil')])).toThrow()
  })
})
