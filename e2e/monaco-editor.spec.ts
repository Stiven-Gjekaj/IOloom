import { expect, test } from '@playwright/test'

import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

/** The code editor loads the bundled Monaco, shows the body of a POU, and takes typed text. */
test('the ST editor shows the POU body and takes typed text', async () => {
  test.setTimeout(120000)
  const { userData } = writeStProgramProject('openplc-e2e-monaco-editor', {
    name: 'monaco_editor',
    program: 'PROGRAM main\n  VAR\n    counter : INT;\n  END_VAR\n\ncounter := counter + 1;\n\nEND_PROGRAM\n',
    enums: [],
  })
  const { app, page } = await launch(userData)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  try {
    await page.getByText('monaco_editor', { exact: true }).first().click({ timeout: 30000 })
    await page.getByText('main', { exact: true }).first().click({ timeout: 30000 })

    const body = page.locator('.monaco-editor .view-lines').first()
    await expect(body).toContainText('counter := counter + 1', { timeout: 30000 })

    await body.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' // typed')
    await expect(body).toContainText('// typed', { timeout: 10000 })
    expect(pageErrors).toEqual([])
  } finally {
    app.process().kill('SIGKILL')
  }
})
