/**
 * An INTERFACE is a POU of its own (upstream issue 1266, IOloom #14).
 *
 * The project on disk holds one interface in pous/interfaces. The tree lists it under
 * Interfaces, and its tab shows a note in place of the variables table and the METHOD
 * prototypes in the code editor. A second interface made with the create dialog is saved
 * to pous/interfaces with its header and END_INTERFACE.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { saveProject } from './helpers/electron-editor'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

const PROJECT_NAME = 'interface_project'

test('an interface opens from disk, and a new one is created and saved to pous/interfaces', async () => {
  test.setTimeout(180000)
  const { project, userData } = writeStProgramProject('openplc-e2e-interface-pou', {
    name: PROJECT_NAME,
    program: 'PROGRAM main\n  VAR\n    x : INT;\n  END_VAR\n\nx := 1;\n\nEND_PROGRAM\n',
    enums: [],
  })
  mkdirSync(join(project, 'pous', 'interfaces'), { recursive: true })
  writeFileSync(
    join(project, 'pous', 'interfaces', 'I_Base.st'),
    'INTERFACE I_Base\nMETHOD Reset : BOOL\nEND_METHOD\nEND_INTERFACE\n',
  )

  const { app, page } = await launch(userData)
  try {
    await page.getByText(PROJECT_NAME, { exact: true }).first().click({ timeout: 60000 })
    await page.getByText('Interfaces', { exact: true }).first().waitFor({ timeout: 30000 })

    await page.getByText('I_Base', { exact: true }).first().click({ timeout: 30000 })
    await expect(page.locator('[aria-label="Interface note"]:visible')).toBeVisible({ timeout: 30000 })
    const body = page.locator('.monaco-editor:visible .view-lines').first()
    await expect(body).toContainText('METHOD Reset : BOOL', { timeout: 30000 })

    await page.locator('#create-plc-element-trigger').click()
    await page.locator('#create-interface-trigger').hover()
    await page.locator('#pou-name').fill('I_Run')
    await expect(page.getByText('Language: Structured Text')).toBeVisible()
    await page.getByRole('button', { name: 'Create', exact: true }).click()

    await expect(page.locator('[aria-label="Interface note"]:visible')).toBeVisible({ timeout: 30000 })
    const newBody = page.locator('.monaco-editor:visible .view-lines').first()
    await newBody.click()
    await page.keyboard.type('METHOD Stop')
    await page.keyboard.press('Enter')
    await page.keyboard.type('END_METHOD')
    await expect(newBody).toContainText('END_METHOD', { timeout: 10000 })

    await saveProject(app)
    const saved = join(project, 'pous', 'interfaces', 'I_Run.st')
    await expect.poll(() => existsSync(saved), { timeout: 30000 }).toBe(true)
    await expect
      .poll(() => readFileSync(saved, 'utf-8').replace(/[ \t]+$/gm, ''), { timeout: 30000 })
      .toMatch(/^INTERFACE I_Run\nMETHOD Stop\n\s*END_METHOD\nEND_INTERFACE$/)
  } finally {
    await closeApp(app)
  }
})
