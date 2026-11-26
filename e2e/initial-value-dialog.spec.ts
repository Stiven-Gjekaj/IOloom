/**
 * The Initial Value dialog of a structure variable (upstream issue 1184, IOloom #23). It
 * reads the current initializer, and Apply writes the members back as one initializer
 * that the save puts into the program file.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { saveProject } from './helpers/electron-editor'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

test('the dialog edits the members of a structure initial value, and the save keeps them', async () => {
  test.setTimeout(120000)
  const { project, userData } = writeStProgramProject('openplc-e2e-initial-value-dialog', {
    name: 'initial_value_dialog',
    program:
      'PROGRAM main\n  VAR\n    scale : Scaling := (IN_LO := 800);\n  END_VAR\n\nscale.PV_HI := 1.0;\n\nEND_PROGRAM\n',
    enums: [],
  })
  mkdirSync(join(project, 'datatypes'), { recursive: true })
  writeFileSync(
    join(project, 'datatypes', 'Scaling.dt'),
    'TYPE\n  Scaling : STRUCT\n    IN_LO : INT := 0;\n    IN_HI : INT := 4000;\n    PV_HI : REAL;\n  END_STRUCT;\nEND_TYPE\n',
  )

  const { app, page } = await launch(userData)
  try {
    await page.getByText('initial_value_dialog', { exact: true }).first().click({ timeout: 60000 })
    await page.getByText('main', { exact: true }).first().click({ timeout: 30000 })
    await page.locator('tr', { hasText: 'scale' }).first().click({ timeout: 30000 })
    await page.getByLabel('Edit the member initial values').first().click({ timeout: 15000 })

    await expect(page.getByLabel('Initial value of IN_LO')).toHaveValue('800')
    await page.getByLabel('Initial value of PV_HI').fill('100.0')
    await page.getByRole('button', { name: 'Apply' }).click()
    await expect(page.getByLabel('Edit the member initial values').first()).toBeVisible()

    await saveProject(app)
    const program = join(project, 'pous', 'programs', 'main.st')
    await expect
      .poll(() => readFileSync(program, 'utf-8'), { timeout: 15000 })
      .toContain('scale : Scaling := (IN_LO := 800, PV_HI := 100.0);')
  } finally {
    await closeApp(app)
  }
})
