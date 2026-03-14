import React, { useState } from 'react';
import { Users, Crown, Pencil, Eye, UserX, ChevronDown } from 'lucide-react';
import { WorkspaceUser, Role } from '@/context/WorkspaceContext';

interface Props {
  users: WorkspaceUser[];
  currentUserId: string;
  isOwner: boolean;
  onKickUser: (socketId: string) => void;
  onChangeRole: (socketId: string, newRole: Role) => void;
}

export function ActiveUsers({ users, currentUserId, isOwner, onKickUser, onChangeRole }: Props) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d] shrink-0">
        <Users className="h-3.5 w-3.5 text-[#8b949e]" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">
          Members
        </span>
        <span className="ml-auto text-[10px] bg-[#21262d] text-[#8b949e] px-1.5 py-0.5 rounded-full">
          {users.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {users.length === 0 && (
          <div className="text-xs text-[#484f58] text-center py-4 px-3">No users yet</div>
        )}

        {users.map((user) => {
          const isMe = user.socketId === currentUserId;
          const color = user.color || '#00ff9c';
          const canManage = isOwner && !isMe && !user.isOwner;

          return (
            <div key={user.socketId}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${
                isMe ? 'bg-[#1c2128]' : 'hover:bg-[#161b22]'
              }`}
            >
              <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-black shadow-sm"
                style={{ backgroundColor: color }}>
                {user.username.charAt(0).toUpperCase()}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[#0d1117] bg-emerald-400" />
              </div>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium text-[#c9d1d9] truncate">
                  {user.username}
                  {isMe && <span className="text-[#484f58] font-normal ml-1">(you)</span>}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  {user.isOwner ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-yellow-400">
                      <Crown className="h-2.5 w-2.5" /> Admin
                    </span>
                  ) : user.role === 'editor' ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#00ff9c]">
                      <Pencil className="h-2.5 w-2.5" /> Editor
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium text-blue-400">
                      <Eye className="h-2.5 w-2.5" /> Viewer
                    </span>
                  )}
                </div>
              </div>

              {/* Admin controls */}
              {canManage && (
                <div className="flex items-center gap-1 shrink-0 relative">
                  {/* Role toggle dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === user.socketId ? null : user.socketId)}
                      className="p-1 rounded hover:bg-[#21262d] text-[#484f58] hover:text-[#c9d1d9] transition-colors"
                      title="Change role"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    {openDropdown === user.socketId && (
                      <div className="absolute right-0 top-6 z-50 w-28 bg-[#1c2128] border border-[#21262d] rounded shadow-xl overflow-hidden">
                        <button
                          onClick={() => { onChangeRole(user.socketId, 'editor'); setOpenDropdown(null); }}
                          className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                            user.role === 'editor'
                              ? 'text-[#00ff9c] bg-[#00ff9c]/10'
                              : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
                          }`}
                        >
                          <Pencil className="h-3 w-3" /> Editor
                        </button>
                        <button
                          onClick={() => { onChangeRole(user.socketId, 'viewer'); setOpenDropdown(null); }}
                          className={`w-full flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
                            user.role === 'viewer'
                              ? 'text-blue-400 bg-blue-400/10'
                              : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
                          }`}
                        >
                          <Eye className="h-3 w-3" /> Viewer
                        </button>
                        <div className="h-px bg-[#21262d]" />
                        <button
                          onClick={() => { onKickUser(user.socketId); setOpenDropdown(null); }}
                          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <UserX className="h-3 w-3" /> Kick
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Close dropdown on outside click */}
      {openDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}
