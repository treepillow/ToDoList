const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const dateFormatWithYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

/** Formats a YYYY-MM-DD date like Notion ("Sep 30"), adding the year only when it differs. */
export function formatDueDate(isoDate: string, today = new Date()): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y!, m! - 1, d!); // local midnight — avoids UTC off-by-one
  return (y === today.getFullYear() ? dateFormat : dateFormatWithYear).format(date);
}
