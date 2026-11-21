// Spike: read every .elmt file under a folder, draw each as SVG, and count the results.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { readElmt, toSvg } from './elmt.ts'

const root = process.argv[2]
const outDir = process.argv[3]
if (!root || !outDir) throw new Error('usage: run.ts <elements dir> <out dir>')
mkdirSync(outDir, { recursive: true })

const files: string[] = []
const walk = (d: string): void => {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (statSync(p).isDirectory()) walk(p)
    else if (p.endsWith('.elmt')) files.push(p)
  }
}
walk(root)

let ok = 0
let noTerminals = 0
let emptyNames = 0
const unknown = new Map<string, number>()
const fails: string[] = []
const t0 = performance.now()
let svgBytes = 0
for (const file of files) {
  try {
    const s = readElmt(readFileSync(file, 'utf8'))
    const svg = toSvg(s)
    svgBytes += svg.length
    ok++
    if (s.terminals.length === 0) noTerminals++
    if (s.terminals.some((t) => t.name === '')) emptyNames++
    for (const u of s.unknown) unknown.set(u, (unknown.get(u) ?? 0) + 1)
  } catch (e) {
    fails.push(`${relative(root, file)}: ${(e as Error).message}`)
  }
}
const ms = performance.now() - t0

// Draw a sample sheet of 120 symbols, one from each step through the list.
const step = Math.max(1, Math.floor(files.length / 120))
const cells: string[] = []
for (let i = 0; i < files.length && cells.length < 120; i += step) {
  try {
    const s = readElmt(readFileSync(files[i], 'utf8'))
    const svg = toSvg(s).replace(/ width="[^"]*" height="[^"]*"/, ' width="110" height="110"')
    cells.push(`<div><div class="s">${svg}</div><p>${s.names.en ?? s.names.fr ?? '?'}</p></div>`)
  } catch {
    /* counted above */
  }
}
writeFileSync(
  join(outDir, 'sample.html'),
  `<!doctype html><meta charset="utf-8"><style>body{font:11px sans-serif;display:grid;grid-template-columns:repeat(10,1fr);gap:6px}div.s{background:#fff;border:1px solid #ccc;height:110px;display:flex;align-items:center;justify-content:center}p{margin:2px;height:28px;overflow:hidden}</style>${cells.join('')}`,
)

console.log(JSON.stringify({
  files: files.length, ok, failed: fails.length, ms: Math.round(ms), msPerFile: +(ms / files.length).toFixed(3),
  svgMB: +(svgBytes / 1e6).toFixed(1), noTerminals, withEmptyTerminalName: emptyNames,
  unknownTags: Object.fromEntries(unknown), firstFails: fails.slice(0, 10),
}, null, 2))
