import React, { useRef, useEffect, useCallback } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { CursorPosition, RemoteCursor } from '@/context/WorkspaceContext';

interface Props {
  code: string;
  language: string;
  onChange: (val: string) => void;
  onCursorMove: (pos: CursorPosition) => void;
  remoteCursors: Record<string, RemoteCursor>;
  socketUpdateRef: React.MutableRefObject<boolean>;
  readOnly?: boolean;
}

function getCursorStyleId(userId: string) {
  return `remote-cursor-style-${userId.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function getCursorClassName(userId: string) {
  return `remote-cursor-${userId.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function injectCursorStyle(userId: string, username: string, color: string) {
  const styleId = getCursorStyleId(userId);
  const className = getCursorClassName(userId);

  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  const safeUsername = username.replace(/"/g, '\\"').replace(/\\/g, '\\\\');
  styleEl.innerHTML = `
    .${className} {
      position: relative;
      border-left: 2px solid ${color};
      margin-left: -1px;
      pointer-events: none;
      z-index: 50;
    }
    .${className}::before {
      content: "${safeUsername}";
      position: absolute;
      top: -22px;
      left: -2px;
      background: ${color};
      color: #ffffff;
      padding: 1px 6px;
      border-radius: 3px 3px 3px 0;
      font-size: 11px;
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      line-height: 18px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 100;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
  `;
}

function removeCursorStyle(userId: string) {
  document.getElementById(getCursorStyleId(userId))?.remove();
}

// Simple throttle utility
function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

export function MonacoWrapper({
  code,
  language,
  onChange,
  onCursorMove,
  remoteCursors,
  socketUpdateRef,
  readOnly = false,
}: Props) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const decorationsRef = useRef<MonacoEditor.IEditorDecorationsCollection | null>(null);
  const knownUsersRef = useRef<Set<string>>(new Set());
  const throttledCursorMove = useRef<((pos: CursorPosition) => void) | null>(null);

  const handleEditorDidMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;
    monacoRef.current = monacoInstance;

    monacoInstance.editor.defineTheme('codesync-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [{ background: '1e1e1e' }],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': '#c9d1d9',
        'editorIndentGuide.background1': '#404040',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': '#aeafad',
      },
    });
    monacoInstance.editor.setTheme('codesync-dark');

    decorationsRef.current = editorInstance.createDecorationsCollection();

    // Create throttled cursor emitter (30ms)
    throttledCursorMove.current = throttle((pos: CursorPosition) => {
      onCursorMove(pos);
    }, 30);

    editorInstance.onDidChangeCursorPosition((e) => {
      if (!socketUpdateRef.current && throttledCursorMove.current) {
        throttledCursorMove.current({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      }
    });
  };

  const handleEditorChange: OnChange = (value) => {
    if (!socketUpdateRef.current && value !== undefined) {
      onChange(value);
    }
    socketUpdateRef.current = false;
  };

  // Sync remote cursors → Monaco decorations
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !decorationsRef.current) return;

    const model = editor.getModel();
    if (!model) return;

    const cursors = Object.values(remoteCursors);
    const currentIds = new Set(cursors.map((c) => c.userId));

    // Remove styles for disconnected users
    knownUsersRef.current.forEach((uid) => {
      if (!currentIds.has(uid)) {
        removeCursorStyle(uid);
        knownUsersRef.current.delete(uid);
      }
    });

    // Inject/update per-user styles
    cursors.forEach(({ userId, username, color }) => {
      injectCursorStyle(userId, username, color);
      knownUsersRef.current.add(userId);
    });

    // Build Monaco decorations
    const decorations: MonacoEditor.IModelDeltaDecoration[] = cursors.map((cursor) => {
      const { lineNumber, column } = cursor.position;
      const maxLine = model.getLineCount();
      const safeLine = Math.max(1, Math.min(lineNumber, maxLine));
      const maxCol = model.getLineMaxColumn(safeLine);
      const safeCol = Math.max(1, Math.min(column, maxCol));

      return {
        range: new monaco.Range(safeLine, safeCol, safeLine, safeCol),
        options: {
          beforeContentClassName: getCursorClassName(cursor.userId),
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          hoverMessage: {
            value: `**${cursor.username}** is editing here`,
            isTrusted: true,
          },
          zIndex: 50,
        },
      };
    });

    decorationsRef.current.set(decorations);
  }, [remoteCursors]);

  // Update readOnly option when prop changes
  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly });
  }, [readOnly]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {readOnly && (
        <div className="absolute top-2 right-3 z-10 flex items-center gap-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md pointer-events-none">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Only
        </div>
      )}
      <Editor
        height="100%"
        language={language === 'cpp' ? 'cpp' : language}
        value={code}
        theme="vs-dark"
        options={{
          readOnly,
          minimap: { enabled: true, scale: 1 },
          fontSize: 14,
          fontFamily: '"JetBrains Mono", "Fira Code", Menlo, monospace',
          fontLigatures: true,
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          formatOnPaste: true,
          padding: { top: 16, bottom: 16 },
          lineNumbers: 'on',
          glyphMargin: true,
          folding: true,
          renderLineHighlight: 'gutter',
          overviewRulerLanes: 2,
        }}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
        loading={
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Loading editor...
          </div>
        }
      />
    </div>
  );
}
