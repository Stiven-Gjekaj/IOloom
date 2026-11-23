import { createEditorAutosaveAdapter } from '../autosave-adapter'

let pushChange: ((enabled: unknown) => void) | null = null
const unsubscribe = jest.fn()

beforeEach(() => {
  pushChange = null
  unsubscribe.mockClear()
  window.bridge = {
    autosaveGetEnabled: jest.fn().mockResolvedValue(true),
    autosaveSetEnabled: jest.fn(),
    onAutosaveChanged: jest.fn().mockImplementation((callback: (enabled: unknown) => void) => {
      pushChange = callback
      return unsubscribe
    }),
  } as unknown as typeof window.bridge
})

describe('editor autosave adapter', () => {
  it('reads the setting from main, and reads anything but true as off', async () => {
    await expect(createEditorAutosaveAdapter().isEnabled()).resolves.toBe(true)
    jest.mocked(window.bridge.autosaveGetEnabled).mockResolvedValue('yes')
    await expect(createEditorAutosaveAdapter().isEnabled()).resolves.toBe(false)
  })

  it('sends a change to main', () => {
    createEditorAutosaveAdapter().setEnabled(false)
    expect(window.bridge.autosaveSetEnabled).toHaveBeenCalledWith(false)
  })

  it('passes each change on as a boolean and hands back the bridge unsubscribe', () => {
    const callback = jest.fn()
    const unsub = createEditorAutosaveAdapter().onChanged(callback)

    pushChange?.(false)
    pushChange?.(true)
    expect(callback.mock.calls).toEqual([[false], [true]])
    expect(unsub).toBe(unsubscribe)
  })
})
