import type { BrowserWindow } from 'electron'

import { createBooleanSetting } from '../index'

const handlers = new Map<string, (...args: unknown[]) => unknown>()
const listeners = new Map<string, (...args: unknown[]) => unknown>()
jest.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => handlers.set(channel, fn),
    on: (channel: string, fn: (...args: unknown[]) => unknown) => listeners.set(channel, fn),
  },
}))

const values = new Map<string, unknown>()
jest.mock('../../store', () => ({
  store: {
    get: (key: string) => values.get(key),
    set: (key: string, value: unknown) => values.set(key, value),
  },
}))

const send = jest.fn()
const window = { isDestroyed: () => false, webContents: { send } } as unknown as BrowserWindow

beforeEach(() => {
  handlers.clear()
  listeners.clear()
  values.clear()
  send.mockClear()
})

describe('createBooleanSetting', () => {
  it('reads the default until the user changes the setting', () => {
    const on = createBooleanSetting({ key: 'autosave', channelPrefix: 'autosave', defaultValue: true }, () => window)
    expect(on.isEnabled()).toBe(true)
    expect(handlers.get('autosave:get-enabled')?.()).toBe(true)

    const off = createBooleanSetting({ key: 'autosave', channelPrefix: 'other', defaultValue: false }, () => window)
    expect(off.isEnabled()).toBe(false)
  })

  it('stores a change and tells the window and the local listeners', () => {
    const setting = createBooleanSetting(
      { key: 'autosave', channelPrefix: 'autosave', defaultValue: true },
      () => window,
    )
    const listener = jest.fn()
    setting.onChange(listener)

    setting.setEnabled(false)

    expect(setting.isEnabled()).toBe(false)
    expect(send).toHaveBeenCalledWith('autosave:changed', false)
    expect(listener).toHaveBeenCalledWith(false)
  })

  it('takes a boolean from the in-app menu and ignores anything else', () => {
    const setting = createBooleanSetting(
      { key: 'autosave', channelPrefix: 'autosave', defaultValue: true },
      () => window,
    )
    listeners.get('autosave:set-enabled')?.({}, 'no')
    expect(setting.isEnabled()).toBe(true)
    listeners.get('autosave:set-enabled')?.({}, false)
    expect(setting.isEnabled()).toBe(false)
  })
})
