import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { randomBytes, randomUUID } from "crypto";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as fs from "fs";

// ─── Color palette ─────────────────────────────────────────────────────────
const COLORS = [
  "#00ff9c","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7",
  "#DDA0DD","#98FB98","#F0E68C","#87CEEB","#FFA07A",
  "#FFB347","#B39DDB",
];
let colorIndex = 0;
const getNextColor = () => COLORS[colorIndex++ % COLORS.length];

// ─── Language detection ─────────────────────────────────────────────────────
function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    py: "python", js: "javascript", ts: "typescript",
    cpp: "cpp", cc: "cpp", cxx: "cpp", c: "c",
    java: "java", rb: "ruby", go: "go", rs: "rust",
    sh: "shell", bash: "shell", html: "html", css: "css",
    json: "json", md: "markdown",
  };
  return map[ext] ?? "plaintext";
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface WorkspaceUser {
  socketId: string;
  username: string;
  color: string;
  role: "editor" | "viewer";
  isOwner: boolean;
}

interface PendingJoinRequest {
  socketId: string;
  username: string;
}

interface ChatMsg {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  color?: string;
}

interface FileVersion {
  id: string;
  savedBy: string;
  code: string;
  timestamp: string;
}

interface SaveRequest {
  id: string;
  fileId: string;
  filename: string;
  requesterSocketId: string;
  username: string;
  code: string;
  timestamp: string;
}

interface RestoreRequest {
  id: string;
  fileId: string;
  filename: string;
  versionId: string;
  requesterSocketId: string;
  username: string;
  timestamp: string;
}

interface WorkspaceFile {
  id: string;
  name: string;
  language: string;
  code: string;
  versionHistory: FileVersion[];
  pendingSaveRequests: SaveRequest[];
  pendingRestoreRequests: RestoreRequest[];
}

interface WorkspaceShell {
  process: ChildProcessWithoutNullStreams;
  outputBuffer: string[];
}

interface Workspace {
  workspaceCode: string;
  workspaceName: string;
  ownerSocketId: string;
  users: Map<string, WorkspaceUser>;
  pendingRequests: PendingJoinRequest[];
  files: Map<string, WorkspaceFile>;
  messages: ChatMsg[];
  shell: WorkspaceShell | null;
}

// ─── In-memory store ─────────────────────────────────────────────────────────
const workspaces: Map<string, Workspace> = new Map();

function generateWorkspaceCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "WS-";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) code += chars[bytes[i] % chars.length];
  if (workspaces.has(code)) return generateWorkspaceCode();
  return code;
}

function getWorkspaceUserList(workspaceCode: string): WorkspaceUser[] {
  const ws = workspaces.get(workspaceCode);
  return ws ? Array.from(ws.users.values()) : [];
}

function getFilesSnapshot(ws: Workspace) {
  return Array.from(ws.files.values()).map((f) => ({
    id: f.id, name: f.name, language: f.language,
    linesCount: f.code.split("\n").length,
  }));
}

// ─── Terminal helpers ─────────────────────────────────────────────────────────
function createShell(io: SocketIOServer, ws: Workspace): WorkspaceShell {
  const cwd = `/tmp/unite-ws-${ws.workspaceCode}`;
  try { fs.mkdirSync(cwd, { recursive: true }); } catch {}
  const proc = spawn("bash", [], {
    cwd,
    env: {
      ...process.env,
      TERM: "xterm-256color",
      HOME: cwd,
      COLORTERM: "truecolor",
      HISTFILE: `${cwd}/.bash_history`,
      PATH: process.env.PATH || "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const shell: WorkspaceShell = { process: proc, outputBuffer: [] };
  const onData = (data: Buffer) => {
    const text = data.toString("utf8");
    shell.outputBuffer.push(text);
    if (shell.outputBuffer.length > 1000) shell.outputBuffer.shift();
    io.to(ws.workspaceCode).emit("terminalOutput", { data: text });
  };
  proc.stdout.on("data", onData);
  proc.stderr.on("data", onData);
  proc.on("exit", (code) => {
    ws.shell = null;
    io.to(ws.workspaceCode).emit("terminalOutput", { data: `\r\n\x1b[33m[Shell exited (${code ?? "?"}). Type any key to restart.]\x1b[0m\r\n` });
  });
  // Set up a clean prompt and clear screen
  proc.stdin.write(
    `export PS1='\\[\\033[01;32m\\]\\u\\[\\033[00m\\]:\\[\\033[01;34m\\]\\w\\[\\033[00m\\]\\$ '; clear\n`
  );
  return shell;
}

function ensureShell(io: SocketIOServer, ws: Workspace): WorkspaceShell {
  if (ws.shell && !ws.shell.process.killed) return ws.shell;
  ws.shell = createShell(io, ws);
  return ws.shell;
}

// ─── Main setup ─────────────────────────────────────────────────────────────
export function setupSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket: Socket) => {
    let currentWorkspaceCode: string | null = null;

    // ── Create Workspace ──────────────────────────────────────────────────
    socket.on("createWorkspace", ({ username, workspaceName }: { username: string; workspaceName: string }) => {
      const code = generateWorkspaceCode();
      const color = getNextColor();
      const ownerUser: WorkspaceUser = {
        socketId: socket.id,
        username: username || `User_${socket.id.slice(0, 4)}`,
        color, role: "editor", isOwner: true,
      };
      const ws: Workspace = {
        workspaceCode: code,
        workspaceName: workspaceName || "My Workspace",
        ownerSocketId: socket.id,
        users: new Map([[socket.id, ownerUser]]),
        pendingRequests: [],
        files: new Map(),
        messages: [],
        shell: null,
      };
      workspaces.set(code, ws);
      currentWorkspaceCode = code;
      socket.join(code);
      socket.emit("workspaceCreated", {
        workspaceCode: code,
        workspaceName: ws.workspaceName,
        user: ownerUser,
        files: [],
      });
      io.to(code).emit("workspaceUserList", getWorkspaceUserList(code));
    });

    // ── Request to Join ───────────────────────────────────────────────────
    socket.on("joinWorkspaceRequest", ({ username, workspaceCode }: { username: string; workspaceCode: string }) => {
      const ws = workspaces.get(workspaceCode.trim().toUpperCase());
      if (!ws) { socket.emit("workspaceNotFound", { workspaceCode }); return; }
      if (ws.users.has(socket.id)) {
        const user = ws.users.get(socket.id)!;
        socket.join(workspaceCode);
        currentWorkspaceCode = workspaceCode;
        socket.emit("workspaceJoinApproved", {
          workspaceCode: ws.workspaceCode, workspaceName: ws.workspaceName,
          role: user.role, user,
        });
        _sendWorkspaceState(socket, ws);
        io.to(workspaceCode).emit("workspaceUserList", getWorkspaceUserList(workspaceCode));
        return;
      }
      ws.pendingRequests.push({ socketId: socket.id, username: username || `User_${socket.id.slice(0, 4)}` });
      io.to(ws.ownerSocketId).emit("workspaceJoinRequest", { socketId: socket.id, username, workspaceCode });
      socket.emit("waitingForApproval", { workspaceCode, workspaceName: ws.workspaceName });
    });

    // ── Owner Approves Join ───────────────────────────────────────────────
    socket.on("approveJoinRequest", ({ requestSocketId, role, workspaceCode }: {
      requestSocketId: string; role: "editor" | "viewer"; workspaceCode: string;
    }) => {
      const ws = workspaces.get(workspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      const idx = ws.pendingRequests.findIndex((r) => r.socketId === requestSocketId);
      if (idx === -1) return;
      const [pending] = ws.pendingRequests.splice(idx, 1);
      const color = getNextColor();
      const newUser: WorkspaceUser = {
        socketId: requestSocketId, username: pending.username, color, role, isOwner: false,
      };
      ws.users.set(requestSocketId, newUser);
      const requesterSocket = io.sockets.sockets.get(requestSocketId);
      if (requesterSocket) {
        requesterSocket.join(workspaceCode);
        requesterSocket.emit("workspaceJoinApproved", {
          workspaceCode: ws.workspaceCode, workspaceName: ws.workspaceName, role, user: newUser,
        });
        _sendWorkspaceState(requesterSocket, ws);
      }
      io.to(workspaceCode).emit("workspaceUserList", getWorkspaceUserList(workspaceCode));
      io.to(workspaceCode).emit("workspaceUserJoined", { username: pending.username, role });
    });

    // ── Owner Rejects Join ────────────────────────────────────────────────
    socket.on("rejectJoinRequest", ({ requestSocketId, workspaceCode }: { requestSocketId: string; workspaceCode: string }) => {
      const ws = workspaces.get(workspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      ws.pendingRequests = ws.pendingRequests.filter((r) => r.socketId !== requestSocketId);
      io.to(requestSocketId).emit("workspaceJoinRejected", { workspaceCode });
    });

    // ── Enter workspace ───────────────────────────────────────────────────
    socket.on("enterWorkspace", ({ workspaceCode }: { workspaceCode: string }) => {
      currentWorkspaceCode = workspaceCode;
      socket.join(workspaceCode);
      const ws = workspaces.get(workspaceCode);
      if (!ws) return;
      _sendWorkspaceState(socket, ws);
    });

    // ── Helper: send full workspace state to a newly joined socket ────────
    function _sendWorkspaceState(sock: Socket, ws: Workspace) {
      sock.emit("filesSnapshot", getFilesSnapshot(ws));
      sock.emit("chatHistory", ws.messages.slice(-100));
      if (ws.shell) sock.emit("terminalHistory", ws.shell.outputBuffer.join(""));
    }

    // ─────────────────────────────────────────────────────────────────────
    // FILE EVENTS
    // ─────────────────────────────────────────────────────────────────────

    /** Admin creates a file */
    socket.on("createFile", ({ name }: { name: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      // Check duplicate names
      const exists = Array.from(ws.files.values()).some((f) => f.name === trimmed);
      if (exists) { socket.emit("fileError", { message: `File "${trimmed}" already exists.` }); return; }
      const id = randomUUID();
      const language = detectLanguage(trimmed);
      const defaultCode: Record<string, string> = {
        python: `# ${trimmed}\n\ndef main():\n    print("Hello, World!")\n\nif __name__ == "__main__":\n    main()\n`,
        javascript: `// ${trimmed}\n\nfunction main() {\n    console.log("Hello, World!");\n}\n\nmain();\n`,
        typescript: `// ${trimmed}\n\nfunction main(): void {\n    console.log("Hello, World!");\n}\n\nmain();\n`,
        cpp: `// ${trimmed}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n`,
        c: `// ${trimmed}\n#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n`,
        java: `// ${trimmed}\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
      };
      const file: WorkspaceFile = {
        id, name: trimmed, language,
        code: defaultCode[language] ?? `// ${trimmed}\n`,
        versionHistory: [], pendingSaveRequests: [], pendingRestoreRequests: [],
      };
      ws.files.set(id, file);
      io.to(currentWorkspaceCode).emit("fileCreated", {
        id: file.id, name: file.name, language: file.language,
        linesCount: file.code.split("\n").length,
      });
    });

    /** User selects a file to open */
    socket.on("selectFile", ({ fileId }: { fileId: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws) return;
      const file = ws.files.get(fileId);
      if (!file) return;
      socket.emit("fileContent", {
        id: file.id, name: file.name, language: file.language,
        code: file.code, versionHistory: file.versionHistory,
      });
    });

    /** User changes code in a file */
    socket.on("codeChange", ({ fileId, code }: { fileId: string; code: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws) return;
      const user = ws.users.get(socket.id);
      if (!user || user.role === "viewer") return;
      const file = ws.files.get(fileId);
      if (!file) return;
      // Update live code (pending until saved)
      file.code = code;
      socket.to(currentWorkspaceCode).emit("codeUpdate", { fileId, code, userId: socket.id });
    });

    /** User requests to save a file */
    socket.on("requestSave", ({ fileId, code }: { fileId: string; code: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws) return;
      const user = ws.users.get(socket.id);
      const file = ws.files.get(fileId);
      if (!user || !file) return;
      if (user.role === "viewer") return;

      // Admin saves directly
      if (user.isOwner) {
        file.code = code;
        const version: FileVersion = {
          id: randomUUID(), savedBy: user.username,
          code, timestamp: new Date().toISOString(),
        };
        file.versionHistory.unshift(version);
        if (file.versionHistory.length > 50) file.versionHistory.pop();
        io.to(currentWorkspaceCode).emit("fileSaved", {
          fileId, code, version,
          savedBy: user.username,
        });
        return;
      }

      // Editor sends save request to admin
      const existing = file.pendingSaveRequests.find((r) => r.requesterSocketId === socket.id);
      if (existing) { socket.emit("saveRequestPending"); return; }
      const req: SaveRequest = {
        id: randomUUID(), fileId, filename: file.name,
        requesterSocketId: socket.id, username: user.username,
        code, timestamp: new Date().toISOString(),
      };
      file.pendingSaveRequests.push(req);
      io.to(ws.ownerSocketId).emit("saveRequest", req);
      socket.emit("saveRequestSent");
    });

    /** Admin approves save request */
    socket.on("approveSave", ({ requestId }: { requestId: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      // Find the request across all files
      let found: { file: WorkspaceFile; req: SaveRequest } | null = null;
      for (const file of ws.files.values()) {
        const idx = file.pendingSaveRequests.findIndex((r) => r.id === requestId);
        if (idx !== -1) {
          const [req] = file.pendingSaveRequests.splice(idx, 1);
          found = { file, req };
          break;
        }
      }
      if (!found) return;
      const { file, req } = found;
      file.code = req.code;
      const version: FileVersion = {
        id: randomUUID(), savedBy: req.username,
        code: req.code, timestamp: new Date().toISOString(),
      };
      file.versionHistory.unshift(version);
      if (file.versionHistory.length > 50) file.versionHistory.pop();
      io.to(currentWorkspaceCode).emit("fileSaved", {
        fileId: file.id, code: req.code, version,
        savedBy: req.username,
      });
      io.to(req.requesterSocketId).emit("saveApproved", { requestId, fileId: file.id });
    });

    /** Admin rejects save request */
    socket.on("rejectSave", ({ requestId }: { requestId: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      for (const file of ws.files.values()) {
        const idx = file.pendingSaveRequests.findIndex((r) => r.id === requestId);
        if (idx !== -1) {
          const [req] = file.pendingSaveRequests.splice(idx, 1);
          io.to(req.requesterSocketId).emit("saveRejected", { requestId, fileId: file.id });
          return;
        }
      }
    });

    /** User requests to restore a version */
    socket.on("requestRestore", ({ fileId, versionId }: { fileId: string; versionId: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws) return;
      const user = ws.users.get(socket.id);
      const file = ws.files.get(fileId);
      if (!user || !file) return;
      if (user.role === "viewer") return;

      const version = file.versionHistory.find((v) => v.id === versionId);
      if (!version) return;

      // Admin restores directly
      if (user.isOwner) {
        file.code = version.code;
        const newVersion: FileVersion = {
          id: randomUUID(), savedBy: user.username,
          code: version.code, timestamp: new Date().toISOString(),
        };
        file.versionHistory.unshift(newVersion);
        if (file.versionHistory.length > 50) file.versionHistory.pop();
        io.to(currentWorkspaceCode).emit("fileRestored", {
          fileId, code: version.code, newVersion,
          restoredBy: user.username,
        });
        return;
      }

      // Editor sends restore request
      const existing = file.pendingRestoreRequests.find((r) => r.requesterSocketId === socket.id);
      if (existing) { socket.emit("restoreRequestPending"); return; }
      const req: RestoreRequest = {
        id: randomUUID(), fileId, filename: file.name,
        versionId, requesterSocketId: socket.id,
        username: user.username, timestamp: new Date().toISOString(),
      };
      file.pendingRestoreRequests.push(req);
      io.to(ws.ownerSocketId).emit("restoreRequest", req);
      socket.emit("restoreRequestSent");
    });

    /** Admin approves restore request */
    socket.on("approveRestore", ({ requestId }: { requestId: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      let found: { file: WorkspaceFile; req: RestoreRequest } | null = null;
      for (const file of ws.files.values()) {
        const idx = file.pendingRestoreRequests.findIndex((r) => r.id === requestId);
        if (idx !== -1) {
          const [req] = file.pendingRestoreRequests.splice(idx, 1);
          found = { file, req };
          break;
        }
      }
      if (!found) return;
      const { file, req } = found;
      const version = file.versionHistory.find((v) => v.id === req.versionId);
      if (!version) return;
      file.code = version.code;
      const newVersion: FileVersion = {
        id: randomUUID(), savedBy: req.username,
        code: version.code, timestamp: new Date().toISOString(),
      };
      file.versionHistory.unshift(newVersion);
      if (file.versionHistory.length > 50) file.versionHistory.pop();
      io.to(currentWorkspaceCode).emit("fileRestored", {
        fileId: file.id, code: version.code, newVersion,
        restoredBy: req.username,
      });
      io.to(req.requesterSocketId).emit("restoreApproved", { requestId, fileId: file.id });
    });

    /** Admin rejects restore request */
    socket.on("rejectRestore", ({ requestId }: { requestId: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      for (const file of ws.files.values()) {
        const idx = file.pendingRestoreRequests.findIndex((r) => r.id === requestId);
        if (idx !== -1) {
          const [req] = file.pendingRestoreRequests.splice(idx, 1);
          io.to(req.requesterSocketId).emit("restoreRejected", { requestId, fileId: file.id });
          return;
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // CURSOR EVENTS
    // ─────────────────────────────────────────────────────────────────────
    socket.on("cursorMove", ({ fileId, userId, username, color, position }: {
      fileId: string; userId: string; username: string; color: string;
      position: { lineNumber: number; column: number };
    }) => {
      if (!currentWorkspaceCode) return;
      socket.to(currentWorkspaceCode).emit("cursorUpdate", { fileId, userId, username, color, position });
    });

    // ─────────────────────────────────────────────────────────────────────
    // CHAT EVENTS
    // ─────────────────────────────────────────────────────────────────────
    socket.on("chatMessage", ({ userId, username, message, color, timestamp }: {
      userId: string; username: string; message: string; color: string; timestamp: string;
    }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      const safe = message.replace(/</g, "&lt;").replace(/>/g, "&gt;").slice(0, 1000);
      const msg: ChatMsg = {
        id: randomUUID(), userId, username, message: safe, timestamp, color,
      };
      if (ws) {
        ws.messages.push(msg);
        if (ws.messages.length > 200) ws.messages.shift();
      }
      io.to(currentWorkspaceCode).emit("chatMessage", msg);
    });

    // ─────────────────────────────────────────────────────────────────────
    // SESSION EVENTS
    // ─────────────────────────────────────────────────────────────────────

    /** Admin ends session for everyone */
    socket.on("endSession", () => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      // Notify all users the workspace is ending
      io.to(currentWorkspaceCode).emit("workspaceEnded", { endedBy: ws.users.get(socket.id)?.username ?? "Admin" });
      // Kill shell
      if (ws.shell) { try { ws.shell.process.kill(); } catch {} }
      // Remove workspace
      workspaces.delete(currentWorkspaceCode);
      currentWorkspaceCode = null;
    });

    /** User exits session without destroying workspace */
    socket.on("exitSession", () => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws) return;
      const user = ws.users.get(socket.id);
      ws.users.delete(socket.id);
      ws.pendingRequests = ws.pendingRequests.filter((r) => r.socketId !== socket.id);
      socket.leave(currentWorkspaceCode);
      if (ws.users.size === 0) {
        if (ws.shell) { try { ws.shell.process.kill(); } catch {} }
        workspaces.delete(currentWorkspaceCode);
      } else {
        io.to(currentWorkspaceCode).emit("workspaceUserList", getWorkspaceUserList(currentWorkspaceCode));
        if (user) io.to(currentWorkspaceCode).emit("workspaceUserLeft", { socketId: socket.id, username: user.username });
      }
      socket.emit("exitedSession");
      currentWorkspaceCode = null;
    });

    /** Admin kicks a user */
    socket.on("kickUser", ({ targetSocketId }: { targetSocketId: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      const target = ws.users.get(targetSocketId);
      if (!target || target.isOwner) return;
      ws.users.delete(targetSocketId);
      const targetSock = io.sockets.sockets.get(targetSocketId);
      if (targetSock) {
        targetSock.emit("kicked", { reason: "You were removed from the session by the admin." });
        targetSock.leave(currentWorkspaceCode);
      }
      io.to(currentWorkspaceCode).emit("workspaceUserList", getWorkspaceUserList(currentWorkspaceCode));
      io.to(currentWorkspaceCode).emit("workspaceUserLeft", { socketId: targetSocketId, username: target.username });
    });

    /** Admin changes a user's role */
    socket.on("changeUserRole", ({ targetSocketId, newRole }: { targetSocketId: string; newRole: "editor" | "viewer" }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws || ws.ownerSocketId !== socket.id) return;
      const target = ws.users.get(targetSocketId);
      if (!target || target.isOwner) return;
      target.role = newRole;
      io.to(currentWorkspaceCode).emit("workspaceUserList", getWorkspaceUserList(currentWorkspaceCode));
      io.to(targetSocketId).emit("roleChanged", { newRole });
    });

    // ─────────────────────────────────────────────────────────────────────
    // TERMINAL EVENTS
    // ─────────────────────────────────────────────────────────────────────
    socket.on("terminalConnect", () => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws) return;
      const shell = ensureShell(io, ws);
      if (shell.outputBuffer.length > 0) {
        socket.emit("terminalHistory", shell.outputBuffer.join(""));
      } else {
        socket.emit("terminalOutput", { data: `\r\nUnite Terminal — ${ws.workspaceName}\r\n\r\n` });
      }
    });

    socket.on("terminalInput", ({ data }: { data: string }) => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws) return;
      const user = ws.users.get(socket.id);
      if (!user || (user.role !== "editor" && !user.isOwner)) return;
      const shell = ensureShell(io, ws);
      if (shell.process.stdin.writable) shell.process.stdin.write(data);
    });

    // ─────────────────────────────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (!currentWorkspaceCode) return;
      const ws = workspaces.get(currentWorkspaceCode);
      if (!ws) return;
      ws.users.delete(socket.id);
      ws.pendingRequests = ws.pendingRequests.filter((r) => r.socketId !== socket.id);
      if (ws.users.size === 0) {
        if (ws.shell) { try { ws.shell.process.kill(); } catch {} }
        workspaces.delete(currentWorkspaceCode);
      } else {
        io.to(currentWorkspaceCode).emit("workspaceUserList", getWorkspaceUserList(currentWorkspaceCode));
        io.to(currentWorkspaceCode).emit("workspaceUserLeft", { socketId: socket.id });
      }
    });
  });

  return io;
}
