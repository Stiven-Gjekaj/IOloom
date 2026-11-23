import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

/** The autosave setting goes from the main process to the window and back (upstream issue 443). */
test('the autosave setting is on by default, and a change reaches the window and the native menu', async () => {
  test.setTimeout(120000)
  const { userData } = writeStProgramProject('openplc-e2e-autosave', {
    name: 'autosave_project',
    program: 'PROGRAM main\n  VAR\n    x : INT;\n  END_VAR\n\nx := 1;\n\nEND_PROGRAM\n',
    enums: [],
  })
  const { app, page } = await launch(userData)
  try {
    type Bridge = {
      autosaveGetEnabled(): Promise<unknown>
      autosaveSetEnabled(enabled: boolean): void
      onAutosaveChanged(callback: (enabled: unknown) => void): () => void
    }
    expect(await page.evaluate(() => (window as unknown as { bridge: Bridge }).bridge.autosaveGetEnabled())).toBe(true)

    const changed = page.evaluate(
      () =>
        new Promise<unknown>((resolve) => {
          const { bridge } = window as unknown as { bridge: Bridge }
          const off = bridge.onAutosaveChanged((enabled) => {
            off()
            resolve(enabled)
          })
          bridge.autosaveSetEnabled(false)
        }),
    )
    expect(await changed).toBe(false)
    expect(await page.evaluate(() => (window as unknown as { bridge: Bridge }).bridge.autosaveGetEnabled())).toBe(false)

    const menuChecked = await app.evaluate(({ Menu }) => {
      const find = (items: Electron.MenuItem[]): Electron.MenuItem | undefined => {
        for (const item of items) {
          if (item.label === 'Autosave Every 10 Minutes') return item
          const inner = item.submenu ? find(item.submenu.items) : undefined
          if (inner) return inner
        }
        return undefined
      }
      return find(Menu.getApplicationMenu()?.items ?? [])?.checked
    })
    expect(menuChecked).toBe(false)
  } finally {
    await closeApp(app)
  }
})
