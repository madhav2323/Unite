# Unite — Real-Time Collaborative Code Editor

## Overview

pnpm workspace monorepo. Each package manages its own dependencies.

## Stack

- **Frontend**: React + Vite + Tailwind + Monaco Editor + xterm.js + framer-motion
- **Backend**: Node.js + Express + Socket.IO (path: `/api/socket.io`)
- **Storage**: In-memory workspace objects (no DB)
- **Theme**: VS Code + Hacker Theme (#0d1117 bg, #161b22 panel, #00ff9c accent)

## Architecture

### Single Workspace Model
One workspace per session, controlled by Admin. No local/global distinction.

### File-Based Collaboration
- Admin creates files (main.py, app.js, etc.) inside the workspace
- Users select a file to open it in the Monaco editor
- Multiple users can edit the same file simultaneously with live cursors
- Each file has its own version history

### Role System
- **Admin (Owner)**: Full control — create files, approve/reject join/save/restore requests, edit code, run code, manage users
- **Editor**: Can type and edit code in real-time, request save, request restore, run code, use terminal
- **Viewer**: Read-only (Monaco `readOnly: true`), can see code and cursors, use chat

### Join Flow
1. Admin creates workspace → gets workspace code
2. Users request to join with name + code
3. Admin sees popup → Approve as Editor / Approve as Viewer / Reject
4. Approved users enter the workspace

### File Creation
- Only Admin can create files via the + button in the File Explorer
- Supported extensions: `.py`, `.js`, `.ts`, `.cpp`, `.c`, `.java`, `.json`, `.html`, etc.
- Language auto-detected from extension; starter code pre-filled

### Save Permission System
- **Admin** clicks "Save" → immediately creates a version + broadcasts saved code
- **Editor** clicks "Request Save" → sends save request to Admin with code snapshot
- Admin sees popup: Approve → saves code + creates version; Reject → notifies editor

### Version History
- Per-file, max 50 versions stored in memory
- **Admin** clicks "Restore" on a version → immediately restores + creates new version entry
- **Editor** clicks "Request" on a version → sends restore request to Admin
- Users can view version list but cannot restore directly (only request)

### Real-Time Editing
- `codeChange` event with `fileId` → `codeUpdate` broadcast to all other users in room
- Monaco Editor `deltaDecorations` renders remote cursors with username labels
- Cursors filtered by `fileId` — only shown for users editing the same file

### Chat
- Single global chat panel (persisted in workspace memory, last 200 messages)
- All users can send messages

### Terminal
- Shared bash subprocess per workspace (`child_process.spawn`)
- Created on-demand when first connected
- Editors and Admin can type commands; Viewers are read-only
- Terminal output streams to all users in room

## Socket Events

### Workspace Join
`createWorkspace` → `workspaceCreated`
`joinWorkspaceRequest` → `waitingForApproval` / `workspaceNotFound`
`workspaceJoinApproved` / `workspaceJoinRejected`
`approveJoinRequest { role: "editor"|"viewer" }` / `rejectJoinRequest`
`enterWorkspace` → `filesSnapshot`, `chatHistory`, `terminalHistory`

### File Events
`createFile { name }` → `fileCreated` (broadcast, admin only)
`selectFile { fileId }` → `fileContent` (to requester)
`codeChange { fileId, code }` → `codeUpdate { fileId, code, userId }` (broadcast)

### Save/Restore
`requestSave { fileId, code }` → admin: `fileSaved` (broadcast); editor: `saveRequest` (to admin)
`approveSave { requestId }` → `fileSaved` (broadcast) + `saveApproved` (to requester)
`rejectSave { requestId }` → `saveRejected` (to requester)
`requestRestore { fileId, versionId }` → admin: `fileRestored` (broadcast); editor: `restoreRequest` (to admin)
`approveRestore { requestId }` → `fileRestored` (broadcast) + `restoreApproved` (to requester)
`rejectRestore { requestId }` → `restoreRejected` (to requester)

### Cursor + Chat + Terminal
`cursorMove { fileId, userId, username, color, position }` → `cursorUpdate` (broadcast)
`chatMessage` → `chatMessage` (broadcast, persisted)
`terminalConnect` → `terminalHistory` / `terminalOutput`
`terminalInput { data }` → writes to bash stdin

### Session Management
`endSession` → `workspaceEnded` (admin only, broadcast, destroys workspace)
`exitSession` → `exitedSession` (user leaves without destroying workspace)
`kickUser { targetSocketId }` → `kicked` (admin only, removes target user)
`changeUserRole { targetSocketId, newRole }` → `roleChanged` (admin only, updates role)

### Disconnect
`disconnect` → removes user from workspace, broadcasts updated user list

## AI Integration
- Backend: `POST /api/ai/chat` — calls OpenAI `gpt-5-mini` via Replit AI Integrations proxy
- Frontend: `AIChatPanel.tsx` — AI tab in bottom panel with code context awareness
- Env vars: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`

## Files

### Backend (`artifacts/api-server/src/`)
- `socketHandler.ts` — All Socket.IO events and workspace data management
- `routes/ai.ts` — POST /api/ai/chat OpenAI endpoint
- `versionControl.ts` — Legacy (no longer used by main handler)

### Frontend (`artifacts/code-editor/src/`)
- `context/WorkspaceContext.tsx` — All real-time state + actions (incl. session management)
- `pages/WorkspacePage.tsx` — VS Code layout (left sidebar + editor + right panel + bottom)
- `pages/HomePage.tsx` — Create/join workspace landing
- `components/FileExplorer.tsx` — File browser with language emoji icons
- `components/ActiveUsers.tsx` — Members list with role badges + admin role/kick controls
- `components/Header.tsx` — Controls including End Session (admin) / Exit Session (user)
- `components/AdminApprovalPopup.tsx` — Floating cards for save + restore requests
- `components/VersionPanel.tsx` — Per-file version history, restore buttons
- `components/ChatPanel.tsx` — Global team chat
- `components/AIChatPanel.tsx` — AI code assistant (GPT) with code context
- `components/XTerminal.tsx` — xterm.js terminal (bash shell per workspace)
- `components/JoinRequestPopup.tsx` — Owner approves/rejects workspace join requests
- `components/MonacoWrapper.tsx` — Monaco editor with remote cursor rendering

## Workflows
- `artifacts/api-server: API Server` — Express + Socket.IO on PORT env var (8080)
- `artifacts/code-editor: web` — Vite dev server
