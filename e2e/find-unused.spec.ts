/**
 * The search dialog lists the variables nothing uses (upstream issue 552, IOloom #22), and
 * a result opens its POU.
 */
import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

test('Find Unused lists an unused local variable and opens its POU', async () => {
  test.setTimeout(120000)
  const { userData } = writeStProgramProject('openplc-e2e-find-unused', {
    name: 'find_unused',
    program:
      'PROGRAM main\n  VAR\n    used_counter : INT;\n    spare_flag : BOOL;\n  END_VAR\n\nused_counter := used_counter + 1;\n\nEND_PROGRAM\n',
    enums: [],
  })
  const { app, page } = await launch(userData)
  try {
    await page.getByText('find_unused', { exact: true }).first().click({ timeout: 60000 })
    await page.getByText('main', { exact: true }).first().waitFor({ timeout: 30000 })

    await page.getByRole('button', { name: 'Search' }).click({ timeout: 30000 })
    await page.getByRole('button', { name: 'Find Unused', exact: true }).click()

    const rows = page.locator('li[aria-selected]')
    await expect(rows).toHaveCount(1, { timeout: 15000 })
    await expect(rows.first()).toContainText('spare_flag')
    await expect(page.getByText('used_counter : INT')).toHaveCount(0)

    await rows.first().click()
    await expect(page.locator('.monaco-editor:visible .view-lines').first()).toContainText('used_counter', {
      timeout: 15000,
    })
  } finally {
    await closeApp(app)
  }
})
