import { useState, useEffect, useRef } from 'react';
import styles from './ChatWidget.module.css';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  message: string;
  sentAt: string;
  isRead: boolean;
}

interface ChatWidgetProps {
  currentUserId: string;
  isAdmin?: boolean;
  companionId?: string; // для админа — id пользователя
  companionName?: string;
}

function ChatWidget({ currentUserId, isAdmin = false, companionId, companionName }: ChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getToken = () => localStorage.getItem('token');

  const fetchMessages = async () => {
    const token = getToken();
    if (!token) return;
    const query = isAdmin && companionId ? `?companionId=${companionId}` : '';
    try {
      const res = await fetch(`${API_URL}/chat/messages${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setMessages(data.data || []);
    } catch {}
  };

  useEffect(() => {
    fetchMessages();
    pollingRef.current = setInterval(fetchMessages, 4000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [companionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const token = getToken();
    if (!token) return;

    setLoading(true);
    try {
      const body: any = { message: text.trim() };
      if (isAdmin && companionId) body.receiverId = companionId;

      const res = await fetch(`${API_URL}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setText('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  // Группировка по дате
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const date = formatDate(msg.sentAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  });

  return (
    <div className={styles.chat}>
      <div className={styles.header}>
        💬 {isAdmin ? `Чат с ${companionName || 'пользователем'}` : 'Чат с поддержкой'}
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            Нет сообщений. Напишите первым!
          </div>
        )}
        {grouped.map(group => (
          <div key={group.date}>
            <div className={styles.dateDivider}>{group.date}</div>
            {group.msgs.map(msg => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div key={msg.id} className={`${styles.bubble} ${isMine ? styles.mine : styles.theirs}`}>
                  <div className={styles.bubbleText}>{msg.message}</div>
                  <div className={styles.bubbleMeta}>
                    {formatTime(msg.sentAt)}
                    {isMine && <span className={styles.readMark}>{msg.isRead ? ' ✓✓' : ' ✓'}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputArea}>
        <textarea
          className={styles.input}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение... (Enter — отправить)"
          rows={2}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={loading || !text.trim()}
        >
          {loading ? '...' : '➤'}
        </button>
      </div>
    </div>
  );
}

export default ChatWidget;
