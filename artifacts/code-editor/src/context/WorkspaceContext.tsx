import React, {
  createContext, useContext, useEffect, useRef,
  useState, useCallback, ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// ─── Types ───────────────────────────────────────────────────────────────────
export type Role = "editor" | "viewer";

export interface WorkspaceUser {
  socketId: string;
  username: string;
  color: string;
  role: Role;
  isOwner: boolean;
}

export interface PendingJoinRequest {
  socketId: string;
  username: string;
  workspaceCode: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  color?: string;
}

export interface CursorPosition { lineNumber: number; column: number; }
export interface RemoteCursor {
  userId: string; username: string; color: string;
  position: CursorPosition; fileId?: string;
}

export interface WorkspaceInfo { workspaceCode: string; workspaceName: string; }

export interface FileVersion {
  id: string;
  savedBy: string;
  code: string;
  timestamp: string;
}

export interface WorkspaceFileMeta {
  id: string;
  name: string;
  language: string;
  linesCount: number;
}

export interface WorkspaceFileContent {
  id: string;
  name: string;
  language: string;
  code: string;
  versionHistory: FileVersion[];
}

export interface SaveRequest {
  id: string;
  fileId: string;
  filename: string;
  requesterSocketId: string;
  username: string;
  code: string;
  timestamp: string;
}

export interface RestoreRequest {
  id: string;
  fileId: string;
  filename: string;
  versionId: string;
  requesterSocketId: string;
  username: string;
  timestamp: string;
}

// ─── Context interface ────────────────────────────────────────────────────────
interface WorkspaceContextValue {
  socket: Socket | null;
  connected: boolean;
  userId: string;
  username: string | null;
  myColor: string;
  mySocketId: string | null;
  myRole: Role;
  isOwner: boolean;
  workspace: WorkspaceInfo | null;
  activeUsers: WorkspaceUser[];
  messages: ChatMessage[];
  remoteCursors: Record<string, RemoteCursor>;
  joinStatus: "idle" | "waiting" | "approved" | "rejected" | "not_found";
  pendingRequests: PendingJoinRequest[];

  files: WorkspaceFileMeta[];
  openFile: WorkspaceFileContent | null;
  selectedFileId: string | null;

  pendingSaveRequests: SaveRequest[];
  pendingRestoreRequests: RestoreRequest[];

  // Actions
  setUsername: (u: string) => void;
  createWorkspace: (username: string, workspaceName: string) => void;
  requestJoinWorkspace: (username: string, workspaceCode: string) => void;
  approveRequest: (socketId: string) => void;
  approveRequestAsViewer: (socketId: string) => void;
  rejectRequest: (socketId: string) => void;

  createFile: (name: string) => void;
  selectFile: (fileId: string) => void;
  emitCodeChange: (fileId: string, code: string) => void;
  requestSave: (fileId: string, code: string) => void;
  approveSave: (requestId: string) => void;
  rejectSave: (requestId: string) => void;
  requestRestore: (fileId: string, versionId: string) => void;
  approveRestore: (requestId: string) => void;
  rejectRestore: (requestId: string) => void;

  emitCursorMove: (fileId: string, position: CursorPosition) => void;
  sendChatMessage: (message: string) => void;

  endSession: () => void;
  exitSession: () => void;
  kickUser: (targetSocketId: string) => void;
  changeUserRole: (targetSocketId: string, newRole: Role) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId] = useState(() => uuidv4());
  const [username, setUsername] = useState<string | null>(null);
  const [myColor, setMyColor] = useState("#00ff9c");
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role>("editor");
  const [isOwner, setIsOwner] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [activeUsers, setActiveUsers] = useState<WorkspaceUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [joinStatus, setJoinStatus] = useState<WorkspaceContextValue["joinStatus"]>("idle");
  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>([]);

  const [files, setFiles] = useState<WorkspaceFileMeta[]>([]);
  const [openFile, setOpenFile] = useState<WorkspaceFileContent | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const [pendingSaveRequests, setPendingSaveRequests] = useState<SaveRequest[]>([]);
  const [pendingRestoreRequests, setPendingRestoreRequests] = useState<RestoreRequest[]>([]);

  const workspaceRef = useRef<WorkspaceInfo | null>(null);
  const mySocketIdRef = useRef<string | null>(null);
  const myColorRef = useRef<string>("#00ff9c");
  const usernameRef = useRef<string | null>(null);
  const isOwnerRef = useRef(false);

  function resetWorkspaceState() {
    setWorkspace(null);
    workspaceRef.current = null;
    setFiles([]);
    setOpenFile(null);
    setSelectedFileId(null);
    setActiveUsers([]);
    setMessages([]);
    setRemoteCursors({});
    setPendingSaveRequests([]);
    setPendingRestoreRequests([]);
    setJoinStatus("idle");
  }

  function getSocket(): Socket {
    if (!socketRef.current) {
      const backendUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
      const sock = io(backendUrl, {
        path: "/api/socket.io",
        transports: ["websocket", "polling"],
      });
      socketRef.current = sock;

      sock.on("connect", () => {
        setConnected(true);
        setMySocketId(sock.id ?? null);
        mySocketIdRef.current = sock.id ?? null;
      });
      sock.on("disconnect", () => { setConnected(false); setActiveUsers([]); });

      sock.on("workspaceCreated", ({ workspaceCode, workspaceName, user }: {
        workspaceCode: string; workspaceName: string; user: WorkspaceUser;
      }) => {
        setWorkspace({ workspaceCode, workspaceName });
        workspaceRef.current = { workspaceCode, workspaceName };
        setMyColor(user.color); myColorRef.current = user.color;
        setMyRole("editor"); setIsOwner(true); isOwnerRef.current = true;
        setJoinStatus("approved");
        setFiles([]);
      });

      sock.on("workspaceUserList", (users: WorkspaceUser[]) => {
        setActiveUsers(users);
        const me = users.find((u) => u.socketId === mySocketIdRef.current);
        if (me) {
          setMyColor(me.color); myColorRef.current = me.color;
          setMyRole(me.role); setIsOwner(me.isOwner); isOwnerRef.current = me.isOwner;
        }
      });

      sock.on("workspaceJoinRequest", (req: PendingJoinRequest) => {
        setPendingRequests((prev) => [...prev, req]);
      });

      sock.on("workspaceJoinApproved", ({ workspaceCode, workspaceName, role, user }: {
        workspaceCode: string; workspaceName: string; role: Role; user: WorkspaceUser;
      }) => {
        setWorkspace({ workspaceCode, workspaceName });
        workspaceRef.current = { workspaceCode, workspaceName };
        setMyColor(user.color); myColorRef.current = user.color;
        setMyRole(role); setIsOwner(false); isOwnerRef.current = false;
        setJoinStatus("approved");
        sock.emit("enterWorkspace", { workspaceCode });
      });

      sock.on("workspaceJoinRejected", () => setJoinStatus("rejected"));
      sock.on("waitingForApproval", () => setJoinStatus("waiting"));
      sock.on("workspaceNotFound", () => setJoinStatus("not_found"));

      sock.on("workspaceUserLeft", ({ socketId }: { socketId: string }) => {
        setRemoteCursors((prev) => { const n = { ...prev }; delete n[socketId]; return n; });
      });

      // File events
      sock.on("filesSnapshot", (fileList: WorkspaceFileMeta[]) => setFiles(fileList));

      sock.on("fileCreated", (meta: WorkspaceFileMeta) => {
        setFiles((prev) => [...prev, meta]);
      });

      sock.on("fileContent", (content: WorkspaceFileContent) => {
        setOpenFile(content);
        setSelectedFileId(content.id);
      });

      sock.on("codeUpdate", ({ fileId, code }: { fileId: string; code: string }) => {
        setOpenFile((prev) => prev && prev.id === fileId ? { ...prev, code } : prev);
      });

      sock.on("fileSaved", ({ fileId, code, version }: {
        fileId: string; code: string; version: FileVersion; savedBy: string;
      }) => {
        setOpenFile((prev) => {
          if (!prev || prev.id !== fileId) return prev;
          return { ...prev, code, versionHistory: [version, ...prev.versionHistory].slice(0, 50) };
        });
      });

      sock.on("fileRestored", ({ fileId, code, newVersion }: {
        fileId: string; code: string; newVersion: FileVersion;
      }) => {
        setOpenFile((prev) => {
          if (!prev || prev.id !== fileId) return prev;
          return { ...prev, code, versionHistory: [newVersion, ...prev.versionHistory].slice(0, 50) };
        });
      });

      sock.on("saveRequest", (req: SaveRequest) => {
        setPendingSaveRequests((prev) => [...prev, req]);
      });
      sock.on("restoreRequest", (req: RestoreRequest) => {
        setPendingRestoreRequests((prev) => [...prev, req]);
      });

      sock.on("chatMessage", (msg: ChatMessage) => {
        setMessages((prev) => [...prev, msg]);
      });
      sock.on("chatHistory", (msgs: ChatMessage[]) => setMessages(msgs));

      sock.on("cursorUpdate", (cursor: RemoteCursor) => {
        setRemoteCursors((prev) => ({ ...prev, [cursor.userId]: cursor }));
      });

      // Session events — state reset only. Navigation is handled by WorkspacePage via socket listeners.
      sock.on("workspaceEnded", () => resetWorkspaceState());
      sock.on("kicked", () => resetWorkspaceState());
      sock.on("exitedSession", () => resetWorkspaceState());
      sock.on("roleChanged", ({ newRole }: { newRole: Role }) => setMyRole(newRole));
    }
    return socketRef.current!;
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  const createWorkspace = useCallback((uname: string, wsName: string) => {
    const sock = getSocket();
    setUsername(uname); usernameRef.current = uname;
    const emit = () => sock.emit("createWorkspace", { username: uname, workspaceName: wsName });
    if (!sock.connected) { sock.connect(); sock.once("connect", emit); } else emit();
  }, []);

  const requestJoinWorkspace = useCallback((uname: string, workspaceCode: string) => {
    const sock = getSocket();
    setUsername(uname); usernameRef.current = uname;
    setJoinStatus("idle");
    const code = workspaceCode.trim().toUpperCase();
    const emit = () => sock.emit("joinWorkspaceRequest", { username: uname, workspaceCode: code });
    if (!sock.connected) { sock.connect(); sock.once("connect", emit); } else emit();
  }, []);

  const approveRequest = useCallback((requestSocketId: string) => {
    const sock = socketRef.current;
    if (!sock || !workspaceRef.current) return;
    sock.emit("approveJoinRequest", { requestSocketId, role: "editor", workspaceCode: workspaceRef.current.workspaceCode });
    setPendingRequests((prev) => prev.filter((r) => r.socketId !== requestSocketId));
  }, []);

  const approveRequestAsViewer = useCallback((requestSocketId: string) => {
    const sock = socketRef.current;
    if (!sock || !workspaceRef.current) return;
    sock.emit("approveJoinRequest", { requestSocketId, role: "viewer", workspaceCode: workspaceRef.current.workspaceCode });
    setPendingRequests((prev) => prev.filter((r) => r.socketId !== requestSocketId));
  }, []);

  const rejectRequest = useCallback((requestSocketId: string) => {
    const sock = socketRef.current;
    if (!sock || !workspaceRef.current) return;
    sock.emit("rejectJoinRequest", { requestSocketId, workspaceCode: workspaceRef.current.workspaceCode });
    setPendingRequests((prev) => prev.filter((r) => r.socketId !== requestSocketId));
  }, []);

  const createFile = useCallback((name: string) => {
    socketRef.current?.emit("createFile", { name });
  }, []);

  const selectFile = useCallback((fileId: string) => {
    socketRef.current?.emit("selectFile", { fileId });
  }, []);

  const emitCodeChange = useCallback((fileId: string, code: string) => {
    const sock = socketRef.current;
    if (!sock || !connected) return;
    setOpenFile(prev => prev && prev.id === fileId ? { ...prev, code } : prev);
    sock.emit("codeChange", { fileId, code });
  }, [connected]);

  const requestSave = useCallback((fileId: string, code: string) => {
    socketRef.current?.emit("requestSave", { fileId, code });
  }, []);

  const approveSave = useCallback((requestId: string) => {
    socketRef.current?.emit("approveSave", { requestId });
    setPendingSaveRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const rejectSave = useCallback((requestId: string) => {
    socketRef.current?.emit("rejectSave", { requestId });
    setPendingSaveRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const requestRestore = useCallback((fileId: string, versionId: string) => {
    socketRef.current?.emit("requestRestore", { fileId, versionId });
  }, []);

  const approveRestore = useCallback((requestId: string) => {
    socketRef.current?.emit("approveRestore", { requestId });
    setPendingRestoreRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const rejectRestore = useCallback((requestId: string) => {
    socketRef.current?.emit("rejectRestore", { requestId });
    setPendingRestoreRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const emitCursorMove = useCallback((fileId: string, position: CursorPosition) => {
    const sock = socketRef.current;
    if (!sock || !connected) return;
    sock.emit("cursorMove", { fileId, userId, username: usernameRef.current, color: myColorRef.current, position });
  }, [connected, userId]);

  const sendChatMessage = useCallback((message: string) => {
    const sock = socketRef.current;
    if (!sock || !connected) return;
    sock.emit("chatMessage", {
      id: uuidv4(), userId, username: usernameRef.current,
      message, timestamp: new Date().toISOString(), color: myColorRef.current,
    });
  }, [connected, userId]);

  const endSession = useCallback(() => {
    socketRef.current?.emit("endSession");
  }, []);

  const exitSession = useCallback(() => {
    socketRef.current?.emit("exitSession");
  }, []);

  const kickUser = useCallback((targetSocketId: string) => {
    socketRef.current?.emit("kickUser", { targetSocketId });
  }, []);

  const changeUserRole = useCallback((targetSocketId: string, newRole: Role) => {
    socketRef.current?.emit("changeUserRole", { targetSocketId, newRole });
  }, []);

  // Sync refs
  useEffect(() => { usernameRef.current = username; }, [username]);
  useEffect(() => { myColorRef.current = myColor; }, [myColor]);
  useEffect(() => { isOwnerRef.current = isOwner; }, [isOwner]);

  const value: WorkspaceContextValue = {
    socket: socketRef.current,
    connected, userId, username, myColor, mySocketId, myRole, isOwner,
    workspace, activeUsers, messages, remoteCursors,
    joinStatus, pendingRequests,
    files, openFile, selectedFileId,
    pendingSaveRequests, pendingRestoreRequests,
    setUsername, createWorkspace, requestJoinWorkspace,
    approveRequest, approveRequestAsViewer, rejectRequest,
    createFile, selectFile, emitCodeChange,
    requestSave, approveSave, rejectSave,
    requestRestore, approveRestore, rejectRestore,
    emitCursorMove, sendChatMessage,
    endSession, exitSession, kickUser, changeUserRole,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
