# Local Network (LAN) Chat Implementation Plan

This plan refactors the Chat Application to remove Firebase and authentication. It replaces them with a real-time, local-first system using **Server-Sent Events (SSE)**. This allows anyone on the same local network to discover each other and chat instantly by simply opening the page.

## Proposed Changes

### [Architectural Changes]

- **Remove Firebase**: All imports from `firebase/database`, `firebase/auth`, and `firebase/storage` will be removed.
- **Real-time Engine**: Implement a server-side "Hub" using Next.js API routes and global variables to manage active connections and message broadcasting.

### [API Hub]

#### [NEW] [route.ts](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/api/chat/events/route.ts)
- **SSE Stream**: Keeps connections open for real-time updates.
- **Peer Discovery**: Maintains a list of active clients (IPs/Names) and broadcasts "Join/Leave" events.

#### [NEW] [route.ts](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/api/chat/message/route.ts)
- **Broadcast**: Receive messages from clients and push them to all active SSE streams.

### [UI Components]

#### [chat-application/page.tsx](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/projects/creative-stuff/chat-application/page.tsx)
- **Anonymous Entry**: Replace login with a "Set Display Name" screen.
- **Real-time Sync**: Connect to the SSE endpoint on mount.
- **Peer List**: Update the sidebar to show "Devices on Network" instead of a fixed user list.
- **Local Memory**: Store recent messages in memory (cleared on server restart).

#### [DELETE] [login/page.tsx](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/projects/creative-stuff/chat-application/login/page.tsx)
#### [DELETE] [signup/page.tsx](file:///C:/Users/Public/Documents/vikasyadavnsit.github.io/app/projects/creative-stuff/chat-application/signup/page.tsx)

## Verification Plan

### Manual Verification
1. **Local Access**: Open the chat app in a browser tab. Set a name and join.
2. **Multi-Tab Test**: Open the app in a second tab. Verify the first tab "sees" the new user immediately in the sidebar.
3. **Real-time Chat**: Send a message from one tab and verify it appears instantly in the other.
4. **LAN Test**: (If possible) Access the app from another device on the same network using the host machine's local IP. Verify both devices can chat.
5. **Persistence**: Verify that the app works purely in memory without making any Firebase calls.
