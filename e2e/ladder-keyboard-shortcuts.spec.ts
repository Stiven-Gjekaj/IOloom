/**
 * Keyboard shortcuts in the ladder editor (upstream issue 496, IOloom #6).
 *
 * The fixture rung is (a -> TOF0 | b) -> c. A click selects a; the arrow keys move
 * the selection; Ctrl+Enter (Cmd+Enter on macOS) changes the kind of a contact;
 * Enter puts the cursor in the variable field.
 */
import type { ElectronApplication, Locator, Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import {
  ladderFixturePaths,
  launchLadderApp,
  saveProject,
  savedRung,
  visible,
  writeLadderFixture,
} from './helpers/ladder-fixture'

const PATHS = ladderFixturePaths('ladder-keyboard')
const CHANGE_KIND = process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter'

let app: ElectronApplication | undefined

test.afterEach(async () => {
  await closeApp(app)
})

/** The node whose variable field holds `name`. */
async function nodeNamed(page: Page, name: string): Promise<Locator> {
  for (const node of await visible(page, '.react-flow__node').all()) {
    const field = node.locator('textarea')
    if ((await field.count()) > 0 && (await field.first().inputValue()) === name) return node
  }
  throw new Error(`no node named ${name}`)
}

/** The variable names of the selected nodes. */
async function selectedNames(page: Page): Promise<string[]> {
  const names: string[] = []
  for (const node of await visible(page, '.react-flow__node.selected').all()) {
    const field = node.locator('textarea')
    if ((await field.count()) > 0) names.push(await field.first().inputValue())
  }
  return names
}

test('arrow keys move the selection, Ctrl+Enter changes the kind, Enter edits the name', async () => {
  test.setTimeout(180000)
  writeLadderFixture(PATHS)
  const launched = await launchLadderApp(PATHS)
  app = launched.app
  const page = launched.page

  await page.getByText('nested-parallel', { exact: true }).first().click({ timeout: 60000 })
  await page.getByText('ldmain', { exact: true }).first().click({ timeout: 30000 })
  await expect(visible(page, '.react-flow__node-contact')).toHaveCount(2, { timeout: 30000 })

  // Select a with a click on its symbol, below the name field.
  const a = await nodeNamed(page, 'a')
  const box = await a.boundingBox()
  if (!box) throw new Error('a has no box')
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 4)
  await expect.poll(() => selectedNames(page)).toEqual(['a'])

  await page.keyboard.press('ArrowRight')
  await expect.poll(() => selectedNames(page)).toEqual(['TOF0'])
  await page.keyboard.press('ArrowLeft')
  await expect.poll(() => selectedNames(page)).toEqual(['a'])
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => selectedNames(page)).toEqual(['b'])

  await page.keyboard.press(CHANGE_KIND)
  await expect.poll(() => selectedNames(page), { message: 'the element stays selected' }).toEqual(['b'])

  await page.keyboard.press('Enter')
  const field = (await nodeNamed(page, 'b')).locator('textarea')
  await expect(field).toBeFocused()

  // Keys typed in the field stay in the field: an arrow does not move the selection.
  await page.keyboard.press('ArrowRight')
  await expect(field).toBeFocused()

  await expect
    .poll(
      async () => {
        await saveProject(app!)
        return savedRung(PATHS.ldFile)?.nodes.find((n) => n.type === 'contact' && n.data.variable?.name === 'b')?.data
      },
      { timeout: 30000, intervals: [1000] },
    )
    .toMatchObject({ variant: 'negated' })
})
