import { applyHiddenWindowsMode } from '../hidden-windows'

const makeElectron = () => {
  const show = jest.fn()
  const showInactive = jest.fn()
  const focus = jest.fn()
  const maximize = jest.fn()
  const setBounds = jest.fn()
  const windowClass = { prototype: { show, showInactive, focus, maximize, setBounds } }
  const workArea = { x: 0, y: 25, width: 1512, height: 920 }
  const screen = { getPrimaryDisplay: () => ({ workArea }) }
  const listeners: Array<(event: unknown, window: { webContents: { setBackgroundThrottling: jest.Mock } }) => void> = []
  const app = {
    focus: jest.fn(),
    dock: { hide: jest.fn() },
    on: jest.fn((_event: string, listener: (typeof listeners)[number]) => listeners.push(listener)),
  }
  return {
    windowClass,
    app,
    screen,
    workArea,
    setBounds,
    listeners,
    original: { show, showInactive, focus, maximize, appFocus: app.focus },
  }
}

describe('applyHiddenWindowsMode', () => {
  it('changes nothing when IOLOOM_E2E_HIDDEN is not 1', () => {
    for (const value of [undefined, '0', 'true']) {
      const { windowClass, app, screen, original } = makeElectron()
      expect(applyHiddenWindowsMode({ IOLOOM_E2E_HIDDEN: value }, windowClass, app, screen)).toBe(false)
      expect(windowClass.prototype.show).toBe(original.show)
      expect(app.focus).toBe(original.appFocus)
      expect(app.dock.hide).not.toHaveBeenCalled()
      expect(app.on).not.toHaveBeenCalled()
    }
  })

  it('stops show, focus and maximize when IOLOOM_E2E_HIDDEN is 1', () => {
    const { windowClass, app, screen, original } = makeElectron()
    expect(applyHiddenWindowsMode({ IOLOOM_E2E_HIDDEN: '1' }, windowClass, app, screen)).toBe(true)

    windowClass.prototype.show()
    windowClass.prototype.showInactive()
    windowClass.prototype.focus()
    windowClass.prototype.maximize()
    app.focus({ steal: true })

    expect(original.show).not.toHaveBeenCalled()
    expect(original.showInactive).not.toHaveBeenCalled()
    expect(original.focus).not.toHaveBeenCalled()
    expect(original.maximize).not.toHaveBeenCalled()
    expect(original.appFocus).not.toHaveBeenCalled()
    expect(app.dock.hide).toHaveBeenCalledTimes(1)
  })

  it('marks a hidden window when the app asks to show it', () => {
    const { windowClass, app, screen } = makeElectron()
    applyHiddenWindowsMode({ IOLOOM_E2E_HIDDEN: '1' }, windowClass, app, screen)

    const shown: { ioloomShowRequested?: boolean } = {}
    const inactive: { ioloomShowRequested?: boolean } = {}
    windowClass.prototype.show.call(shown)
    windowClass.prototype.showInactive.call(inactive)

    expect(shown.ioloomShowRequested).toBe(true)
    expect(inactive.ioloomShowRequested).toBe(true)
  })

  it('gives a maximized hidden window the size of the work area', () => {
    const { windowClass, app, screen, workArea, setBounds } = makeElectron()
    applyHiddenWindowsMode({ IOLOOM_E2E_HIDDEN: '1' }, windowClass, app, screen)

    windowClass.prototype.maximize()

    expect(setBounds).toHaveBeenCalledWith(workArea)
  })

  it('turns off the background throttle of each new window', () => {
    const { windowClass, app, screen, listeners } = makeElectron()
    applyHiddenWindowsMode({ IOLOOM_E2E_HIDDEN: '1' }, windowClass, app, screen)

    const setBackgroundThrottling = jest.fn()
    listeners.forEach((listener) => listener({}, { webContents: { setBackgroundThrottling } }))

    expect(setBackgroundThrottling).toHaveBeenCalledWith(false)
  })
})
