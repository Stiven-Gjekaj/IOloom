/**
 * Hidden window mode for end-to-end tests.
 *
 * When `IOLOOM_E2E_HIDDEN` is `1`, no window of the app comes onto the screen,
 * and the app takes no focus. The pages still load and run, so Playwright can
 * drive them. The test runner sets this variable. A person who wants to watch
 * a test sets it to `0`.
 */

/** The parts of the Electron window class that this mode changes. */
interface WindowClass {
  prototype: {
    show: () => void
    showInactive: () => void
    focus: () => void
    maximize: () => void
    setBounds: (bounds: Bounds) => void
  }
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** The part of the Electron screen module that this mode reads. */
interface ScreenLike {
  getPrimaryDisplay: () => { workArea: Bounds }
}

/** The parts of the Electron app that this mode changes. */
interface AppLike {
  focus: (options?: { steal: boolean }) => void
  dock?: { hide: () => void }
  on: (event: 'browser-window-created', listener: (event: unknown, window: WindowLike) => void) => unknown
}

interface WindowLike {
  webContents: { setBackgroundThrottling: (allowed: boolean) => void }
}

const isHiddenWindowsMode = (env: NodeJS.ProcessEnv): boolean => env.IOLOOM_E2E_HIDDEN === '1'

/**
 * Stops each window from coming onto the screen. Returns true when the mode is on.
 *
 * A hidden page is a background page, and Chromium then pauses its animation
 * frames. The editor draws on animation frames, so this mode also turns off the
 * background throttle of each new window.
 *
 * Maximize sets the size of the work area and does not show the window. The
 * layout then has the same size as on the screen. At the default size the app
 * shows its notice for small screens.
 */
const applyHiddenWindowsMode = (
  env: NodeJS.ProcessEnv,
  windowClass: WindowClass,
  app: AppLike,
  screen: ScreenLike,
): boolean => {
  if (!isHiddenWindowsMode(env)) return false

  const noop = (): void => {}
  windowClass.prototype.show = noop
  windowClass.prototype.showInactive = noop
  windowClass.prototype.focus = noop
  windowClass.prototype.maximize = function maximizeHidden(this: WindowClass['prototype']) {
    this.setBounds(screen.getPrimaryDisplay().workArea)
  }
  app.focus = noop
  app.dock?.hide()
  app.on('browser-window-created', (_event, window) => {
    window.webContents.setBackgroundThrottling(false)
  })
  return true
}

export { applyHiddenWindowsMode, isHiddenWindowsMode }
