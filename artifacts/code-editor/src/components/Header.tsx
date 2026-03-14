import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Save, Wifi, WifiOff, Copy, Check, Crown, Pencil, Eye, LogOut, XCircle } from 'lucide-react';
import { ExecuteCodeRequestLanguage } from '@workspace/api-client-react';
import { Role } from '@/context/WorkspaceContext';

interface Props {
  connected: boolean;
  username: string;
  myColor: string;
  language: string;
  setLanguage: (lang: ExecuteCodeRequestLanguage) => void;
  onRun: () => void;
  isRunning: boolean;
  onSave: () => void;
  workspaceCode: string;
  workspaceName: string;
  myRole: Role;
  isOwner: boolean;
  openFileName: string | null;
  canEdit: boolean;
  onEndSession: () => void;
  onExitSession: () => void;
}

export function Header({
  connected, username, myColor, language, setLanguage,
  onRun, isRunning, onSave,
  workspaceCode, workspaceName, myRole, isOwner,
  openFileName, canEdit,
  onEndSession, onExitSession,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const languages: ExecuteCodeRequestLanguage[] = ['python', 'javascript', 'typescript', 'java', 'cpp', 'c'];
  const BASE = import.meta.env.BASE_URL;

  const copyCode = () => {
    navigator.clipboard.writeText(workspaceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEndSession = () => {
    if (confirmEnd) {
      onEndSession();
      setConfirmEnd(false);
    } else {
      setConfirmEnd(true);
      setTimeout(() => setConfirmEnd(false), 3000);
    }
  };

  return (
    <header className="h-12 border-b border-[#21262d] bg-[#161b22] flex items-center justify-between px-4 shrink-0 gap-3">
      {/* Left: Logo + workspace */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <img src={`${BASE}logo.png`} alt="Unite" className="h-6 w-6 rounded object-cover" />
          <span className="text-[#00ff9c] font-bold text-base tracking-tight">Unite</span>
        </div>

        <span className="text-[#21262d]">│</span>
        <span className="text-sm font-medium text-[#c9d1d9] truncate max-w-[120px]">{workspaceName}</span>

        <button onClick={copyCode}
          className="flex items-center gap-1.5 text-xs font-mono bg-[#0d1117] border border-[#21262d] hover:border-[#00ff9c]/40 text-[#8b949e] hover:text-[#00ff9c] px-2 py-0.5 rounded transition-all shrink-0">
          {workspaceCode}
          {copied ? <Check className="h-3 w-3 text-[#00ff9c]" /> : <Copy className="h-3 w-3" />}
        </button>

        {openFileName && (
          <>
            <span className="text-[#21262d]">│</span>
            <span className="text-sm text-[#8b949e] font-mono truncate max-w-[140px]">{openFileName}</span>
          </>
        )}

        {connected ? (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-[#00ff9c] bg-[#00ff9c]/10 px-2 py-0.5 rounded shrink-0">
            <Wifi className="h-3 w-3" /> Live
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded shrink-0">
            <WifiOff className="h-3 w-3" /> Offline
          </div>
        )}
      </div>

      {/* Center: controls */}
      <div className="flex items-center gap-2">
        {openFileName && canEdit && (
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as ExecuteCodeRequestLanguage)}
            className="bg-[#0d1117] border border-[#21262d] text-[#c9d1d9] text-xs rounded px-2.5 py-1 focus:outline-none focus:border-[#00ff9c]/50 cursor-pointer hover:border-[#30363d] transition-colors"
          >
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang === 'javascript' ? 'JavaScript' : lang === 'typescript' ? 'TypeScript' : lang.toUpperCase()}
              </option>
            ))}
          </select>
        )}

        {openFileName && canEdit && (
          <Button
            onClick={onSave}
            variant="secondary"
            size="sm"
            className="h-7 gap-1.5 text-xs bg-[#1c2128] border border-[#21262d] hover:border-[#00ff9c]/40 hover:text-[#00ff9c] text-[#8b949e]"
          >
            <Save className="h-3.5 w-3.5" />
            {isOwner ? 'Save' : 'Request Save'}
          </Button>
        )}

        {openFileName && !canEdit && (
          <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded">
            <Eye className="h-3.5 w-3.5" /> View Only
          </div>
        )}

        {openFileName && (
          <Button
            onClick={onRun}
            disabled={isRunning || !canEdit}
            variant="default"
            size="sm"
            className="h-7 gap-1.5 text-xs bg-[#00ff9c] hover:bg-[#00ff9c]/80 text-black font-semibold disabled:opacity-40"
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
        )}
      </div>

      {/* Right: Identity + Session controls */}
      <div className="flex items-center gap-2 shrink-0">
        {isOwner ? (
          <div className="flex items-center gap-1 text-[10px] font-medium text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
            <Crown className="h-3 w-3" /> Admin
          </div>
        ) : (
          <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${
            myRole === 'editor' ? 'text-[#00ff9c] bg-[#00ff9c]/10' : 'text-blue-400 bg-blue-400/10'
          }`}>
            {myRole === 'editor' ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {myRole === 'editor' ? 'Editor' : 'Viewer'}
          </div>
        )}
        <span className="text-xs font-medium text-[#8b949e] hidden sm:block">{username}</span>
        <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-black shadow shrink-0"
          style={{ backgroundColor: myColor }}>
          {username.charAt(0).toUpperCase()}
        </div>

        <div className="w-px h-5 bg-[#21262d] mx-1" />

        {isOwner ? (
          <Button
            onClick={handleEndSession}
            size="sm"
            className={`h-7 gap-1.5 text-xs font-semibold transition-all ${
              confirmEnd
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-500'
                : 'bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500'
            }`}
          >
            <XCircle className="h-3.5 w-3.5" />
            {confirmEnd ? 'Confirm?' : 'End Session'}
          </Button>
        ) : (
          <Button
            onClick={onExitSession}
            size="sm"
            className="h-7 gap-1.5 text-xs font-semibold bg-transparent border border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit
          </Button>
        )}
      </div>
    </header>
  );
}
