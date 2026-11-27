/**
 * A folder of the `strucpp` package in an app that is not packaged.
 *
 * Node finds the `strucpp` package in the nearest `node_modules` folder at or above the app
 * folder. This function looks in the same folders, so it finds the files of the package
 * that the compiler loads. An e2e run starts the app from `release/app/dist/main`, and the
 * package is in the `node_modules` folder of the repository root.
 *
 * The platform supplies the mechanisms: the parent of a folder, the join of path segments,
 * and a test that a path exists. When no folder has the files, the result is the path
 * below `appPath`, so the error message names the first place to look.
 */
export interface StrucppDirMechanisms {
  parent: (folder: string) => string
  join: (...segments: string[]) => string
  exists: (path: string) => boolean
}

/** The runtime headers that the generated C++ includes. */
export const STRUCPP_RUNTIME_INCLUDE = ['src', 'runtime', 'include']

/** The bundled `.stlib` libraries. */
export const STRUCPP_LIBS = ['libs']

export function findStrucppDir(
  appPath: string,
  inPackage: readonly string[],
  { parent, join, exists }: StrucppDirMechanisms,
): string {
  const segments = ['node_modules', 'strucpp', ...inPackage]
  let folder = appPath
  for (;;) {
    const candidate = join(folder, ...segments)
    if (exists(candidate)) return candidate
    const above = parent(folder)
    if (above === folder) return join(appPath, ...segments)
    folder = above
  }
}
