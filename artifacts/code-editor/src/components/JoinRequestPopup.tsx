import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCheck, Eye, X, UserPlus } from "lucide-react";
import { PendingJoinRequest } from "@/context/WorkspaceContext";

interface Props {
  requests: PendingJoinRequest[];
  onApproveEditor: (socketId: string) => void;
  onApproveViewer: (socketId: string) => void;
  onReject: (socketId: string) => void;
}

export function JoinRequestPopup({ requests, onApproveEditor, onApproveViewer, onReject }: Props) {
  if (requests.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      <AnimatePresence>
        {requests.map((req) => (
          <motion.div
            key={req.socketId}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className="bg-[#1c2128] border border-[#30363d] rounded-2xl p-4 shadow-2xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-xl shrink-0">
                <UserPlus className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Join Request</p>
                <p className="text-gray-300 text-sm mt-0.5">
                  <span className="font-bold text-white">{req.username}</span> wants to join your workspace
                </p>
              </div>
              <button
                onClick={() => onReject(req.socketId)}
                className="ml-auto text-gray-500 hover:text-white transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onApproveEditor(req.socketId)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-400 text-xs font-semibold py-2 px-3 rounded-xl transition-all"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Editor
              </button>
              <button
                onClick={() => onApproveViewer(req.socketId)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 text-blue-400 text-xs font-semibold py-2 px-3 rounded-xl transition-all"
              >
                <Eye className="h-3.5 w-3.5" />
                Viewer
              </button>
              <button
                onClick={() => onReject(req.socketId)}
                className="flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 text-xs font-semibold py-2 px-3 rounded-xl transition-all"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
