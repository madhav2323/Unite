import React from 'react';
import { Terminal, XCircle, CheckCircle2 } from 'lucide-react';
import { ExecuteCodeResponse } from '@workspace/api-client-react';

interface Props {
  result: ExecuteCodeResponse | null;
  isRunning: boolean;
  error: Error | null;
}

export function ConsolePanel({ result, isRunning, error }: Props) {
  return (
    <div className="flex flex-col h-full bg-panel">
      <div className="p-2.5 border-b border-border flex items-center gap-2 shrink-0 bg-background/30">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Output Console</h3>
        
        {result && !isRunning && (
          <div className="ml-auto flex items-center gap-1.5 text-xs">
            {result.exitCode === 0 ? (
              <span className="flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Exited 0
              </span>
            ) : (
              <span className="flex items-center gap-1 text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                <XCircle className="h-3 w-3" /> Exited {result.exitCode}
              </span>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto font-mono text-sm bg-[#0d0d0d]">
        {isRunning ? (
          <div className="flex items-center gap-3 text-muted-foreground animate-pulse">
            <span className="h-2 w-2 bg-primary rounded-full animate-bounce" />
            Executing code...
          </div>
        ) : error ? (
          <div className="text-destructive whitespace-pre-wrap">
            Error: {error.message}
          </div>
        ) : result ? (
          <div className="flex flex-col gap-4">
            {result.output && (
              <div>
                <div className="text-foreground whitespace-pre-wrap">{result.output}</div>
              </div>
            )}
            {result.error && (
              <div>
                <div className="text-destructive font-semibold mb-1">Standard Error:</div>
                <div className="text-destructive/80 whitespace-pre-wrap">{result.error}</div>
              </div>
            )}
            {!result.output && !result.error && (
              <div className="text-muted-foreground italic">Process finished with no output.</div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground italic h-full flex flex-col items-center justify-center gap-2 opacity-50">
            <Terminal className="h-8 w-8" />
            Click 'Run Code' to see output here
          </div>
        )}
      </div>
    </div>
  );
}
