import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import styles from './ProfilePage.module.css';
import { usersApi, complaintsApi, type Complaint } from '../../api/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
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

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { navigate('/'); return; }
    const userData = JSON.parse(userStr);
    setUser(userData);
    setEditForm({ name: userData.name || '', phone: userData.phone || '' });

    // Загружаем заявки с сервера
    const isAdmin = JSON.parse(localStorage.getItem('currentUser') || '{}')?.role === 'admin';
const fetch = isAdmin ? complaintsApi.getAll() : complaintsApi.getMy().then(d => ({ data: d }));
fetch
    .then(data => setComplaints(data?.data || []))
    .catch(err => console.error('Ошибка загрузки заявок:', err));
  }, [navigate]);

  if (!user) return null;

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

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <button className={styles.backButton} onClick={() => navigate('/')}>← Вернуться на карту</button>

          <div className={styles.profileGrid}>
            <div className={styles.profileCard}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
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
                    </div>
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
              <div className={styles.complaintsHeader}>
                <h2 className={styles.complaintsTitle}>Мои заявки</h2>
                <div className={styles.complaintsFilter}>
                  {(['all', 'new', 'inProgress', 'resolved', 'rejected'] as const).map(f => (
                    <button key={f} className={`${styles.filterBtn} ${filter === f ? styles.active : ''}`} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'Все' : getStatusText(f)}
                    </button>
                  ))}
                </div>
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
                        <div className={styles.complaintComment}>{complaint.comment.length > 50 ? complaint.comment.substring(0, 50) + '...' : complaint.comment}</div>
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
