import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

export type User = {
  userId: string;
  username: string;
  color: string;
  socketId?: string;
};

export type ChatMessage = {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  userId: string;
};

export type CursorPosition = {
  lineNumber: number;
  column: number;
};

export type RemoteCursor = {
  userId: string;
  username: string;
  color: string;
  position: CursorPosition;
};

export function useEditorSocket(username: string | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [myColor, setMyColor] = useState<string>('#4ECDC4');
  const [mySocketId, setMySocketId] = useState<string | null>(null);

  const codeRef = useRef<string>('');
  const [language, setLanguage] = useState<'python' | 'java' | 'cpp' | 'c'>('python');
  
  // Use a stable ID for the session
  const [userId] = useState(() => uuidv4());

  useEffect(() => {
    if (!username) return;

    // Connect to the same origin via /api/socket.io path
    const newSocket = io(window.location.origin, {
      path: '/api/socket.io',
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      setMySocketId(newSocket.id ?? null);
      newSocket.emit('joinRoom', { username, userId, roomId: 'main' });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      setActiveUsers([]);
    });

    newSocket.on('userList', (users: User[]) => {
      setActiveUsers(users);
      // Extract and store our own server-assigned color
      const me = users.find((u) => u.socketId === newSocket.id);
      if (me?.color) setMyColor(me.color);
    });

    newSocket.on('chatMessage', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('cursorUpdate', (cursor: RemoteCursor) => {
      if (cursor.userId !== userId) {
        setRemoteCursors(prev => ({
          ...prev,
          [cursor.userId]: cursor
        }));
      }
    });

    newSocket.on('userLeft', (leftUserId: string) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[leftUserId];
        return next;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [username, userId]);

  const emitCodeChange = useCallback((newCode: string, lang: string) => {
    codeRef.current = newCode;
    if (socket && connected) {
      socket.emit('codeChange', { code: newCode, language: lang, userId });
    }
  }, [socket, connected, userId]);

  const emitCursorMove = useCallback((position: CursorPosition, color: string) => {
    if (socket && connected) {
      socket.emit('cursorMove', { userId, username, color, position });
    }
  }, [socket, connected, userId, username]);

  const sendChatMessage = useCallback((message: string) => {
    if (socket && connected) {
      socket.emit('chatMessage', { 
        id: uuidv4(),
        userId,
        username, 
        message, 
        timestamp: new Date().toISOString() 
      });
    }
  }, [socket, connected, userId, username]);

  return {
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
  };
}
