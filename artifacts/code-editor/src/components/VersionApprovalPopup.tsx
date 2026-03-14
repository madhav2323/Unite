import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, FileCode, ChevronDown, ChevronUp } from "lucide-react";
import { VersionSaveRequest } from "@/context/WorkspaceContext";
import { formatDistanceToNow } from "date-fns";

interface Props {
  requests: VersionSaveRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

function RequestCard({ req, onApprove, onReject }: {
  req: VersionSaveRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [showCode, setShowCode] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      className="bg-[#1c2333] border border-[#2d3a55] rounded-2xl p-4 shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-yellow-500/10 rounded-xl shrink-0">
          <FileCode className="h-4 w-4 text-yellow-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Version Save Request</p>
          <p className="text-gray-300 text-xs mt-0.5">
            <span className="font-bold text-white">{req.username}</span> wants to save a version
          </p>
          <p className="text-gray-500 text-[10px] mt-0.5">
            {formatDistanceToNow(new Date(req.timestamp), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Label */}
      <div className="text-xs text-gray-400 bg-[#0f1520] rounded-lg px-3 py-2 mb-3 font-mono truncate">
        {req.label}
      </div>

      {/* Code preview toggle */}
      <button
        onClick={() => setShowCode(!showCode)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-3 transition-colors"
      >
        {showCode ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {showCode ? "Hide code preview" : "Show code preview"}
      </button>

      {showCode && (
        <div className="bg-[#0f1520] rounded-lg p-3 mb-3 overflow-auto max-h-28">
          <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap">{req.code.slice(0, 300)}{req.code.length > 300 ? "…" : ""}</pre>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onApprove}
          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-400 text-xs font-semibold py-2 px-3 rounded-xl transition-all">
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </button>
        <button onClick={onReject}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 text-red-400 text-xs font-semibold py-2 px-3 rounded-xl transition-all">
          <XCircle className="h-3.5 w-3.5" /> Reject
        </button>
      </div>
    </motion.div>
  );
}

export function VersionApprovalPopup({ requests, onApprove, onReject }: Props) {
  if (requests.length === 0) return null;
  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-3 max-w-xs w-full">
      <AnimatePresence>
        {requests.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            onApprove={() => onApprove(req.id)}
            onReject={() => onReject(req.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
