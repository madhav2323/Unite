import React, { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket | null;
  workspaceCode: string | null;
  readOnly?: boolean;
}

export function XTerminal({ socket, workspaceCode, readOnly = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const initializedRef = useRef(false);

  const write = useCallback((data: string) => {
    termRef.current?.write(data);
  }, []);

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const term = new XTerm({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const linksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(linksAddon);
    term.open(containerRef.current);

    termRef.current = term;
    fitRef.current = fitAddon;

    // Fit after a small delay so the container has correct dimensions
    setTimeout(() => { try { fitAddon.fit(); } catch {} }, 100);

    // Handle input from user
    if (!readOnly) {
      term.onData((data) => {
        if (socket && socket.connected) {
          socket.emit('terminalInput', { data });
        }
      });
    }

    // ResizeObserver to keep terminal fitted
    const ro = new ResizeObserver(() => {
      try { fitAddon.fit(); } catch {}
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      term.dispose();
      initializedRef.current = false;
    };
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handleOutput = ({ data }: { data: string }) => {
      termRef.current?.write(data);
    };
    const handleHistory = (data: string) => {
      termRef.current?.write(data);
    };

    socket.on('terminalOutput', handleOutput);
    socket.on('terminalHistory', handleHistory);

    // Connect to terminal session
    if (workspaceCode) {
      socket.emit('terminalConnect');
    }

    return () => {
      socket.off('terminalOutput', handleOutput);
      socket.off('terminalHistory', handleHistory);
    };
  }, [socket, workspaceCode]);

  return (
    <div className="flex flex-col h-full bg-[#0d1117]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#21262d] shrink-0 bg-[#161b22]">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-500/80" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
          <div className="h-3 w-3 rounded-full bg-green-500/80" />
        </div>
        <span className="text-xs text-gray-500 font-mono ml-2">bash — Unite Terminal</span>
        {readOnly && (
          <span className="ml-auto text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">read-only</span>
        )}
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden p-2" />
    </div>
  );
}
