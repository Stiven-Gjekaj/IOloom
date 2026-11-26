/**
 * Auto-connect in FBD (upstream issue 539, IOloom #21): a block dragged so that its inputs
 * land on the outputs of another block connects to them, and the save keeps the connections.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { closeApp } from './helpers/close-app'
import { saveProject } from './helpers/electron-editor'
import { launch } from './helpers/ethercat-project'
import { writeStProgramProject } from './helpers/st-program-project'

/** A TON block that the editor's FBD builder made, moved to (`x`, 96) on the snap grid and renamed. */
function tonBlock(id: string, x: number, numericId: string, name: string): unknown {
  const node = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'element-dialog', 'fbd-ton-block.json'), 'utf-8'))
  const shift = { x: x - node.position.x, y: 96 - node.position.y }
  return {
    ...node,
    id,
    position: { x, y: 96 },
    data: {
      ...node.data,
      numericId,
      variable: { name },
      handles: node.data.handles.map((handle: { glbPosition: { x: number; y: number } }) => ({
        ...handle,
        glbPosition: { x: handle.glbPosition.x + shift.x, y: handle.glbPosition.y + shift.y },
      })),
    },
  }
}

test('a block dropped with its input on another block output connects to it', async () => {
  test.setTimeout(120000)
  const { project, userData } = writeStProgramProject('openplc-e2e-fbd-auto-connect', {
    name: 'fbd_auto_connect',
    program: 'PROGRAM main\nEND_PROGRAM\n',
    enums: [],
  })
  const programs = join(project, 'pous', 'programs')
  mkdirSync(programs, { recursive: true })
  const body = {
    name: 'main',
    rung: {
      comment: '',
      nodes: [tonBlock('BLOCK_A', 192, '1001', 'TON0'), tonBlock('BLOCK_B', 400, '1002', 'TON1')],
      edges: [],
      selectedNodes: [],
    },
  }
  writeFileSync(
    join(programs, 'main.fbd'),
    `PROGRAM main\n  VAR\n    TON0 : TON;\n    TON1 : TON;\n  END_VAR\n\n${JSON.stringify(body)}\nEND_PROGRAM\n`,
  )
  rmSync(join(programs, 'main.st'))

  const { app, page } = await launch(userData)
  try {
    await page.getByText('fbd_auto_connect', { exact: true }).first().click({ timeout: 60000 })
    await page.getByText('main', { exact: true }).first().click({ timeout: 30000 })
    const blockB = page.locator('.react-flow__node[data-id="BLOCK_B"]')
    await blockB.waitFor({ timeout: 30000 })
    await expect(page.locator('.react-flow__edge')).toHaveCount(0)

    const scale = await page
      .locator('.react-flow__viewport')
      .first()
      .evaluate((viewport) => new DOMMatrixReadOnly(getComputedStyle(viewport).transform).a)
    const box = await blockB.boundingBox()
    const boxA = await page.locator('.react-flow__node[data-id="BLOCK_A"]').boundingBox()
    if (!box || !boxA) throw new Error('a block has no box')
    // Move left until B's input edge is on A's output edge. The drag snaps to a 16-unit
    // grid and lags the pointer, so the test follows the block instead of a fixed distance.
    const start = { x: box.x + box.width / 2, y: box.y + 10 }
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    let pointerX = start.x
    for (let step = 0; step < 60; step++) {
      const now = await blockB.boundingBox()
      if (now && Math.abs(now.x - (boxA.x + boxA.width)) <= 8 * scale) break
      pointerX -= 4 * scale
      await page.mouse.move(pointerX, start.y)
    }
    await page.mouse.up()

    // Both TON blocks have Q and ET at the same heights as IN and PT, so both pairs touch.
    await expect(page.locator('.react-flow__edge')).toHaveCount(2, { timeout: 10000 })

    await saveProject(app)
    await expect
      .poll(
        () => {
          const text = readFileSync(join(programs, 'main.fbd'), 'utf-8')
          const saved = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
          return saved.rung.edges.map((edge: Record<string, string>) =>
            [edge.source, edge.sourceHandle, edge.target, edge.targetHandle].join(' '),
          )
        },
        { timeout: 15000 },
      )
      .toEqual(['BLOCK_A Q BLOCK_B IN', 'BLOCK_A ET BLOCK_B PT'])
  } finally {
    await closeApp(app)
  }
})
