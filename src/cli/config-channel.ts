/**
 * A one-use local socket that carries the daemon config from the CLI to the
 * daemon it spawns.
 *
 * The config went over the stdin of the child. On Windows an Electron child
 * gets EOF on stdin and never sees the line, so `debug open` failed with
 * "Malformed daemon config" (upstream issue 1188). A local socket works on
 * each platform: a named pipe on Windows, a Unix socket elsewhere.
 *
 * The config holds the runtime password, so it does not go into argv or the
 * environment. Only the socket path goes into the environment. The path has a
 * random part, the Unix socket is in a folder that only this user can read,
 * and the server closes after the first connection.
 */

import { randomBytes } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { createConnection, createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** The environment variable that names the socket to the daemon. */
export const CONFIG_CHANNEL_ENV = 'OPENPLC_DAEMON_CONFIG_CHANNEL'

export interface ConfigChannel {
  /** The socket path to give the daemon. */
  path: string
  /** Resolves when a client has read the config. */
  delivered: Promise<void>
  /** Stops the server and removes the socket folder. Safe to call more than once. */
  close(): void
}

/** Opens the socket and serves `line` to the first client that connects. */
export function openConfigChannel(line: string, platform: NodeJS.Platform = process.platform): Promise<ConfigChannel> {
  const token = randomBytes(16).toString('hex')
  // A Unix socket path must be short (about 104 bytes on macOS), so the folder name stays short.
  const dir = platform === 'win32' ? null : mkdtempSync(join(tmpdir(), 'oplc-'))
  const path = platform === 'win32' ? `\\\\.\\pipe\\openplc-cli-${token}` : join(dir!, `${token}.sock`)

  let closed = false
  const server = createServer()
  const close = (): void => {
    if (closed) return
    closed = true
    server.close()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }

  const delivered = new Promise<void>((resolve) => {
    server.once('connection', (socket) => {
      // One client only: a second connection finds no server.
      server.close()
      socket.on('error', () => undefined)
      socket.end(`${line}\n`, () => {
        close()
        resolve()
      })
    })
  })

  return new Promise((resolve, reject) => {
    server.once('error', (error) => {
      close()
      reject(error)
    })
    server.listen(path, () => resolve({ path, delivered, close }))
  })
}

/** Connects to the socket at `path` and reads the first line. Resolves '' when the line does not come. */
export function readConfigChannel(path: string): Promise<string> {
  return new Promise((resolve) => {
    let buffered = ''
    let done = false
    const finish = (value: string): void => {
      if (done) return
      done = true
      socket.destroy()
      resolve(value)
    }
    const socket = createConnection(path)
    socket.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf-8')
      const newline = buffered.indexOf('\n')
      if (newline !== -1) finish(buffered.slice(0, newline))
    })
    socket.on('end', () => finish(buffered))
    socket.on('error', () => finish(''))
  })
}
