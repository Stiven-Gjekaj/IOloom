import { existsSync } from 'node:fs'
import { dirname } from 'node:path'

import { openConfigChannel, readConfigChannel } from '../config-channel'

describe('config channel', () => {
  it('delivers the config line to the client', async () => {
    const line = JSON.stringify({ password: 'secret', port: 'COM3' })
    const channel = await openConfigChannel(line)

    await expect(readConfigChannel(channel.path)).resolves.toBe(line)
    await channel.delivered
    channel.close()
  })

  it('serves one client only', async () => {
    const channel = await openConfigChannel('{"a":1}')
    await readConfigChannel(channel.path)
    await channel.delivered

    await expect(readConfigChannel(channel.path)).resolves.toBe('')
    channel.close()
  })

  it('names a pipe on Windows and a socket in a private folder elsewhere', async () => {
    const channel = await openConfigChannel('{}')
    if (process.platform === 'win32') {
      expect(channel.path).toMatch(/^\\\\\.\\pipe\\openplc-cli-[0-9a-f]{32}$/)
    } else {
      expect(channel.path).toMatch(/[0-9a-f]{32}\.sock$/)
      expect(existsSync(dirname(channel.path))).toBe(true)
    }
    channel.close()
    if (process.platform !== 'win32') expect(existsSync(dirname(channel.path))).toBe(false)
  })

  it('reads an empty line when nothing serves the path', async () => {
    const channel = await openConfigChannel('{}')
    channel.close()

    await expect(readConfigChannel(channel.path)).resolves.toBe('')
  })
})
