import type { ElectronApplication } from '@playwright/test'

/**
 * Ends the app at the end of a test.
 *
 * `app.close()` waits for the app to quit. With unsaved changes, or with the
 * quit prompt of the editor, the app shows a dialog first, and nothing answers
 * it in a test, so `app.close()` never returns. This tries a normal close for
 * `graceMs`, then kills the process. A test that needs the dialog answered must
 * answer it before it calls this.
 */
export async function closeApp(app: ElectronApplication | undefined, graceMs = 10000): Promise<void> {
  if (!app) return
  const process = app.process()
  const closed = app.close().then(
    () => true,
    () => true,
  )
  const ended = await Promise.race([
    closed,
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), graceMs)),
  ])
  if (!ended && process.exitCode === null) process.kill('SIGKILL')
}
