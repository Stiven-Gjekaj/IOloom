/**
 * The online view of the program (upstream issue 536, IOloom #10): while a debug session is
 * open, the editor panel has a green border and an "Online" badge. The window keeps no frame.
 *
 * Needs a build made with OPENPLC_E2E_DEBUG_SEAM=1; `npm run test:e2e` sets it.
 */
import { expect, test } from '@playwright/test'

import { launch, quitApp } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

type DebugSessionSeam = { open(): void; close(): void; isOpen(): boolean }

declare global {
  interface Window {
    __OPENPLC_E2E_DEBUG_SESSION__?: DebugSessionSeam
  }
}

const PROJECT_NAME = 'online_view'
const PROGRAM = 'PROGRAM main\n  VAR\n    a : BOOL;\n  END_VAR\n\na := NOT a;\n\nEND_PROGRAM\n'

test('a debug session marks the editor panel as online, and closing it removes the mark', async () => {
  test.setTimeout(120000)
  const { userData } = writeStProgramProject('openplc-e2e-online-view', {
    name: PROJECT_NAME,
    program: PROGRAM,
    enums: [],
  })
  const { app, page } = await launch(userData)
  try {
    await page.getByText(PROJECT_NAME, { exact: true }).first().click({ timeout: 30000 })
    await page.getByText('main', { exact: true }).first().click({ timeout: 30000 })

    const panel = page.locator('#editorPanel')
    const badge = page.getByTestId('online-view-badge')
    await expect(panel).toBeVisible({ timeout: 30000 })
    await expect(panel).not.toHaveAttribute('data-online-view', 'true')
    await expect(badge).toHaveCount(0)

    await expect.poll(() => page.evaluate(() => typeof window.__OPENPLC_E2E_DEBUG_SESSION__)).toBe('object')
    await page.evaluate(() => window.__OPENPLC_E2E_DEBUG_SESSION__?.open())

    await expect(panel).toHaveAttribute('data-online-view', 'true')
    await expect(badge).toHaveText('Online')
    await expect(panel).toHaveCSS('border-top-color', 'rgb(34, 197, 94)')
    await expect(page.locator('[data-debug-session-frame="true"]')).toHaveCount(0)

    await page.evaluate(() => window.__OPENPLC_E2E_DEBUG_SESSION__?.close())

    await expect(panel).not.toHaveAttribute('data-online-view', 'true')
    await expect(badge).toHaveCount(0)
  } finally {
    await quitApp(app, page)
  }
})
