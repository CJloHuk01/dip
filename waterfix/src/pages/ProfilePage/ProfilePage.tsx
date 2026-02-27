import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import styles from './ProfilePage.module.css';

// Типы для заявки
interface Complaint {
  id: number;
  machineId: number;
  machineAddress: string;
  type: string;
  typeLabel: string;
  date: string;
  status: 'new' | 'inProgress' | 'resolved' | 'rejected';
  comment: string;
  adminComment?: string;
}

// Типы для пользователя
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  registeredAt?: string;
}

// Моковые данные заявок (позже будут загружаться с сервера)
const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: 101,
    machineId: 1,
    machineAddress: 'ул. Советская, 48 (ост. Драмтеатр)',
    type: 'money',
    typeLabel: 'Зажевало деньги',
    date: '2024-02-20T10:30:00',
    status: 'resolved',
    comment: 'Внес 100 рублей, вода не налилась, деньги не вернулись',
    adminComment: 'Провели перезагрузку, деньги возвращены на карту'
  },
  {
    id: 102,
    machineId: 2,
    machineAddress: 'пр-т Победы, 156 (ТРК Север)',
    type: 'water',
    typeLabel: 'Не наливает воду',
    date: '2024-02-21T15:45:00',
    status: 'inProgress',
    comment: 'Выбрал 5 литров, оплатил, вода не льётся',
    adminComment: 'Мастер выехал, проблема в насосе'
  },
  {
    id: 103,
    machineId: 3,
    machineAddress: 'ул. Терешковой, 255 (ост. Телецентр)',
    type: 'screen',
    typeLabel: 'Сломан экран',
    date: '2024-02-22T09:15:00',
    status: 'new',
    comment: 'Экран не реагирует на нажатия, выбрать воду невозможно'
  }
];

function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'inProgress' | 'resolved' | 'rejected'>('all');

  // Загружаем пользователя
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      navigate('/');
      return;
    }
    const userData = JSON.parse(userStr);
    setUser(userData);
    setEditForm({
      name: userData.name || '',
      email: userData.email || '',
      phone: userData.phone || ''
    });
  }, [navigate]);

  if (!user) {
    return null;
  }

  const handleGoBack = () => {
    navigate('/');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || ''
    });
    setIsEditing(false);
  };

  const handleSave = () => {
    const updatedUser = {
      ...user,
      name: editForm.name,
      email: editForm.email,
      phone: editForm.phone
    };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Загрузка аватара:', file);
    }
  };

  const getFilteredComplaints = () => {
    if (filter === 'all') return complaints;
    return complaints.filter(c => c.status === filter);
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      new: 'Новая',
      inProgress: 'В работе',
      resolved: 'Решена',
      rejected: 'Отклонена'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusClass = (status: string) => {
    const classMap = {
      new: styles.statusNew,
      inProgress: styles.statusInProgress,
      resolved: styles.statusResolved,
      rejected: styles.statusRejected
    };
    return classMap[status as keyof typeof classMap] || '';
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      money: '💰 Зажевало деньги',
      water: '💧 Не наливает воду',
      change: '🪙 Не даёт сдачу',
      screen: '📱 Сломан экран',
      other: '❓ Другое'
    };
    return typeMap[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const stats = {
    total: complaints.length,
    inProgress: complaints.filter(c => c.status === 'inProgress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length
  };

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <button className={styles.backButton} onClick={handleGoBack}>
            ← Вернуться на карту
          </button>

          <div className={styles.profileGrid}>
            {/* Левая колонка - Профиль */}
            <div className={styles.profileCard}>
              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  <div className={styles.avatarOverlay}>
                    <span>📷</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className={styles.avatarInput}
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className={styles.userName}>{user.name}</div>
                <div className={styles.userRole}>
                  {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </div>
              </div>

              <div className={styles.userStats}>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{stats.total}</div>
                  <div className={styles.statLabel}>Всего заявок</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{stats.inProgress}</div>
                  <div className={styles.statLabel}>В работе</div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statValue}>{stats.resolved}</div>
                  <div className={styles.statLabel}>Решено</div>
                </div>
              </div>

              {!isEditing ? (
                <>
                  <div className={styles.infoSection}>
                    <div className={styles.infoTitle}>Контактная информация</div>
                    <div className={styles.infoList}>
                      <div className={styles.infoRow}>
                        <span className={styles.infoIcon}>📧</span>
                        <div className={styles.infoContent}>
                          <div className={styles.infoLabel}>Email</div>
                          <div className={styles.infoValue}>{user.email}</div>
                        </div>
                      </div>
                      <div className={styles.infoRow}>
                        <span className={styles.infoIcon}>📞</span>
                        <div className={styles.infoContent}>
                          <div className={styles.infoLabel}>Телефон</div>
                          <div className={styles.infoValue}>{user.phone || 'Не указан'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className={styles.editBtn} onClick={handleEdit}>
                    ✏️ Редактировать профиль
                  </button>
                </>
              ) : (
                <div className={styles.editForm}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Имя</label>
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleChange}
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Телефон</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editForm.phone}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                  <div className={styles.editActions}>
                    <button className={styles.saveBtn} onClick={handleSave}>
                      Сохранить
                    </button>
                    <button className={styles.cancelBtn} onClick={handleCancel}>
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Правая колонка - Заявки */}
            <div className={styles.complaintsCard}>
              <div className={styles.complaintsHeader}>
                <h2 className={styles.complaintsTitle}>Мои заявки</h2>
                <div className={styles.complaintsFilter}>
                  <button
                    className={`${styles.filterBtn} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    Все
                  </button>
                  <button
                    className={`${styles.filterBtn} ${filter === 'new' ? styles.active : ''}`}
                    onClick={() => setFilter('new')}
                  >
                    Новые
                  </button>
                  <button
                    className={`${styles.filterBtn} ${filter === 'inProgress' ? styles.active : ''}`}
                    onClick={() => setFilter('inProgress')}
                  >
                    В работе
                  </button>
                  <button
                    className={`${styles.filterBtn} ${filter === 'resolved' ? styles.active : ''}`}
                    onClick={() => setFilter('resolved')}
                  >
                    Решены
                  </button>
                </div>
              </div>

              {getFilteredComplaints().length > 0 ? (
                <div className={styles.complaintsList}>
                  {getFilteredComplaints().map(complaint => (
                    <div
                      key={complaint.id}
                      className={styles.complaintItem}
                      onClick={() => setSelectedComplaint(complaint)}
                    >
                      <div className={styles.complaintMain}>
                        <div className={styles.complaintAddress}>
                          {complaint.machineAddress}
                        </div>
                        <div className={styles.complaintMeta}>
                          <span className={styles.complaintType}>
                            {getTypeLabel(complaint.type)}
                          </span>
                          <span className={styles.complaintDate}>
                            {formatDate(complaint.date)}
                          </span>
                        </div>
                        <div className={styles.complaintComment}>
                          {complaint.comment.length > 50
                            ? complaint.comment.substring(0, 50) + '...'
                            : complaint.comment}
                        </div>
                      </div>
                      <div className={styles.complaintRight}>
                        <span className={`${styles.complaintStatus} ${getStatusClass(complaint.status)}`}>
                          {getStatusText(complaint.status)}
                        </span>
                        <span className={styles.complaintArrow}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noComplaints}>
                  <div className={styles.noComplaintsIcon}>📭</div>
                  <div>У вас пока нет заявок</div>
                  <div style={{ fontSize: '14px', marginTop: '8px' }}>
                    Нажмите на метку на карте, чтобы сообщить о проблеме
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Модалка деталей заявки */}
      {selectedComplaint && (
        <div className={styles.modalOverlay} onClick={() => setSelectedComplaint(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Детали заявки</h3>
              <button className={styles.modalClose} onClick={() => setSelectedComplaint(null)}>×</button>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Адрес</span>
                <span className={styles.modalValue}>{selectedComplaint.machineAddress}</span>
              </div>
              
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Тип проблемы</span>
                <span className={styles.modalValue}>
                  {getTypeLabel(selectedComplaint.type)}
                </span>
              </div>
              
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Дата создания</span>
                <span className={styles.modalValue}>{formatDate(selectedComplaint.date)}</span>
              </div>
              
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Статус</span>
                <span className={`${styles.complaintStatus} ${getStatusClass(selectedComplaint.status)}`}>
                  {getStatusText(selectedComplaint.status)}
                </span>
              </div>
              
              <div className={styles.modalDivider} />
              
              <div className={styles.modalRow}>
                <span className={styles.modalLabel}>Ваш комментарий</span>
                <span className={styles.modalValue}>{selectedComplaint.comment}</span>
              </div>
              
              {selectedComplaint.adminComment && (
                <div className={styles.modalRow}>
                  <span className={styles.modalLabel}>Ответ администратора</span>
                  <span className={styles.modalValue}>{selectedComplaint.adminComment}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProfilePage;