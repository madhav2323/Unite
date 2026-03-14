import React from 'react';
import { History, Clock, RotateCcw, FileCode } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileVersion } from '@/context/WorkspaceContext';

interface Props {
  versions: FileVersion[];
  fileName: string | null;
  isOwner: boolean;
  onRestore: (versionId: string) => void;
}

export function VersionPanel({ versions, fileName, isOwner, onRestore }: Props) {
  return (
    <div className="flex flex-col h-full bg-[#161b22]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d] shrink-0">
        <History className="h-3.5 w-3.5 text-[#8b949e]" />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">
          {fileName ? `History` : 'Version History'}
        </h3>
        {versions.length > 0 && (
          <span className="ml-auto text-[10px] bg-[#21262d] text-[#8b949e] px-1.5 py-0.5 rounded-full">
            {versions.length}
          </span>
        )}
      </div>

      {fileName && (
        <div className="px-3 py-1.5 border-b border-[#21262d] bg-[#0d1117]/50">
          <div className="flex items-center gap-1.5 text-[11px] text-[#8b949e]">
            <FileCode className="h-3 w-3" />
            <span className="font-mono truncate">{fileName}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {!fileName ? (
          <div className="text-xs text-[#484f58] text-center py-8 flex flex-col items-center gap-3">
            <History className="h-8 w-8 opacity-20" />
            <p>Select a file to view its version history.</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-xs text-[#484f58] text-center py-8 flex flex-col items-center gap-3">
            <History className="h-8 w-8 opacity-20" />
            <p>No versions saved yet.</p>
            <p className="text-[10px]">Save the file to create a version.</p>
          </div>
        ) : (
          <div className="space-y-2 relative before:absolute before:inset-y-0 before:left-[15px] before:w-px before:bg-[#21262d]">
            {versions.map((version, idx) => (
              <div key={version.id} className="relative pl-9 group">
                <div className={`absolute left-[11px] top-3.5 h-2 w-2 rounded-full ring-2 ring-[#161b22] z-10 ${
                  idx === 0 ? 'bg-[#00ff9c]' : 'bg-[#21262d]'
                }`} />
                <div className="bg-[#0d1117] border border-[#21262d] rounded-lg p-2.5 group-hover:border-[#30363d] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="text-xs font-semibold text-[#c9d1d9] truncate max-w-[100px]">
                        {idx === 0 ? '● Latest' : `v${versions.length - idx}`}
                      </div>
                      <div className="text-[10px] text-[#484f58] flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatDistanceToNow(new Date(version.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#8b949e] truncate mb-2">
                    by {version.savedBy}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#484f58]">
                      {version.code.split('\n').length} lines
                    </span>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => onRestore(version.id)}
                      className="h-6 px-2 text-[10px] hover:bg-[#00ff9c]/10 hover:text-[#00ff9c] text-[#484f58] transition-colors"
                      title={isOwner ? "Restore this version" : "Request restore"}
                    >
                      <RotateCcw className="h-2.5 w-2.5 mr-1" />
                      {isOwner ? 'Restore' : 'Request'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
