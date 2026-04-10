type FeedDiagnosticEvent = {
  id: string;
  timestamp: string;
  phase: string;
  source?: string;
  primaryEndpoint?: string;
  fallbackEndpoint?: string;
  fallbackAttempted?: boolean;
  fallbackSucceeded?: boolean;
  pageParam?: string | null;
  limit?: number;
  status?: number;
  code?: string | null;
  message?: string;
  online?: boolean;
  connectionType?: string | null;
  effectiveType?: string | null;
  visibilityState?: string | null;
  retryCount?: number;
  cachedPostsCount?: number;
  diagnosticId?: string;
  [key: string]: any;
};

const BUFFER_KEY = 'hsp:feed:diagnostics';
const BUFFER_SIZE = 40;

function getConnectionInfo() {
  if (typeof navigator === 'undefined') {
    return { connectionType: null, effectiveType: null };
  }

  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  return {
    connectionType: connection?.type || null,
    effectiveType: connection?.effectiveType || null,
  };
}

function newDiagnosticId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `fd_${crypto.randomUUID()}`;
  }

  return `fd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getFeedDiagnostics(): FeedDiagnosticEvent[] {
  if (typeof window === 'undefined') return [];

  const memoryBuffer = (window as any).__HSP_FEED_DIAGNOSTICS__;
  if (Array.isArray(memoryBuffer)) return memoryBuffer;

  try {
    const raw = window.localStorage.getItem(BUFFER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordFeedDiagnostic(event: Partial<FeedDiagnosticEvent>): FeedDiagnosticEvent {
  const { connectionType, effectiveType } = getConnectionInfo();
  const payload: FeedDiagnosticEvent = {
    id: event.id || newDiagnosticId(),
    timestamp: new Date().toISOString(),
    phase: event.phase || 'unknown',
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    visibilityState: typeof document !== 'undefined' ? document.visibilityState : null,
    connectionType,
    effectiveType,
    ...event,
  };

  if (typeof window !== 'undefined') {
    const current = getFeedDiagnostics();
    const next = [...current, payload].slice(-BUFFER_SIZE);
    (window as any).__HSP_FEED_DIAGNOSTICS__ = next;

    try {
      window.localStorage.setItem(BUFFER_KEY, JSON.stringify(next));
    } catch {
      // Best effort only.
    }
  }

  console.warn('[feed:diag]', payload);
  return payload;
}

export function attachDiagnosticToError(error: any, diagnostic: FeedDiagnosticEvent): void {
  if (!error || !diagnostic) return;

  try {
    error.diagnosticId = diagnostic.id;
    error.feedDiagnostic = diagnostic;
  } catch {
    // Best effort only.
  }
}
