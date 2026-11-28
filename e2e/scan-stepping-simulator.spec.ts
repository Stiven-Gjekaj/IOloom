/**
 * Single stepping on the simulator (upstream issue 557, IOloom #11), through the real app:
 * the Debugger button builds the firmware, starts the AVR simulator and opens the debug
 * session. Then Pause, Step and Resume drive the firmware over FC 0x4e.
 *
 * The build needs the Arduino AVR core. The test profile links the arduino-cli data folder of
 * SOURCE_USER_DATA (see arduino-build-project.ts), and the test skips when that folder has no
 * AVR core.
 */
import { expect, test } from '@playwright/test'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { SOURCE_USER_DATA } from './helpers/arduino-build-project'
import { launch, quitApp } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

const AVR_CORE = join(SOURCE_USER_DATA, 'arduino', 'data', 'packages', 'arduino', 'hardware', 'avr')
const PROJECT_NAME = 'scan_stepping'
const PROGRAM =
  'PROGRAM main\n  VAR\n    counter : INT := 0;\n    pulse AT %QX0.0 : BOOL;\n  END_VAR\n\ncounter := counter + 1;\npulse := TRUE;\n\nEND_PROGRAM\n'

test.skip(!existsSync(AVR_CORE), `no Arduino AVR core in ${AVR_CORE}`)

test('Pause holds the simulator between scans, Step runs one scan, Resume runs freely', async () => {
  test.setTimeout(600000)
  const { project, userData } = writeStProgramProject('openplc-e2e-scan-stepping', {
    name: PROJECT_NAME,
    program: PROGRAM,
    enums: [],
  })
  const configPath = join(project, 'devices', 'configuration.json')
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown>
  writeFileSync(configPath, JSON.stringify({ ...config, deviceBoard: 'OpenPLC Simulator' }))

  const { app, page } = await launch(userData)
  try {
    await page.getByText(PROJECT_NAME, { exact: true }).first().click({ timeout: 30000 })
    await page.getByText('main', { exact: true }).first().click({ timeout: 30000 })

    await page.getByRole('button', { name: 'Debugger' }).click()
    await page.getByRole('button', { name: 'Yes' }).click({ timeout: 30000 })

    await expect(page.getByTestId('scan-step-pause')).toBeVisible({ timeout: 480000 })
    // The live value of `counter` is the first inline value: " = 8 " after the name on line 1.
    const counterValue = async (): Promise<number> => {
      const text = (await page.locator('.debug-inline-value').first().textContent()) ?? ''
      const match = /-?\d+/.exec(text)
      return match ? Number(match[0]) : Number.NaN
    }
    /** The debugger polls the values, so a value is settled when two reads 1 s apart agree. */
    const settledCounter = async (): Promise<number> => {
      let previous = await counterValue()
      for (;;) {
        await page.waitForTimeout(1000)
        const next = await counterValue()
        if (next === previous) return next
        previous = next
      }
    }

    // Running: the counter moves.
    const running = await counterValue()
    await expect.poll(counterValue, { timeout: 10000 }).not.toBe(running)

    // Pause: the counter holds its value and is not set back to 0.
    await page.getByTestId('scan-step-pause').click()
    await expect(page.getByTestId('scan-step-paused')).toBeVisible()
    const held = await settledCounter()
    expect(held).toBeGreaterThan(0)
    await page.waitForTimeout(1500)
    expect(await counterValue()).toBe(held)

    // Step: exactly one scan.
    await page.getByTestId('scan-step-step').click()
    await expect.poll(counterValue, { timeout: 10000 }).toBe(held + 1)
    await page.waitForTimeout(1500)
    expect(await counterValue()).toBe(held + 1)

    // Resume: the counter moves on from where it was.
    await page.getByTestId('scan-step-resume').click()
    await expect(page.getByTestId('scan-step-pause')).toBeVisible()
    await expect.poll(counterValue, { timeout: 10000 }).toBeGreaterThan(held + 1)
  } finally {
    await quitApp(app, page)
  }
})
