/**
 * The border classes of the editor panel. While a debug session is open (the online view,
 * upstream issue 536), the border is green.
 */
export const editorPanelBorderClass = (isOnline: boolean): string =>
  isOnline ? 'border-green-500 dark:border-green-500' : 'border-neutral-200 dark:border-neutral-800'
