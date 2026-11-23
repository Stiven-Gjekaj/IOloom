/**
 * Nested parallel branches in the ladder editor (upstream issue 1202, IOloom #2).
 *
 * The fixture rung is (a -> TOF0 | b) -> c. Before the fix, the editor offered no
 * parallel drop point under `a`, because `a` is on the top leg of a parallel. The
 * test places contact `d` there with the radial menu and checks the saved file:
 * c := TOF0(IN := a OR d).Q OR b.
 */
import type { ElectronApplication, Locator } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import {
  center,
  ladderFixturePaths,
  launchLadderApp,
  legsOfEachParallel,
  saveProject,
  savedRung,
  visible,
  writeLadderFixture,
} from './helpers/ladder-fixture'

const PATHS = ladderFixturePaths('nested-parallel')

let app: ElectronApplication | undefined

test.afterEach(async () => {
  await closeApp(app)
})

test('a contact dropped under a contact on the top leg of a parallel nests a parallel there', async () => {
  test.setTimeout(180000)
  writeLadderFixture(PATHS)
  const launched = await launchLadderApp(PATHS)
  app = launched.app
  const page = launched.page
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.getByText('nested-parallel', { exact: true }).first().click({ timeout: 60000 })
  await page.getByText('ldmain', { exact: true }).first().click({ timeout: 30000 })
  // The variable name is the value of the field in the node, not its text.
  const contacts = visible(page, '.react-flow__node-contact')
  await expect(contacts).toHaveCount(2, { timeout: 30000 })
  let contactA: Locator | undefined
  for (const contact of await contacts.all()) {
    if ((await contact.locator('textarea').inputValue()) === 'a') contactA = contact
  }
  if (!contactA) throw new Error('contact a is not on the rung')

  // Arm a contact from the radial menu, then show the drop points by moving over the rung.
  const pane = visible(page, '.react-flow__pane').first()
  const paneCenter = await center(pane)
  await page.mouse.click(paneCenter.x, paneCenter.y, { button: 'right' })
  const item = page.getByTestId('radial-menu-item-contact')
  const itemCenter = await center(item)
  await page.mouse.move(itemCenter.x, itemCenter.y)
  await page.mouse.click(itemCenter.x, itemCenter.y)
  await expect(page.getByTestId('cursor-follower')).toContainText('Contact')
  const a = await center(contactA)
  await page.mouse.move(a.x, a.y + 40)
  await page.mouse.move(a.x + 2, a.y + 42)

  // The parallel drop point under `a`: below a and above b, which sits under a on the bottom leg.
  let contactB: Locator | undefined
  for (const contact of await contacts.all()) {
    if ((await contact.locator('textarea').inputValue()) === 'b') contactB = contact
  }
  if (!contactB) throw new Error('contact b is not on the rung')
  const b = await center(contactB)
  const diamonds = visible(page, '.react-flow__node-parallelPlaceholder')
  await expect(diamonds.first()).toBeVisible({ timeout: 10000 })
  let best: { x: number; y: number } | undefined
  for (const diamond of await diamonds.all()) {
    const point = await center(diamond)
    if (point.y > a.y && point.y < b.y && Math.abs(point.x - a.x) < 20) best = point
  }
  if (!best) throw new Error('no parallel drop point between a and b')
  await page.mouse.click(best.x, best.y)

  // Name the new contact d.
  const field = page.locator('textarea[placeholder="???"]:focus')
  await expect(field).toHaveCount(1)
  await page.keyboard.type('d')
  await page.keyboard.press('Enter')

  // a and d hang from one inner parallel; that parallel and b hang from the outer one.
  await expect
    .poll(
      async () => {
        await saveProject(app!)
        const rung = savedRung(PATHS.ldFile)
        return rung ? legsOfEachParallel(rung).sort((x, y) => x.join().localeCompare(y.join())) : undefined
      },
      { timeout: 30000, intervals: [1000] },
    )
    .toEqual([
      ['a', 'd'],
      ['b', 'parallel'],
    ])
  expect(pageErrors).toEqual([])
})
