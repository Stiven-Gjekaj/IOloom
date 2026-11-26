/**
 * Example projects on the start screen (upstream issue 245, IOloom #26). An example opens
 * as a copy, a save of it runs Save As, and the bundled example does not change.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { saveProject } from './helpers/electron-editor'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

const BUNDLED_BLINK = join(__dirname, '..', 'resources', 'examples', 'blink', 'pous', 'programs', 'main.st')

test('an example opens from the start screen, and its save asks for a folder', async () => {
  test.setTimeout(120000)
  const before = readFileSync(BUNDLED_BLINK, 'utf-8')
  const { project, userData } = writeStProgramProject('openplc-e2e-example-projects', {
    name: 'some_project',
    program: 'PROGRAM main\nEND_PROGRAM\n',
    enums: [],
  })
  const target = join(project, '..', 'saved-blink')
  mkdirSync(target, { recursive: true })

  const { app, page } = await launch(userData)
  try {
    const examples = page.getByLabel('Example projects')
    await expect(examples.getByText('Blink', { exact: true })).toBeVisible({ timeout: 60000 })
    await expect(examples.getByText('Traffic Light', { exact: true })).toBeVisible()
    await expect(examples.getByText('Tank Level', { exact: true })).toBeVisible()
    await examples.getByText('Blink', { exact: true }).click()

    await page.getByText('main', { exact: true }).first().click({ timeout: 30000 })
    const body = page.locator('.monaco-editor:visible .view-lines').first()
    await expect(body).toContainText('on_timer', { timeout: 30000 })

    await app.evaluate(({ dialog }, folder) => {
      dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [folder] })) as typeof dialog.showOpenDialog
    }, target)
    await saveProject(app)

    await expect.poll(() => existsSync(join(target, 'project.json')), { timeout: 30000 }).toBe(true)
    expect(readFileSync(join(target, 'pous', 'programs', 'main.st'), 'utf-8')).toContain('on_timer')
    expect(readFileSync(BUNDLED_BLINK, 'utf-8')).toBe(before)
  } finally {
    await closeApp(app)
  }
})
