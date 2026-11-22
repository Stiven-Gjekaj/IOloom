import DOMPurify from 'dompurify'

const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Highlights each match of the search query in the body.
 * The body comes from project data, so each part is escaped before it goes into HTML.
 */
const extractSearchQuery = (body: string, searchQuery: string): string => {
  const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi')
  // With a capture group, split puts each match at an odd index.
  const html = body
    .split(regex)
    .map((part, index) =>
      index % 2 === 1
        ? `<span class='bg-brand-light dark:bg-brand-medium-dark border-0 rounded-sm'>${escapeHtml(part)}</span>`
        : escapeHtml(part),
    )
    .join('')

  return DOMPurify.sanitize(html)
}

/** Highlights ONE occurrence by position, so two rows for the same line do not look alike. */
const highlightOccurrence = ({
  preview,
  previewColumn,
  length,
}: {
  preview: string
  previewColumn: number
  length: number
}): string => {
  const start = Math.max(0, previewColumn - 1)
  const end = start + length
  const html = `${escapeHtml(preview.slice(0, start))}<span class='bg-brand-light dark:bg-brand-medium-dark border-0 rounded-sm'>${escapeHtml(
    preview.slice(start, end),
  )}</span>${escapeHtml(preview.slice(end))}`

  return DOMPurify.sanitize(html)
}

export { escapeRegExp, extractSearchQuery, highlightOccurrence }
