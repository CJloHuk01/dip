import { useState, useEffect } from 'react';
import ChatWidget from '../ChatWidget/ChatWidget';
import styles from './AdminChat.module.css';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

interface Dialog {
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface AdminChatProps {
  currentUserId: string;
}

function AdminChat({ currentUserId }: AdminChatProps) {
  const [dialogs, setDialogs] = useState<Dialog[]>([]);
  const [selectedDialog, setSelectedDialog] = useState<Dialog | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem('token');

  const fetchDialogs = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/chat/dialogs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDialogs(data.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDialogs();
    const interval = setInterval(fetchDialogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (iso: string) => {
    if (!iso || iso === '0001-01-01T00:00:00') return '';
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name[0]?.toUpperCase() || '?';
  };

  if (loading) return <div className={styles.loading}>Загрузка диалогов...</div>;

  return (
    <div className={styles.adminChat}>
      {/* Список диалогов */}
      <div className={styles.dialogList}>
        <div className={styles.dialogListHeader}>Диалоги</div>
        {dialogs.length === 0 ? (
          <div className={styles.noDialogs}>Нет активных диалогов</div>
        ) : (
          dialogs.map(dialog => (
            <div
              key={dialog.userId}
              className={`${styles.dialogItem} ${selectedDialog?.userId === dialog.userId ? styles.dialogActive : ''}`}
              onClick={() => setSelectedDialog(dialog)}
            >
              <div className={styles.dialogAvatar}>
                {dialog.avatarUrl
                  ? <img src={`${import.meta.env.VITE_API_URL}${dialog.avatarUrl}`} alt="" />
                  : <span>{getInitials(dialog.userName)}</span>
                }
                {dialog.unreadCount > 0 && (
                  <span className={styles.unreadBadge}>{dialog.unreadCount}</span>
                )}
              </div>
              <div className={styles.dialogInfo}>
                <div className={styles.dialogName}>{dialog.userName}</div>
                <div className={styles.dialogLastMsg}>{dialog.lastMessage || 'Нет сообщений'}</div>
              </div>
              <div className={styles.dialogTime}>{formatTime(dialog.lastMessageAt)}</div>
            </div>
          ))
        )}
      </div>

      {/* Область чата */}
      <div className={styles.chatArea}>
        {selectedDialog ? (
          <ChatWidget
            currentUserId={currentUserId}
            isAdmin={true}
            companionId={selectedDialog.userId}
            companionName={selectedDialog.userName}
          />
        ) : (
          <div className={styles.selectDialog}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
            <div>Выберите диалог из списка</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminChat;
