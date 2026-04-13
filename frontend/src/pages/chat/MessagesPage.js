// Section 4.7c follow-up — wrapper page that hosts <InternalChat /> at /messages.
//
// Background: section 4.7c-exec migrated B2B chat into the /internal-chat/* backend
// + the InternalChat component, but routes pointed to the legacy ChatProvider
// page (ChatsPage / ChatPage) hitting /chat/*. Migrated B2B conversations were
// not visible. Founder picked option C: render <InternalChat /> directly at
// /messages and translate URL params/path into props.
//
// URL contract this wrapper supports:
//   /messages                            → inbox
//   /messages/:conversationId            → opens that conversation
//   /messages?to=<userId>                → starts/loads conversation with user
//   /messages?new=1                      → opens the new-conversation directory sheet
//   /messages?type=<filter>              → reserved (filter pill not yet wired
//                                          inside InternalChat; ignored cleanly)
//   /messages?producer_id=<userId>       → alias of ?to= for B2B entry points
//
// We intentionally do NOT pass `isEmbedded` / `onClose` so InternalChat renders
// as a top-level page and the BottomNavBar / browser back govern navigation.
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import InternalChat from '../../components/InternalChat';

export default function MessagesPage() {
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();

  const toUserId =
    searchParams.get('to') || searchParams.get('producer_id') || null;
  const openDirectory = searchParams.get('new') === '1' || searchParams.get('new') === 'true';

  return (
    <div className="flex h-[calc(100vh-56px)] min-h-[480px] w-full bg-white md:h-[calc(100vh-88px)]">
      <InternalChat
        isEmbedded
        initialConversationId={conversationId || null}
        initialChatUserId={toUserId}
        openDirectoryOnMount={openDirectory}
      />
    </div>
  );
}
