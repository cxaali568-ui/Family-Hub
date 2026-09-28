/**
 * Friendly timestamp formatter for real-time messages
 */
export function formatMessageTimestamp(isoOrDate: string | Date | undefined): string {
  if (!isoOrDate) return '';
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 45) {
    return 'Just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Today
  const isToday =
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();
  if (isToday) {
    return `Today ${timeStr}`;
  }

  // Yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear();
  if (isYesterday) {
    return `Yesterday ${timeStr}`;
  }

  // Older
  return date.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  }) + `, ${timeStr}`;
}

/**
 * Formats a day divider (e.g. "Today", "Yesterday", or "Monday, Oct 14")
 */
export function formatMessageDateDivider(isoOrDate: string | Date | undefined): string {
  if (!isoOrDate) return '';
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear();
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
  });
}
