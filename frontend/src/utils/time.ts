/**
 * timeAgo -- returns a human-readable Spanish relative time string.
 * Shared across PostCard, PostDetailModal, StoryViewer, PostViewer, PostDetailPage.
 */
export function timeAgo(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return 'hace 1m';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `hace ${diffD}d`;
}
