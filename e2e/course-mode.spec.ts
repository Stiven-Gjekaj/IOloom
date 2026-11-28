/**
 * Course mode (roadmap Q1): the editor hides the cloud account and the servers (Modbus,
 * OPC UA, S7) while it is on, and shows them again when it goes off. The setting goes from
 * the main process to the window, and the native Display menu follows it.
 */
import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

type Bridge = {
  courseModeGetEnabled(): Promise<unknown>
  courseModeSetEnabled(enabled: boolean): void
}

test('course mode hides the cloud account and the servers, and shows them again', async () => {
  test.setTimeout(120000)
  // A Runtime v4 board: it can host servers, and the editor offers the Edge account.
  const { userData } = writeStProgramProject('openplc-e2e-course-mode', {
    name: 'course_mode_project',
    program: 'PROGRAM main\n  VAR\n    x : INT;\n  END_VAR\n\nx := 1;\n\nEND_PROGRAM\n',
    enums: [],
  })
  const { app, page } = await launch(userData)
  const setCourseMode = (enabled: boolean) =>
    page.evaluate((value) => (window as unknown as { bridge: Bridge }).bridge.courseModeSetEnabled(value), enabled)
  const nativeToggle = () =>
    app.evaluate(({ Menu }) => {
      const find = (items: Electron.MenuItem[]): Electron.MenuItem | undefined => {
        for (const item of items) {
          if (item.label === 'Course Mode') return item
          const inner = item.submenu ? find(item.submenu.items) : undefined
          if (inner) return inner
        }
        return undefined
      }
      return find(Menu.getApplicationMenu()?.items ?? [])?.checked
    })

  try {
    await page.getByText('course_mode_project', { exact: true }).first().click({ timeout: 30000 })
    const servers = page.getByText('Servers', { exact: true })
    const signIn = page.getByRole('button', { name: 'Sign in to Autonomy Edge' })
    await expect(servers).toBeVisible({ timeout: 30000 })
    await expect(signIn).toBeVisible()

    // Off by default.
    expect(await page.evaluate(() => (window as unknown as { bridge: Bridge }).bridge.courseModeGetEnabled())).toBe(
      false,
    )

    await setCourseMode(true)
    await expect(servers).toHaveCount(0)
    await expect(signIn).toHaveCount(0)
    await expect.poll(nativeToggle).toBe(true)

    await setCourseMode(false)
    await expect(servers).toBeVisible()
    await expect(signIn).toBeVisible()
    await expect.poll(nativeToggle).toBe(false)
  } finally {
    await closeApp(app)
  }
})
