import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { readElmt, toSvg } from './elmt.ts'
const files = execSync(`cd ${process.argv[2]} && find . -name '*.elmt'`, { maxBuffer: 1 << 26 }).toString().trim().split('\n').sort()
const pick = process.argv[4] ? files.filter((f) => f.includes(process.argv[4])) : files
const step = Math.max(1, Math.floor(pick.length / 48))
const cells: string[] = []
for (let i = 0, k = 0; i < pick.length && k < 48; i += step, k++) {
  const s = readElmt(readFileSync(process.argv[2] + '/' + pick[i], 'utf8'))
  const inner = toSvg(s).replace('<svg ', `<svg x="${(k % 8) * 120 + 5}" y="${Math.floor(k / 8) * 120 + 5}" width="110" height="110" `).replace(/ width="[\d.]+" height="[\d.]+"(?= stroke)/, '')
  cells.push(`<rect x="${(k % 8) * 120}" y="${Math.floor(k / 8) * 120}" width="120" height="120" fill="#fff" stroke="#ccc"/>` + inner)
}
writeFileSync(process.argv[3], `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><rect width="960" height="720" fill="#fff"/>${cells.join('')}</svg>`)
