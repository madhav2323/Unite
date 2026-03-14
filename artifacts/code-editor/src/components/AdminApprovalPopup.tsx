import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RotateCcw, Check, X } from 'lucide-react';
import { SaveRequest, RestoreRequest } from '@/context/WorkspaceContext';

interface Props {
  saveRequests: SaveRequest[];
  restoreRequests: RestoreRequest[];
  onApproveSave: (requestId: string) => void;
  onRejectSave: (requestId: string) => void;
  onApproveRestore: (requestId: string) => void;
  onRejectRestore: (requestId: string) => void;
}

export function AdminApprovalPopup({
  saveRequests, restoreRequests,
  onApproveSave, onRejectSave,
  onApproveRestore, onRejectRestore,
}: Props) {
  const hasItems = saveRequests.length > 0 || restoreRequests.length > 0;
  if (!hasItems) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-xs w-full">
      <AnimatePresence>
        {saveRequests.map((req) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className="bg-[#1c2128] border border-[#30363d] rounded-xl p-3.5 shadow-2xl"
          >
            <div className="flex items-start gap-2.5 mb-3">
              <div className="p-1.5 bg-[#00ff9c]/10 rounded-lg shrink-0">
                <Save className="h-4 w-4 text-[#00ff9c]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#c9d1d9] font-semibold text-sm">Save Request</p>
                <p className="text-[#8b949e] text-xs mt-0.5">
                  <span className="text-white font-medium">{req.username}</span> wants to save{' '}
                  <span className="text-[#00ff9c] font-mono">{req.filename}</span>
                </p>
                <p className="text-[10px] text-[#484f58] mt-1">
                  {req.code.split('\n').length} lines of code
                </p>
              </div>
              <button onClick={() => onRejectSave(req.id)} className="text-[#484f58] hover:text-red-400 transition-colors shrink-0 mt-0.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onApproveSave(req.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#00ff9c]/10 hover:bg-[#00ff9c]/20 border border-[#00ff9c]/30 text-[#00ff9c] text-xs font-semibold py-1.5 rounded-lg transition-all"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                onClick={() => onRejectSave(req.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 text-xs font-semibold py-1.5 rounded-lg transition-all"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          </motion.div>
        ))}

        {restoreRequests.map((req) => (
          <motion.div
            key={req.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className="bg-[#1c2128] border border-[#30363d] rounded-xl p-3.5 shadow-2xl"
          >
            <div className="flex items-start gap-2.5 mb-3">
              <div className="p-1.5 bg-purple-500/10 rounded-lg shrink-0">
                <RotateCcw className="h-4 w-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#c9d1d9] font-semibold text-sm">Restore Request</p>
                <p className="text-[#8b949e] text-xs mt-0.5">
                  <span className="text-white font-medium">{req.username}</span> wants to restore{' '}
                  <span className="text-purple-400 font-mono">{req.filename}</span>
                </p>
              </div>
              <button onClick={() => onRejectRestore(req.id)} className="text-[#484f58] hover:text-red-400 transition-colors shrink-0 mt-0.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onApproveRestore(req.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-semibold py-1.5 rounded-lg transition-all"
              >
                <Check className="h-3.5 w-3.5" /> Approve
              </button>
              <button
                onClick={() => onRejectRestore(req.id)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-600/30 text-red-400 text-xs font-semibold py-1.5 rounded-lg transition-all"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
