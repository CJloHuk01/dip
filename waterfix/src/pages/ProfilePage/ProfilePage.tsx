import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import styles from './ProfilePage.module.css';
import { usersApi, complaintsApi, type Complaint } from '../../api/api';
import ChatWidget from '../../components/ChatWidget/ChatWidget';

const API_URL = 'http://localhost:5000';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  avatarUrl?: string;
  emailNotificationsEnabled?: boolean;
}

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'inProgress' | 'resolved' | 'rejected'>('all');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'complaints' | 'chat'>('complaints');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { navigate('/'); return; }
    const userData = JSON.parse(userStr);
    setUser(userData);
    setEditForm({ name: userData.name || '', phone: userData.phone || '' });
    setEmailNotifications(userData.emailNotificationsEnabled ?? true);

    const isAdmin = userData?.role === 'admin';
    const fetch = isAdmin
      ? complaintsApi.getAll()
      : complaintsApi.getMy().then(d => ({ data: d }));
    fetch
      .then(data => setComplaints(data?.data || []))
      .catch(err => console.error('Ошибка загрузки заявок:', err));
  }, [navigate]);

  if (!user) return null;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await usersApi.uploadAvatar(file);
      const avatarUrl = res.data?.avatarUrl;
      setUser(prev => prev ? { ...prev, avatarUrl } : prev);
      const current = JSON.parse(localStorage.getItem('currentUser') || '{}');
      localStorage.setItem('currentUser', JSON.stringify({ ...current, avatarUrl }));
    } catch {
      alert('Ошибка загрузки фото');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await usersApi.updateProfile(editForm.name, editForm.phone || undefined);
      setUser(prev => prev ? { ...prev, name: editForm.name, phone: editForm.phone } : prev);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    setSavingNotifications(true);
    try {
      await usersApi.updateNotifications(enabled);
      setEmailNotifications(enabled);
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const userData = JSON.parse(userStr);
        localStorage.setItem('currentUser', JSON.stringify({ ...userData, emailNotificationsEnabled: enabled }));
      }
    } catch {
      alert('Ошибка сохранения настроек');
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const getFilteredComplaints = () => filter === 'all' ? complaints : complaints.filter(c => c.status === filter);
  const getStatusText = (status: string) => ({ new: 'Новая', inProgress: 'В работе', resolved: 'Решена', rejected: 'Отклонена' }[status] || status);
  const getStatusClass = (status: string) => ({ new: styles.statusNew, inProgress: styles.statusInProgress, resolved: styles.statusResolved, rejected: styles.statusRejected }[status] || '');
  const getTypeLabel = (type: string) => ({ money: '💰 Зажевало деньги', water: '💧 Не наливает воду', change: '🪙 Не даёт сдачу', screen: '📱 Сломан экран', other: '❓ Другое' }[type] || type);
  const formatDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const stats = {
    total: complaints.length,
    inProgress: complaints.filter(c => c.status === 'inProgress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const getInitials = () => user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <button className={styles.backButton} onClick={() => navigate('/')}>← Вернуться на карту</button>

          <div className={styles.profileGrid}>
            <div className={styles.profileCard}>
              <div className={styles.avatarSection}>
                {/* Аватар с кнопкой загрузки */}
                <div className={styles.avatarWrapper}>
                  <div
                    className={styles.avatar}
                    onClick={() => avatarInputRef.current?.click()}
                    style={{ cursor: 'pointer' }}
                    title="Нажмите, чтобы изменить фото"
                  >
                    {user.avatarUrl ? (
                      <img
                        src={`${API_URL}${user.avatarUrl}`}
                        alt="Аватар"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%'
                        }}
                      />
                    ) : (
                      getInitials()
                    )}
                  </div>
                 
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className={styles.userName}>{user.name}</div>
                <div className={styles.userRole}>{user.role === 'admin' ? 'Администратор' : 'Пользователь'}</div>
              </div>

              <div className={styles.userStats}>
                <div className={styles.statItem}><div className={styles.statValue}>{stats.total}</div><div className={styles.statLabel}>Всего заявок</div></div>
                <div className={styles.statItem}><div className={styles.statValue}>{stats.inProgress}</div><div className={styles.statLabel}>В работе</div></div>
                <div className={styles.statItem}><div className={styles.statValue}>{stats.resolved}</div><div className={styles.statLabel}>Решено</div></div>
              </div>

              {!isEditing ? (
                <>
                  <div className={styles.infoSection}>
                    <div className={styles.infoTitle}>Контактная информация</div>
                    <div className={styles.infoList}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoIcon}>📧</span>
                        <div className={styles.infoContent}><div className={styles.infoLabel}>Email</div><div className={styles.infoValue}>{user.email}</div></div>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoIcon}>📞</span>
                        <div className={styles.infoContent}><div className={styles.infoLabel}>Телефон</div><div className={styles.infoValue}>{user.phone || 'Не указан'}</div></div>
                      </div>
                      {user.role !== 'admin' && (
                        <div className={styles.infoRow}>
                          <span className={styles.infoIcon}>🔔</span>
                          <div className={styles.infoContent}>
                            <div className={styles.infoLabel}>Email-уведомления</div>
                            <div className={styles.infoValue}>
                              <div
                                onClick={() => !savingNotifications && handleToggleNotifications(!emailNotifications)}
                                style={{
                                  width: '40px', height: '22px', borderRadius: '11px',
                                  background: emailNotifications ? '#2563eb' : '#d1d5db',
                                  position: 'relative', cursor: 'pointer',
                                  transition: 'background 0.2s',
                                  opacity: savingNotifications ? 0.6 : 1,
                                  display: 'inline-block'
                                }}
                              >
                                <div style={{
                                  position: 'absolute', top: '3px',
                                  left: emailNotifications ? '21px' : '3px',
                                  width: '16px', height: '16px', borderRadius: '50%',
                                  background: 'white', transition: 'left 0.2s',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                }} />
                              </div>
                              <span style={{ fontSize: '14px', color: '#374151', marginLeft: '8px' }}>
                                {savingNotifications ? 'Сохранение...' : emailNotifications ? 'Включены' : 'Отключены'}
                              </span>
                            </div>
                          </div>
                      </div>
                    )}</div>
                  </div>
                  <button className={styles.editBtn} onClick={() => setIsEditing(true)}>✏️ Редактировать профиль</button>
                </>
              ) : (
                <div className={styles.editForm}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Имя</label>
                    <input type="text" name="name" value={editForm.name} onChange={handleChange} className={styles.input} />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Телефон</label>
                    <input type="tel" name="phone" value={editForm.phone} onChange={handleChange} className={styles.input} placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div className={styles.editActions}>
                    <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
                    <button className={styles.cancelBtn} onClick={() => setIsEditing(false)}>Отмена</button>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.complaintsCard}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button onClick={() => setActiveTab('complaints')}
                  style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                    background: activeTab === 'complaints' ? '#2563eb' : '#f1f5f9',
                    color: activeTab === 'complaints' ? 'white' : '#374151', fontWeight: 500 }}>
                  📋 Мои заявки
                </button>
                {user.role !== 'admin' && (
                  <button onClick={() => setActiveTab('chat')}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: activeTab === 'chat' ? '#2563eb' : '#f1f5f9',
                      color: activeTab === 'chat' ? 'white' : '#374151', fontWeight: 500 }}>
                    💬 Чат с поддержкой
                  </button>
                )}
              </div>

              {activeTab === 'chat' && user.role !== 'admin' && (
                <ChatWidget currentUserId={user.id} />
              )}

              {activeTab === 'complaints' && (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                    {(['all', 'new', 'inProgress', 'resolved', 'rejected'] as const).map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={filter === f ? styles.filterActive : styles.filterBtn}>
                        {f === 'all' ? 'Все' : getStatusText(f)}
                      </button>
                    ))}
                  </div>

                  {getFilteredComplaints().length > 0 ? (
                    <div className={styles.complaintsList}>
                      {getFilteredComplaints().map(complaint => (
                        <div key={complaint.id} className={styles.complaintItem} onClick={() => setSelectedComplaint(complaint)}>
                          <div className={styles.complaintMain}>
                            <div className={styles.complaintAddress}>{complaint.machineAddress}</div>
                            <div className={styles.complaintMeta}>
                              <span className={styles.complaintType}>{getTypeLabel(complaint.type)}</span>
                              <span className={styles.complaintDate}>{formatDate(complaint.createdAt)}</span>
                            </div>
                            <div className={styles.complaintComment}>
                              {complaint.comment && complaint.comment.length > 50
                                ? complaint.comment.substring(0, 50) + '...'
                                : complaint.comment}
                            </div>
                          </div>
                          <div className={styles.complaintRight}>
                            <span className={`${styles.complaintStatus} ${getStatusClass(complaint.status)}`}>{getStatusText(complaint.status)}</span>
                            <span className={styles.complaintArrow}>→</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.noComplaints}>
                      <div className={styles.noComplaintsIcon}>📭</div>
                      <div>У вас пока нет заявок</div>
                      <div style={{ fontSize: '14px', marginTop: '8px' }}>Нажмите на метку на карте, чтобы сообщить о проблеме</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedComplaint && (
        <div className={styles.modalOverlay} onClick={() => setSelectedComplaint(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Детали заявки</h3>
              <button className={styles.modalClose} onClick={() => setSelectedComplaint(null)}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.modalRow}><span className={styles.modalLabel}>Адрес</span><span className={styles.modalValue}>{selectedComplaint.machineAddress}</span></div>
              <div className={styles.modalRow}><span className={styles.modalLabel}>Тип проблемы</span><span className={styles.modalValue}>{getTypeLabel(selectedComplaint.type)}</span></div>
              <div className={styles.modalRow}><span className={styles.modalLabel}>Дата создания</span><span className={styles.modalValue}>{formatDate(selectedComplaint.createdAt)}</span></div>
              <div className={styles.modalRow}><span className={styles.modalLabel}>Статус</span><span className={`${styles.complaintStatus} ${getStatusClass(selectedComplaint.status)}`}>{getStatusText(selectedComplaint.status)}</span></div>
              <div className={styles.modalDivider} />
              <div className={styles.modalRow}><span className={styles.modalLabel}>Ваш комментарий</span><span className={styles.modalValue}>{selectedComplaint.comment}</span></div>
              {selectedComplaint.adminComment && (
                <div className={styles.modalRow}><span className={styles.modalLabel}>Ответ администратора</span><span className={styles.modalValue}>{selectedComplaint.adminComment}</span></div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProfilePage;
