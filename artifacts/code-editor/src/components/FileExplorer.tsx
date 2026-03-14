import React, { useState } from 'react';
import { FolderOpen, Plus, X, FileText } from 'lucide-react';
import { WorkspaceFileMeta } from '@/context/WorkspaceContext';

interface Props {
  files: WorkspaceFileMeta[];
  selectedFileId: string | null;
  isOwner: boolean;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name: string) => void;
}

interface LangInfo {
  icon: string;
  color: string;
  label: string;
}

const EXT_MAP: Record<string, LangInfo> = {
  py:   { icon: '🐍', color: 'text-yellow-400', label: 'Python' },
  js:   { icon: '📜', color: 'text-yellow-300', label: 'JavaScript' },
  ts:   { icon: '🔷', color: 'text-blue-400',   label: 'TypeScript' },
  tsx:  { icon: '⚛️',  color: 'text-sky-400',    label: 'React TSX' },
  jsx:  { icon: '⚛️',  color: 'text-sky-300',    label: 'React JSX' },
  java: { icon: '☕', color: 'text-orange-400', label: 'Java' },
  cpp:  { icon: '⚙️',  color: 'text-blue-300',   label: 'C++' },
  cc:   { icon: '⚙️',  color: 'text-blue-300',   label: 'C++' },
  c:    { icon: '🔵', color: 'text-blue-200',   label: 'C' },
  h:    { icon: '📋', color: 'text-purple-300',  label: 'Header' },
  rs:   { icon: '🦀', color: 'text-orange-500', label: 'Rust' },
  go:   { icon: '🐹', color: 'text-cyan-400',   label: 'Go' },
  rb:   { icon: '💎', color: 'text-red-400',    label: 'Ruby' },
  php:  { icon: '🐘', color: 'text-purple-400', label: 'PHP' },
  cs:   { icon: '🔶', color: 'text-green-400',  label: 'C#' },
  sh:   { icon: '🖥️',  color: 'text-green-300',  label: 'Shell' },
  bash: { icon: '🖥️',  color: 'text-green-300',  label: 'Bash' },
  json: { icon: '📦', color: 'text-yellow-200', label: 'JSON' },
  md:   { icon: '📝', color: 'text-gray-400',   label: 'Markdown' },
  html: { icon: '🌐', color: 'text-orange-300', label: 'HTML' },
  css:  { icon: '🎨', color: 'text-purple-400', label: 'CSS' },
  sql:  { icon: '🗃️',  color: 'text-teal-400',   label: 'SQL' },
  yaml: { icon: '📄', color: 'text-pink-300',   label: 'YAML' },
  yml:  { icon: '📄', color: 'text-pink-300',   label: 'YAML' },
  toml: { icon: '⚙️',  color: 'text-gray-400',   label: 'TOML' },
  xml:  { icon: '📰', color: 'text-orange-200', label: 'XML' },
  txt:  { icon: '📃', color: 'text-gray-400',   label: 'Text' },
};

function getLangInfo(name: string): LangInfo {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MAP[ext] ?? { icon: '📄', color: 'text-gray-400', label: 'File' };
}

export function FileExplorer({ files, selectedFileId, isOwner, onSelectFile, onCreateFile }: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    onCreateFile(name);
    setNewName('');
    setCreating(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#21262d] shrink-0">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-3.5 w-3.5 text-[#8b949e]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8b949e]">
            Explorer
          </span>
        </div>
        {isOwner && (
          <button
            onClick={() => setCreating(true)}
            title="New File"
            className="p-1 rounded hover:bg-[#21262d] text-[#8b949e] hover:text-[#00ff9c] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="px-2 py-2 border-b border-[#21262d]">
          <div className="flex items-center gap-1 bg-[#0d1117] border border-[#00ff9c]/40 rounded px-2 py-1">
            <FileText className="h-3 w-3 text-[#8b949e] shrink-0" />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="filename.py"
              className="flex-1 text-xs bg-transparent text-[#c9d1d9] outline-none placeholder-[#484f58]"
              onKeyDown={(e) => { if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
            />
            <button type="button" onClick={() => { setCreating(false); setNewName(''); }}
              className="text-[#484f58] hover:text-red-400 transition-colors">
              <X className="h-3 w-3" />
            </button>
          </div>
          <p className="text-[10px] text-[#484f58] mt-1 px-1">Press Enter to create</p>
        </form>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <span className="text-3xl block mb-2">📁</span>
            <p className="text-xs text-[#484f58]">
              {isOwner ? 'No files yet. Create one to start.' : 'Waiting for admin to create files.'}
            </p>
          </div>
        ) : (
          files.map((file) => {
            const isSelected = file.id === selectedFileId;
            const langInfo = getLangInfo(file.name);

            return (
              <button
                key={file.id}
                onClick={() => onSelectFile(file.id)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors group ${
                  isSelected
                    ? 'bg-[#1c2128] text-[#c9d1d9] border-l-2 border-[#00ff9c]'
                    : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9] border-l-2 border-transparent'
                }`}
              >
                <span className="text-sm shrink-0 leading-none" title={langInfo.label}>
                  {langInfo.icon}
                </span>
                <span className="text-xs truncate flex-1 font-mono">{file.name}</span>
                <span className={`text-[10px] shrink-0 ${isSelected ? 'text-[#484f58]' : 'text-[#21262d] group-hover:text-[#484f58]'}`}>
                  {file.linesCount}L
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
