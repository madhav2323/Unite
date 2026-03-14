import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, LogIn, Loader2, X, AlertCircle } from "lucide-react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { motion, AnimatePresence } from "framer-motion";

type Modal = "create" | "join" | null;
type JoinState = "form" | "waiting" | "rejected" | "not_found";

export default function HomePage() {
  const [, navigate] = useLocation();
  const { createWorkspace, requestJoinWorkspace, joinStatus, workspace } = useWorkspace();

  const [modal, setModal] = useState<Modal>(null);
  const [createUsername, setCreateUsername] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [joinState, setJoinState] = useState<JoinState>("form");

  useEffect(() => {
    if (joinStatus === "approved" && workspace) navigate(`/workspace/${workspace.workspaceCode}`);
    if (joinStatus === "waiting") setJoinState("waiting");
    if (joinStatus === "rejected") setJoinState("rejected");
    if (joinStatus === "not_found") setJoinState("not_found");
  }, [joinStatus, workspace, navigate]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUsername.trim() || !workspaceName.trim()) return;
    createWorkspace(createUsername.trim(), workspaceName.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinUsername.trim() || !workspaceCode.trim()) return;
    setJoinState("form");
    requestJoinWorkspace(joinUsername.trim(), workspaceCode.trim());
  };

  const closeModal = () => {
    setModal(null);
    setJoinState("form");
    setCreateUsername(""); setWorkspaceName("");
    setJoinUsername(""); setWorkspaceCode("");
  };

  const BASE = import.meta.env.BASE_URL;

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/5 rounded-full blur-[100px]" />
      </div>

      {/* Logo + Title */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-12"
      >
        <img
          src={`${BASE}logo.png`}
          alt="Unite"
          className="h-20 w-20 rounded-2xl object-cover mb-5 shadow-xl shadow-blue-500/20"
        />
        <h1 className="text-5xl font-bold text-white tracking-tight mb-2">Unite</h1>
        <p className="text-gray-400 text-lg text-center max-w-xs">
          Real-time collaborative code editing for teams
        </p>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-3 px-9 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105"
        >
          <Plus className="h-5 w-5" />
          Create Workspace
        </button>
        <button
          onClick={() => setModal("join")}
          className="flex items-center gap-3 px-9 py-4 bg-[#1a2030] hover:bg-[#1e2740] border border-[#2a3550] hover:border-[#3a4a6a] text-white font-semibold rounded-2xl transition-all hover:scale-105"
        >
          <LogIn className="h-5 w-5" />
          Join Workspace
        </button>
      </motion.div>

      {/* Features */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="mt-16 grid grid-cols-2 sm:grid-cols-5 gap-6 text-center"
      >
        {[
          { icon: "⚡", label: "Real-time editing" },
          { icon: "👥", label: "Live cursors" },
          { icon: "🔒", label: "Owner approvals" },
          { icon: "▶️", label: "Run code" },
          { icon: "💻", label: "Terminal" },
        ].map((f) => (
          <div key={f.label} className="flex flex-col items-center gap-2">
            <span className="text-2xl">{f.icon}</span>
            <span className="text-sm text-gray-500">{f.label}</span>
          </div>
        ))}
      </motion.div>

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#131928] border border-[#2a3550] rounded-2xl p-8 w-full max-w-md shadow-2xl"
            >
              {modal === "create" && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Create Workspace</h2>
                    <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
                  </div>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">Your Name</label>
                      <input autoFocus type="text" value={createUsername} onChange={(e) => setCreateUsername(e.target.value)} placeholder="e.g. Madhav"
                        className="w-full bg-[#0a0e17] border border-[#2a3550] focus:border-blue-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">Workspace Name</label>
                      <input type="text" value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="e.g. Team Project"
                        className="w-full bg-[#0a0e17] border border-[#2a3550] focus:border-blue-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors" />
                    </div>
                    <button type="submit" disabled={!createUsername.trim() || !workspaceName.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all mt-2">
                      Create & Enter
                    </button>
                  </form>
                </>
              )}

              {modal === "join" && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-white">Join Workspace</h2>
                    <button onClick={closeModal} className="text-gray-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
                  </div>

                  {joinState === "form" && (
                    <form onSubmit={handleJoin} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Your Name</label>
                        <input autoFocus type="text" value={joinUsername} onChange={(e) => setJoinUsername(e.target.value)} placeholder="e.g. Harsh"
                          className="w-full bg-[#0a0e17] border border-[#2a3550] focus:border-blue-500 text-white rounded-xl px-4 py-3 text-sm outline-none transition-colors" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1.5">Workspace Code</label>
                        <input type="text" value={workspaceCode} onChange={(e) => setWorkspaceCode(e.target.value.toUpperCase())} placeholder="e.g. WS-4F92KD"
                          className="w-full bg-[#0a0e17] border border-[#2a3550] focus:border-blue-500 text-white font-mono rounded-xl px-4 py-3 text-sm outline-none uppercase transition-colors" />
                      </div>
                      <button type="submit" disabled={!joinUsername.trim() || !workspaceCode.trim()}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all mt-2">
                        Request to Join
                      </button>
                    </form>
                  )}

                  {joinState === "waiting" && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
                      <div className="text-center">
                        <p className="text-white font-semibold text-lg mb-1">Waiting for approval</p>
                        <p className="text-gray-400 text-sm">The workspace owner will accept or reject your request.</p>
                      </div>
                    </div>
                  )}

                  {joinState === "rejected" && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="p-3 bg-red-500/10 rounded-full"><X className="h-8 w-8 text-red-400" /></div>
                      <div className="text-center">
                        <p className="text-white font-semibold text-lg mb-1">Request Rejected</p>
                        <p className="text-gray-400 text-sm">The owner declined your request.</p>
                      </div>
                      <button onClick={() => setJoinState("form")} className="text-sm text-blue-400 hover:text-blue-300 underline">Try a different code</button>
                    </div>
                  )}

                  {joinState === "not_found" && (
                    <div className="flex flex-col items-center gap-4 py-6">
                      <div className="p-3 bg-yellow-500/10 rounded-full"><AlertCircle className="h-8 w-8 text-yellow-400" /></div>
                      <div className="text-center">
                        <p className="text-white font-semibold text-lg mb-1">Workspace Not Found</p>
                        <p className="text-gray-400 text-sm">No workspace exists with that code.</p>
                      </div>
                      <button onClick={() => setJoinState("form")} className="text-sm text-blue-400 hover:text-blue-300 underline">Try again</button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
