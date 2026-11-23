/**
 * A disconnect must release the serial port, also when the port is still
 * opening (upstream issue 1189). Before the fix, a disconnect in that window
 * dropped the handle without a close, the open completed after it, and the
 * port stayed busy until the editor quit.
 */

import { EventEmitter } from 'node:events'

import { ModbusRtuClient } from '../modbus-rtu-client'

/** A fake port with the open state of `@serialport/stream`: `opening`, then `isOpen`. */
class FakePort extends EventEmitter {
  isOpen = false
  opening = false
  closeCalls = 0

  open(): void {
    this.opening = true
  }

  /** Completes the open that `open()` started. */
  finishOpen(): void {
    this.opening = false
    this.isOpen = true
    this.emit('open')
  }

  close(callback: (error: Error | null) => void): void {
    this.closeCalls++
    this.isOpen = false
    callback(null)
  }
}

const clientWith = (port: FakePort) =>
  new ModbusRtuClient({ port: 'COM3', baudRate: 115200, slaveId: 1, timeout: 100, serialPort: port as never })

describe('ModbusRtuClient.disconnect', () => {
  it('closes an open port', async () => {
    const port = new FakePort()
    const client = clientWith(port)
    const connected = client.connect()
    port.finishOpen()
    await connected

    client.disconnect()
    await client.closed()

    expect(port.closeCalls).toBe(1)
    expect(port.isOpen).toBe(false)
  })

  it('closes a port that finishes opening after the disconnect', async () => {
    const port = new FakePort()
    const client = clientWith(port)
    void client.connect()
    expect(port.opening).toBe(true)

    client.disconnect()
    expect(port.closeCalls).toBe(0)
    port.finishOpen()
    await client.closed()

    expect(port.closeCalls).toBe(1)
    expect(port.isOpen).toBe(false)
  })

  it('does not wait for a port that fails to open', async () => {
    const port = new FakePort()
    const client = clientWith(port)
    const connected = client.connect().catch(() => undefined)

    client.disconnect()
    port.emit('error', new Error('Access denied'))
    await client.closed()
    await connected

    expect(port.closeCalls).toBe(0)
  })

  it('does nothing for a port that is neither open nor opening', async () => {
    const port = new FakePort()
    const client = clientWith(port)
    void client.connect()
    port.opening = false

    client.disconnect()
    await client.closed()

    expect(port.closeCalls).toBe(0)
  })
})
