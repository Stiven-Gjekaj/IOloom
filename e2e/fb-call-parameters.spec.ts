/**
 * Typing the call of a function block instance offers all its parameters (upstream issue
 * 576, IOloom #20). The block here is the project's own: the first upstream version
 * completed only blocks picked from the library. A test profile has no libraries
 * installed, so a library block such as TON is covered by the unit tests.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

test('the call of a function block instance completes with all its parameters', async () => {
  test.setTimeout(120000)
  const { project, userData } = writeStProgramProject('openplc-e2e-fb-call-parameters', {
    name: 'fb_call_parameters',
    program: 'PROGRAM main\n  VAR\n    scale0 : FB_Scale;\n  END_VAR\n\nscale0.K := 2;\n\nEND_PROGRAM\n',
    enums: [],
  })
  const blocks = join(project, 'pous', 'function-blocks')
  mkdirSync(blocks, { recursive: true })
  writeFileSync(
    join(blocks, 'FB_Scale.st'),
    'FUNCTION_BLOCK FB_Scale\n  VAR_INPUT\n    X : INT;\n    K : INT;\n  END_VAR\n  VAR_IN_OUT\n    Total : INT;\n  END_VAR\n  VAR_OUTPUT\n    Y : INT;\n  END_VAR\n  VAR\n    last : INT;\n  END_VAR\n\nY := X * K;\n\nEND_FUNCTION_BLOCK',
  )
  const { app, page } = await launch(userData)
  try {
    await page.getByText('fb_call_parameters', { exact: true }).first().click({ timeout: 60000 })
    await page.getByText('main', { exact: true }).first().click({ timeout: 30000 })
    const body = page.locator('.monaco-editor:visible .view-lines').first()
    await expect(body).toContainText('scale0.K', { timeout: 30000 })

    await body.click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type('scale0(')
    const suggestion = page.locator('.monaco-editor:visible .suggest-widget').getByText('scale0( all parameters )')
    await expect(suggestion).toBeVisible({ timeout: 15000 })
    await suggestion.click()

    await expect(body).toContainText('X := , K := , Total := , Y => ', { timeout: 10000 })
  } finally {
    await closeApp(app)
  }
})
