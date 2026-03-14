import React, { useState, useRef, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { UsernameModal } from '@/components/UsernameModal';
import { Header } from '@/components/Header';
import { ActiveUsers } from '@/components/ActiveUsers';
import { ConsolePanel } from '@/components/ConsolePanel';
import { ChatPanel } from '@/components/ChatPanel';
import { VersionPanel } from '@/components/VersionPanel';
import { MonacoWrapper } from '@/components/MonacoWrapper';
import { useEditorSocket } from '@/hooks/use-editor-socket';
import { useExecuteCode, useGetVersions, useSaveVersion, ExecuteCodeRequestLanguage, Version } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function EditorPage() {
  const [username, setUsername] = useState<string | null>(null);
  const [code, setCode] = useState<string>('# Start coding here...\nprint("Hello, CodeSync!")');
  const socketUpdateRef = useRef<boolean>(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    socket,
    connected,
    userId,
    myColor,
    mySocketId,
    activeUsers,
    messages,
    remoteCursors,
    language,
    setLanguage,
    emitCodeChange,
    emitCursorMove,
    sendChatMessage
  } = useEditorSocket(username);

  // API Hooks
  const { mutate: executeCode, data: execResult, isPending: isExecuting, error: execError } = useExecuteCode();
  const { data: versions = [], isLoading: isLoadingVersions } = useGetVersions();
  const { mutate: saveVersion, isPending: isSaving } = useSaveVersion({
    mutation: {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Version saved successfully.', variant: 'default' });
        queryClient.invalidateQueries({ queryKey: ['/api/versions'] });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to save version.', variant: 'destructive' });
      }
    }
  });

  // Socket sync logic for Code
  useEffect(() => {
    if (!socket) return;
    
    // When connecting, server sends current code state
    socket.on('codeSync', (data: { code: string, language: string }) => {
      socketUpdateRef.current = true;
      setCode(data.code);
      setLanguage(data.language as ExecuteCodeRequestLanguage);
    });

    // Listen for code updates from others
    socket.on('codeUpdate', (data: { code: string, language: string, userId: string }) => {
      if (data.userId !== userId) {
        socketUpdateRef.current = true;
        setCode(data.code);
        if (data.language && data.language !== language) {
          setLanguage(data.language as ExecuteCodeRequestLanguage);
        }
      }
    });

    return () => {
      socket.off('codeSync');
      socket.off('codeUpdate');
    };
  }, [socket, userId, language]);

  // Handlers
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    emitCodeChange(newCode, language);
  };

  const handleRunCode = () => {
    executeCode({ data: { language: language as ExecuteCodeRequestLanguage, code } });
  };

  const handleSaveVersion = () => {
    saveVersion({ data: { username: username!, code, language, label: `Save by ${username}` } });
  };

  const handleRestoreVersion = (version: Version) => {
    socketUpdateRef.current = true;
    setCode(version.code);
    setLanguage(version.language as ExecuteCodeRequestLanguage);
    emitCodeChange(version.code, version.language);
    toast({ title: 'Version Restored', description: `Restored to ${version.language} code.` });
  };

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden text-foreground">
      <UsernameModal 
        isOpen={!username} 
        onSubmit={setUsername} 
      />

      <Header 
        connected={connected}
        username={username || 'Guest'}
        userId={userId}
        language={language}
        setLanguage={(l) => { setLanguage(l); emitCodeChange(code, l); }}
        onRun={handleRunCode}
        isRunning={isExecuting}
        onSave={handleSaveVersion}
        isSaving={isSaving}
      />

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" autoSaveId="codesync-layout">
          {/* LEFT: Active Users */}
          <Panel defaultSize={15} minSize={10} className="hidden md:block border-r border-border">
            <ActiveUsers users={activeUsers} currentUserId={mySocketId ?? userId} />
          </Panel>
          
          <PanelResizeHandle className="resize-handle w-1 bg-border hidden md:block" />
          
          {/* CENTER: Editor & Bottom Tools */}
          <Panel defaultSize={65} minSize={30}>
            <PanelGroup direction="vertical">
              {/* Editor */}
              <Panel defaultSize={70} minSize={20}>
                <div className="h-full bg-[#1e1e1e]">
                  <MonacoWrapper 
                    code={code}
                    language={language}
                    onChange={handleCodeChange}
                    onCursorMove={(pos) => emitCursorMove(pos, myColor)}
                    remoteCursors={remoteCursors}
                    socketUpdateRef={socketUpdateRef}
                  />
                </div>
              </Panel>
              
              <PanelResizeHandle className="resize-handle h-1 bg-border" />
              
              {/* BOTTOM: Console & Chat */}
              <Panel defaultSize={30} minSize={15}>
                <PanelGroup direction="horizontal">
                  <Panel defaultSize={60} minSize={20}>
                    <ConsolePanel 
                      result={execResult || null} 
                      isRunning={isExecuting} 
                      error={execError as Error || null} 
                    />
                  </Panel>
                  
                  <PanelResizeHandle className="resize-handle w-1 bg-border" />
                  
                  <Panel defaultSize={40} minSize={20}>
                    <ChatPanel 
                      messages={messages} 
                      onSendMessage={sendChatMessage} 
                      currentUserId={userId} 
                    />
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="resize-handle w-1 bg-border hidden lg:block" />

          {/* RIGHT: Versions */}
          <Panel defaultSize={20} minSize={15} className="hidden lg:block border-l border-border">
            <VersionPanel 
              versions={versions} 
              isLoading={isLoadingVersions}
              onRestore={handleRestoreVersion}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
