/**
 * Nested parallel branches in the ladder editor (upstream issue 1202, IOloom #2).
 *
 * The fixture rung is (a -> TOF0 | b) -> c. Before the fix, the editor offered no
 * parallel drop point under `a`, because `a` is on the top leg of a parallel. The
 * test places contact `d` there with the radial menu and checks the saved file:
 * c := TOF0(IN := a OR d).Q OR b.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ElectronApplication, Locator, Page } from '@playwright/test'
import { _electron as electron, expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'

const ROOT = join(tmpdir(), 'openplc-e2e-nested-parallel')
const FIXTURE = join(ROOT, 'project')
const USER_DATA = join(ROOT, 'userdata')
const LD_FILE = join(FIXTURE, 'pous', 'programs', 'ldmain.ld')

const vars = `  VAR
    a : BOOL;
    b : BOOL;
    c : BOOL;
    d : BOOL;
    TOF0 : TOF;
  END_VAR
`

function writeFixture(): void {
  rmSync(ROOT, { recursive: true, force: true })
  mkdirSync(join(FIXTURE, 'pous', 'programs'), { recursive: true })
  mkdirSync(join(FIXTURE, 'devices'), { recursive: true })
  writeFileSync(
    join(FIXTURE, 'project.json'),
    JSON.stringify({
      meta: { name: 'nested-parallel', type: 'plc-project' },
      data: {
        dataTypes: [],
        pous: [],
        configuration: {
          resource: {
            tasks: [{ name: 'task0', triggering: 'Cyclic', interval: 'T#20ms', priority: 1 }],
            instances: [{ name: 'instance0', program: 'ldmain', task: 'task0' }],
            globalVariables: [],
          },
        },
        libraries: [],
        debugVariables: { global: [], pous: {} },
      },
    }),
  )
  writeFileSync(
    join(FIXTURE, 'devices', 'configuration.json'),
    JSON.stringify({
      deviceBoard: 'OpenPLC Runtime v3',
      communicationPort: '',
      runtimeIpAddress: '',
      selectedPlatformOptions: {},
    }),
  )
  writeFileSync(join(FIXTURE, 'devices', 'pin-mapping.json'), '{}')
  const rung: unknown = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'nested-parallel-rung.json'), 'utf-8'))
  writeFileSync(LD_FILE, `PROGRAM ldmain\n${vars}\n${JSON.stringify({ name: 'ldmain', rungs: [rung] })}\nEND_PROGRAM\n`)

  const history = join(USER_DATA, 'User', 'History')
  mkdirSync(history, { recursive: true })
  writeFileSync(
    join(history, 'projects.json'),
    JSON.stringify([
      {
        name: 'nested-parallel',
        path: FIXTURE,
        projectFilePath: join(FIXTURE, 'project.json'),
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
      },
    ]),
  )
  writeFileSync(join(history, 'libraries.json'), '[]')
  const runtime = join(USER_DATA, 'User', 'Runtime')
  mkdirSync(runtime, { recursive: true })
  writeFileSync(join(runtime, 'arduino-core-control.json'), '[]')
  writeFileSync(join(runtime, 'arduino-library-control.json'), '[]')
}

async function launch(): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [join(__dirname, '..', 'release', 'app', 'dist', 'main', 'main.js'), `--user-data-dir=${USER_DATA}`],
    env: { ...process.env, NODE_ENV: 'production' },
  })
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    for (const w of app.windows()) {
      try {
        if (w.url().includes('index.html')) {
          await w.waitForLoadState('domcontentloaded')
          return { app, page: w }
        }
      } catch {
        /* window is closing; skip it */
      }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('main window never appeared')
}

const center = async (locator: Locator) => {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const visible = (page: Page, selector: string) => page.locator(`${selector}:visible`)

const save = (app: ElectronApplication) =>
  app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('index.html'))
    win?.webContents.send('project:save-accelerator')
  })

type SavedNode = { id: string; type: string; data: { type?: string; variable?: { name?: string } } }
type SavedEdge = { source: string; target: string }

function savedRung(): { nodes: SavedNode[]; edges: SavedEdge[] } | undefined {
  try {
    const text = readFileSync(LD_FILE, 'utf-8')
    const json = text.slice(text.indexOf('END_VAR') + 'END_VAR'.length, text.lastIndexOf('END_PROGRAM'))
    return (JSON.parse(json) as { rungs: Array<{ nodes: SavedNode[]; edges: SavedEdge[] }> }).rungs[0]
  } catch {
    return undefined
  }
}

/** The contact names that each OPEN parallel feeds directly, sorted. */
function legsOfEachParallel(rung: { nodes: SavedNode[]; edges: SavedEdge[] }): string[][] {
  const byId = new Map(rung.nodes.map((n) => [n.id, n]))
  return rung.nodes
    .filter((n) => n.type === 'parallel' && n.data.type === 'open')
    .map((open) =>
      rung.edges
        .filter((e) => e.source === open.id)
        .map((e) => byId.get(e.target))
        .map((n) => (n?.type === 'contact' ? (n.data.variable?.name ?? '') : (n?.type ?? '')))
        .sort(),
    )
}

let app: ElectronApplication | undefined

test.afterEach(async () => {
  await closeApp(app)
})

test('a contact dropped under a contact on the top leg of a parallel nests a parallel there', async () => {
  test.setTimeout(180000)
  writeFixture()
  const launched = await launch()
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
        await save(app!)
        const rung = savedRung()
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
