import { createEditorCourseModeAdapter } from '../course-mode-adapter'

let pushChange: ((enabled: unknown) => void) | null = null
const unsubscribe = jest.fn()

beforeEach(() => {
  pushChange = null
  unsubscribe.mockClear()
  window.bridge = {
    courseModeGetEnabled: jest.fn().mockResolvedValue(true),
    courseModeSetEnabled: jest.fn(),
    onCourseModeChanged: jest.fn().mockImplementation((callback: (enabled: unknown) => void) => {
      pushChange = callback
      return unsubscribe
    }),
  } as unknown as typeof window.bridge
})

describe('editor course mode adapter', () => {
  it('reads the setting from main, and reads anything but true as off', async () => {
    await expect(createEditorCourseModeAdapter().isEnabled()).resolves.toBe(true)
    jest.mocked(window.bridge.courseModeGetEnabled).mockResolvedValue('yes')
    await expect(createEditorCourseModeAdapter().isEnabled()).resolves.toBe(false)
  })

  it('sends a change to main', () => {
    createEditorCourseModeAdapter().setEnabled(false)
    expect(window.bridge.courseModeSetEnabled).toHaveBeenCalledWith(false)
  })

  it('passes each change on as a boolean and hands back the bridge unsubscribe', () => {
    const callback = jest.fn()
    const unsub = createEditorCourseModeAdapter().onChanged(callback)

    pushChange?.(false)
    pushChange?.(true)
    expect(callback.mock.calls).toEqual([[false], [true]])
    expect(unsub).toBe(unsubscribe)
  })
})
