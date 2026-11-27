/** A folder of the `strucpp` package in an app that is not packaged. */
import { dirname, join } from 'node:path'

import { findStrucppDir, STRUCPP_LIBS, STRUCPP_RUNTIME_INCLUDE } from '../strucpp-dir'

const mechanisms = (present: string[]) => ({ parent: dirname, join, exists: (path: string) => present.includes(path) })

describe('findStrucppDir', () => {
  it('uses the folder below the app folder when it is there', () => {
    const own = '/repo/node_modules/strucpp/src/runtime/include'
    expect(findStrucppDir('/repo', STRUCPP_RUNTIME_INCLUDE, mechanisms([own]))).toBe(own)
  })

  it('finds the folder above the app folder, as Node finds the package', () => {
    const root = '/repo/node_modules/strucpp/libs'
    expect(findStrucppDir('/repo/release/app/dist/main', STRUCPP_LIBS, mechanisms([root]))).toBe(root)
  })

  it('uses the nearest folder when two folders have the files', () => {
    const near = '/repo/release/app/node_modules/strucpp/libs'
    const far = '/repo/node_modules/strucpp/libs'
    expect(findStrucppDir('/repo/release/app/dist/main', STRUCPP_LIBS, mechanisms([far, near]))).toBe(near)
  })

  it('names the path below the app folder when no folder has the files', () => {
    expect(findStrucppDir('/repo/app', STRUCPP_RUNTIME_INCLUDE, mechanisms([]))).toBe(
      '/repo/app/node_modules/strucpp/src/runtime/include',
    )
  })
})
