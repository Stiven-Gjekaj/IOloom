/**
 * Export to PDF keeps the characters that the embedded Latin fonts lack (upstream issue
 * 1171, IOloom #15). The app draws them with a system font. The PDF is saved through a
 * stubbed save dialog and its text is read back with pdf.js.
 *
 * The CJK check needs a system CJK font: the macOS and Windows candidates always have
 * one, a Linux system only when a CJK font package is installed.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

const PROJECT_NAME = 'export_non_latin'

/** The text of each page, joined, as pdf.js reads it. */
async function pdfText(path: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)) }).promise
  const parts: string[] = []
  for (let number = 1; number <= doc.numPages; number++) {
    const content = await (await doc.getPage(number)).getTextContent()
    parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(''))
  }
  return parts.join('\n')
}

test('an exported PDF keeps CJK, Cyrillic and the degree Celsius sign', async () => {
  test.setTimeout(180000)
  const { project, userData } = writeStProgramProject('openplc-e2e-export-non-latin', {
    name: PROJECT_NAME,
    program: 'PROGRAM main\n  VAR\n    x : INT;\n  END_VAR\n\n(* 温度 Мотор 25℃ *)\nx := 1;\n\nEND_PROGRAM\n',
    enums: [],
  })
  const target = join(project, 'out.pdf')

  const { app, page } = await launch(userData)
  try {
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = (async () => ({ canceled: false, filePath })) as typeof dialog.showSaveDialog
    }, target)

    await page.getByText(PROJECT_NAME, { exact: true }).first().click({ timeout: 60000 })
    await expect(page.getByText('main', { exact: true }).first()).toBeVisible({ timeout: 30000 })
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('index.html'))
      win?.webContents.send('project:print-accelerator')
    })
    await page.getByRole('button', { name: 'Next', exact: true }).click({ timeout: 15000 })
    await page.getByRole('button', { name: 'Next', exact: true }).click({ timeout: 15000 })
    const exportButton = page.getByRole('button', { name: 'Export', exact: true })
    await expect(exportButton).toBeEnabled({ timeout: 60000 })
    await exportButton.click()

    await expect.poll(async () => pdfText(target).catch(() => ''), { timeout: 30000 }).toContain('Мотор')
    const text = await pdfText(target)
    expect(text).toContain('25℃')
    expect(text).toContain('温度')
  } finally {
    await closeApp(app)
  }
})
