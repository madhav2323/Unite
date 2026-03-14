import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { MonacoWrapper } from "@/components/MonacoWrapper";
import { ActiveUsers } from "@/components/ActiveUsers";
import { ConsolePanel } from "@/components/ConsolePanel";
import { ChatPanel } from "@/components/ChatPanel";
import { VersionPanel } from "@/components/VersionPanel";
import { Header } from "@/components/Header";
import { JoinRequestPopup } from "@/components/JoinRequestPopup";
import { AdminApprovalPopup } from "@/components/AdminApprovalPopup";
import { FileExplorer } from "@/components/FileExplorer";
import { AIChatPanel } from "@/components/AIChatPanel";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useExecuteCode, ExecuteCodeRequestLanguage } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Terminal, Square, MessageSquare, FileCode, Bot } from "lucide-react";
import { XTerminal } from "@/components/XTerminal";

type BottomTab = "console" | "terminal" | "chat" | "ai";

export default function WorkspacePage() {
  const params = useParams<{ code: string }>();
  const workspaceCode = params.code;
  const [, navigate] = useLocation();

  const {
    socket, connected, userId, username, myColor, mySocketId,
    myRole, isOwner, workspace, activeUsers, messages,
    remoteCursors, joinStatus, pendingRequests,
    files, openFile, selectedFileId,
    pendingSaveRequests, pendingRestoreRequests,
    approveRequest, approveRequestAsViewer, rejectRequest,
    createFile, selectFile, emitCodeChange,
    requestSave, approveSave, rejectSave,
    requestRestore, approveRestore, rejectRestore,
    emitCursorMove, sendChatMessage,
    endSession, exitSession, kickUser, changeUserRole,
  } = useWorkspace();

  const { toast } = useToast();
  const [bottomTab, setBottomTab] = useState<BottomTab>("console");
  const socketUpdateRef = useRef<boolean>(false);

  // Save/restore feedback events
  useEffect(() => {
    if (!socket) return;
    const onSaveApproved = () => toast({ title: "Save Approved!", description: "Your changes have been saved." });
    const onSaveRejected = () => toast({ title: "Save Rejected", description: "Admin rejected your save request.", variant: "destructive" });
    const onRestoreApproved = () => toast({ title: "Restore Approved!", description: "File restored to the selected version." });
    const onRestoreRejected = () => toast({ title: "Restore Rejected", description: "Admin rejected your restore request.", variant: "destructive" });
    const onSaveRequestSent = () => toast({ title: "Request Sent", description: "Waiting for admin to approve your save." });
    const onRestoreRequestSent = () => toast({ title: "Request Sent", description: "Waiting for admin to approve the restore." });
    const onFileSaved = ({ savedBy }: { fileId: string; code: string; savedBy: string }) => {
      if (savedBy !== username) toast({ title: "File Saved", description: `${savedBy} saved the file.` });
    };
    const onFileRestored = ({ restoredBy }: { fileId: string; code: string; restoredBy: string }) => {
      if (restoredBy !== username) toast({ title: "File Restored", description: `${restoredBy} restored a version.` });
    };
    const onFileError = ({ message }: { message: string }) => {
      toast({ title: "Error", description: message, variant: "destructive" });
    };

    // Session events — navigate back to home
    const onWorkspaceEnded = ({ endedBy }: { endedBy: string }) => {
      toast({ title: "Session Ended", description: `${endedBy} ended the session.`, variant: "destructive" });
      setTimeout(() => navigate("/"), 1500);
    };
    const onKicked = ({ reason }: { reason: string }) => {
      toast({ title: "Removed from Session", description: reason, variant: "destructive" });
      setTimeout(() => navigate("/"), 1500);
    };
    const onExitedSession = () => {
      navigate("/");
    };
    const onRoleChanged = ({ newRole }: { newRole: string }) => {
      toast({
        title: "Role Changed",
        description: `Your role has been changed to ${newRole}.`,
      });
    };

    socket.on("saveApproved", onSaveApproved);
    socket.on("saveRejected", onSaveRejected);
    socket.on("restoreApproved", onRestoreApproved);
    socket.on("restoreRejected", onRestoreRejected);
    socket.on("saveRequestSent", onSaveRequestSent);
    socket.on("restoreRequestSent", onRestoreRequestSent);
    socket.on("fileSaved", onFileSaved);
    socket.on("fileRestored", onFileRestored);
    socket.on("fileError", onFileError);
    socket.on("workspaceEnded", onWorkspaceEnded);
    socket.on("kicked", onKicked);
    socket.on("exitedSession", onExitedSession);
    socket.on("roleChanged", onRoleChanged);

    return () => {
      socket.off("saveApproved", onSaveApproved);
      socket.off("saveRejected", onSaveRejected);
      socket.off("restoreApproved", onRestoreApproved);
      socket.off("restoreRejected", onRestoreRejected);
      socket.off("saveRequestSent", onSaveRequestSent);
      socket.off("restoreRequestSent", onRestoreRequestSent);
      socket.off("fileSaved", onFileSaved);
      socket.off("fileRestored", onFileRestored);
      socket.off("fileError", onFileError);
      socket.off("workspaceEnded", onWorkspaceEnded);
      socket.off("kicked", onKicked);
      socket.off("exitedSession", onExitedSession);
      socket.off("roleChanged", onRoleChanged);
    };
  }, [socket, username, toast, navigate]);

  // Redirect on join failure
  useEffect(() => {
    if (joinStatus === "rejected" || joinStatus === "not_found") navigate("/");
  }, [joinStatus, navigate]);

  const canEdit = myRole !== "viewer";
  const editorCode = openFile?.code ?? "";
  const editorLanguage = (openFile?.language ?? "python") as ExecuteCodeRequestLanguage;

  const handleCodeChange = useCallback((newCode: string) => {
    if (!canEdit || !openFile) return;
    emitCodeChange(openFile.id, newCode);
  }, [canEdit, openFile, emitCodeChange]);

  const handleCursorMove = useCallback((pos: { lineNumber: number; column: number }) => {
    if (openFile) emitCursorMove(openFile.id, pos);
  }, [openFile, emitCursorMove]);

  const handleSave = () => {
    if (!openFile || !canEdit) return;
    requestSave(openFile.id, openFile.code);
  };

  const handleRestore = (versionId: string) => {
    if (!openFile) return;
    requestRestore(openFile.id, versionId);
  };

  const handleEndSession = () => {
    endSession();
    navigate("/");
  };

  const handleExitSession = () => {
    exitSession();
  };

  // Filter cursors to only show for current file
  const relevantCursors = Object.fromEntries(
    Object.entries(remoteCursors).filter(([, c]) => c.fileId === openFile?.id)
  );

  // Code execution
  const { mutate: executeCode, data: execResult, isPending: isExecuting, error: execError } =
    useExecuteCode({ mutation: { onMutate: () => setBottomTab("console") } });

  const handleRunCode = () => {
    if (!openFile) return;
    executeCode({ data: { language: editorLanguage, code: editorCode } });
  };

  if (!workspace) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0d1117] text-[#8b949e]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-[#00ff9c] border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm">Connecting to workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#0d1117] overflow-hidden text-[#c9d1d9]">
      <Header
        connected={connected}
        username={username || "Guest"}
        myColor={myColor}
        language={editorLanguage}
        setLanguage={() => {}}
        onRun={handleRunCode}
        isRunning={isExecuting}
        onSave={handleSave}
        workspaceCode={workspace.workspaceCode}
        workspaceName={workspace.workspaceName}
        myRole={myRole}
        isOwner={isOwner}
        openFileName={openFile?.name ?? null}
        canEdit={canEdit}
        onEndSession={handleEndSession}
        onExitSession={handleExitSession}
      />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="unite-main-layout">

          {/* LEFT SIDEBAR: Members + File Explorer */}
          <Panel defaultSize={15} minSize={10} className="hidden md:flex flex-col border-r border-[#21262d] bg-[#161b22]">
            <PanelGroup direction="vertical">
              <Panel defaultSize={35} minSize={20}>
                <ActiveUsers
                  users={activeUsers}
                  currentUserId={mySocketId ?? userId}
                  isOwner={isOwner}
                  onKickUser={kickUser}
                  onChangeRole={changeUserRole}
                />
              </Panel>
              <PanelResizeHandle className="h-px bg-[#21262d] hover:bg-[#00ff9c]/30 transition-colors cursor-row-resize" />
              <Panel defaultSize={65} minSize={30}>
                <FileExplorer
                  files={files}
                  selectedFileId={selectedFileId}
                  isOwner={isOwner}
                  onSelectFile={selectFile}
                  onCreateFile={createFile}
                />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-px bg-[#21262d] hidden md:block hover:bg-[#00ff9c]/30 transition-colors cursor-col-resize" />

          {/* CENTER: Editor + Bottom Panel */}
          <Panel defaultSize={61} minSize={30}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={65} minSize={20}>
                {openFile ? (
                  <div className="h-full bg-[#0d1117] overflow-hidden">
                    <MonacoWrapper
                      code={editorCode}
                      language={editorLanguage}
                      onChange={handleCodeChange}
                      onCursorMove={handleCursorMove}
                      remoteCursors={relevantCursors}
                      socketUpdateRef={socketUpdateRef}
                      readOnly={!canEdit}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center bg-[#0d1117] select-none">
                    <div className="text-center">
                      <FileCode className="h-16 w-16 text-[#21262d] mx-auto mb-4" />
                      <p className="text-[#484f58] text-sm font-medium">No file open</p>
                      <p className="text-[#21262d] text-xs mt-1">
                        {isOwner
                          ? 'Create a file in the Explorer to start coding'
                          : 'Select a file from the Explorer to start editing'}
                      </p>
                    </div>
                  </div>
                )}
              </Panel>

              <PanelResizeHandle className="h-px bg-[#21262d] hover:bg-[#00ff9c]/30 transition-colors cursor-row-resize" />

              {/* Bottom Panel */}
              <Panel defaultSize={35} minSize={18}>
                <div className="flex flex-col h-full bg-[#0d1117]">
                  <div className="flex items-center border-b border-[#21262d] bg-[#161b22] shrink-0">
                    {(
                      [
                        { id: "console" as BottomTab, icon: <Square className="h-3 w-3" />, label: "Console" },
                        { id: "terminal" as BottomTab, icon: <Terminal className="h-3 w-3" />, label: "Terminal" },
                        { id: "chat" as BottomTab, icon: <MessageSquare className="h-3 w-3" />, label: "Chat" },
                        { id: "ai" as BottomTab, icon: <Bot className="h-3 w-3" />, label: "AI" },
                      ] satisfies { id: BottomTab; icon: React.ReactNode; label: string }[]
                    ).map((tab) => (
                      <button key={tab.id} onClick={() => setBottomTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider border-r border-[#21262d] transition-colors ${
                          bottomTab === tab.id
                            ? tab.id === "ai"
                              ? 'text-[#00ff9c] border-b-2 border-b-[#00ff9c] bg-[#00ff9c]/5'
                              : 'text-[#00ff9c] border-b-2 border-b-[#00ff9c] bg-[#00ff9c]/5'
                            : 'text-[#484f58] hover:text-[#8b949e]'
                        }`}>
                        {tab.icon}{tab.label}
                        {tab.id === "ai" && (
                          <span className="ml-1 text-[9px] bg-[#00ff9c]/20 text-[#00ff9c] px-1 py-0.5 rounded font-normal">
                            GPT
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className={`h-full ${bottomTab === "console" ? "block" : "hidden"}`}>
                      <ConsolePanel result={execResult || null} isRunning={isExecuting} error={execError as Error | null} />
                    </div>
                    <div className={`h-full ${bottomTab === "terminal" ? "block" : "hidden"}`}>
                      <XTerminal socket={socket} workspaceCode={workspace.workspaceCode} readOnly={myRole === "viewer"} />
                    </div>
                    <div className={`h-full ${bottomTab === "chat" ? "block" : "hidden"}`}>
                      <ChatPanel
                        messages={messages}
                        onSendMessage={sendChatMessage}
                        currentUserId={userId}
                      />
                    </div>
                    <div className={`h-full ${bottomTab === "ai" ? "block" : "hidden"}`}>
                      <AIChatPanel
                        openFileCode={openFile?.code}
                        openFileLanguage={openFile?.language}
                        openFileName={openFile?.name ?? null}
                      />
                    </div>
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-px bg-[#21262d] hidden lg:block hover:bg-[#00ff9c]/30 transition-colors cursor-col-resize" />

          {/* RIGHT: Version History */}
          <Panel defaultSize={24} minSize={14} className="hidden lg:block border-l border-[#21262d] bg-[#161b22]">
            <VersionPanel
              versions={openFile?.versionHistory ?? []}
              fileName={openFile?.name ?? null}
              isOwner={isOwner}
              onRestore={handleRestore}
            />
          </Panel>
        </PanelGroup>
      </div>

      {/* Join request popup (owner only) */}
      {isOwner && (
        <JoinRequestPopup
          requests={pendingRequests}
          onApproveEditor={approveRequest}
          onApproveViewer={approveRequestAsViewer}
          onReject={rejectRequest}
        />
      )}

      {/* Save/Restore approval popup (owner only) */}
      {isOwner && (
        <AdminApprovalPopup
          saveRequests={pendingSaveRequests}
          restoreRequests={pendingRestoreRequests}
          onApproveSave={approveSave}
          onRejectSave={rejectSave}
          onApproveRestore={approveRestore}
          onRejectRestore={rejectRestore}
        />
      )}
    </div>
  );
}
