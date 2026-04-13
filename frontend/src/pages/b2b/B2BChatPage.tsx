// @ts-nocheck
// Section 4.7c — B2B chat unified into the global InternalChat.
// This page is now a thin redirect that preserves any conversationId param
// and forwards to /messages with ?type=b2b. The legacy /b2b/chat URLs keep
// working for existing links and external referrers.
import React, { useEffect } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';

// Preserved for backward compatibility — some tests/imports reference it.
export function getB2BConversationId(conversation: any) {
  return conversation?.conversation_id || conversation?.id || null;
}

export default function B2BChatPage() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const producer = searchParams.get('producer');

  // Build target URL on the unified inbox.
  let target = '/messages?type=b2b';
  if (conversationId) {
    target = `/messages/${conversationId}?type=b2b`;
  } else if (producer) {
    target = `/messages?type=b2b&producer_id=${encodeURIComponent(producer)}&new=true`;
  }

  useEffect(() => {
    // Telemetry: legacy entry point hit
    try {
      // @ts-ignore
      window?.dispatchEvent?.(new CustomEvent('analytics', { detail: { event: 'b2b_chat_legacy_redirect', target } }));
    } catch {/* noop */}
  }, [target]);

  return <Navigate to={target} replace />;
}
