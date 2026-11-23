/**
 * A project with one LD program, ldmain, whose single rung is (a -> TOF0 | b) -> c.
 * Shared by the ladder editor e2e specs.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ElectronApplication, Locator, Page } from '@playwright/test'
import { _electron as electron } from '@playwright/test'

export type LadderFixture = { root: string; fixture: string; userData: string; ldFile: string }

export function ladderFixturePaths(name: string): LadderFixture {
  const root = join(tmpdir(), `openplc-e2e-${name}`)
  const fixture = join(root, 'project')
  return { root, fixture, userData: join(root, 'userdata'), ldFile: join(fixture, 'pous', 'programs', 'ldmain.ld') }
}

const vars = `  VAR
    a : BOOL;
    b : BOOL;
    c : BOOL;
    d : BOOL;
    TOF0 : TOF;
  END_VAR
`

export function writeLadderFixture({
  root: ROOT,
  fixture: FIXTURE,
  userData: USER_DATA,
  ldFile: LD_FILE,
}: LadderFixture): void {
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
  const rung: unknown = JSON.parse(
    readFileSync(join(__dirname, '..', 'fixtures', 'nested-parallel-rung.json'), 'utf-8'),
  )
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

export async function launchLadderApp({
  userData: USER_DATA,
}: LadderFixture): Promise<{ app: ElectronApplication; page: Page }> {
  const app = await electron.launch({
    args: [join(__dirname, '..', '..', 'release', 'app', 'dist', 'main', 'main.js'), `--user-data-dir=${USER_DATA}`],
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

export const center = async (locator: Locator) => {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

export const visible = (page: Page, selector: string) => page.locator(`${selector}:visible`)

export const saveProject = (app: ElectronApplication) =>
  app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('index.html'))
    win?.webContents.send('project:save-accelerator')
  })

export type SavedNode = {
  id: string
  type: string
  data: { type?: string; variant?: string; variable?: { name?: string } }
}
export type SavedEdge = { source: string; target: string }

export function savedRung(ldFile: string): { nodes: SavedNode[]; edges: SavedEdge[] } | undefined {
  try {
    const text = readFileSync(ldFile, 'utf-8')
    const json = text.slice(text.indexOf('END_VAR') + 'END_VAR'.length, text.lastIndexOf('END_PROGRAM'))
    return (JSON.parse(json) as { rungs: Array<{ nodes: SavedNode[]; edges: SavedEdge[] }> }).rungs[0]
  } catch {
    return undefined
  }
}

/** The contact names that each OPEN parallel feeds directly, sorted. */
export function legsOfEachParallel(rung: { nodes: SavedNode[]; edges: SavedEdge[] }): string[][] {
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
