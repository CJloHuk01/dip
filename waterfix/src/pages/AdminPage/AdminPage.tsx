import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import styles from './AdminPage.module.css';
import { machinesApi, type Machine, type Complaint } from '../../api/api';
import AdminChat from '../../components/AdminChat/AdminChat';
import StatsTab from '../../components/StatsTab/StatsTab';

declare global { interface Window { ymaps: any; } }

const API_URL = 'http://localhost:5000/api';
const getToken = () => localStorage.getItem('token');

const adminRequest = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  return res.json();
};

interface User {
  id: string; name: string; email: string;
  phone?: string; role: string; createdAt: string;
}

type Tab = 'complaints' | 'machines' | 'users' | 'chat'| 'stats';

function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('complaints');

  // Complaints
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [newStatus, setNewStatus] = useState('');

  // Machines
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [machineForm, setMachineForm] = useState({
    address: '', latitude: '', longitude: '', workingHours: 'Круглосуточно',
    status: 'working', phone: '', waterPrice: '5 руб/л',
    paymentMethods: 'cash,card',
    lastMaintenance: new Date().toISOString().split('T')[0]
  });
  const [machineModalMode, setMachineModalMode] = useState<'create' | 'edit'>('create');
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [machinePhotoFile, setMachinePhotoFile] = useState<File | null>(null);
  const [machinePhotoPreview, setMachinePhotoPreview] = useState<string | null>(null);
  const [uploadingMachinePhoto, setUploadingMachinePhoto] = useState(false);
  const machinePhotoInputRef = useRef<HTMLInputElement>(null);
  const handleMachinePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setMachinePhotoFile(file);
  setMachinePhotoPreview(URL.createObjectURL(file));
};

  // Карта в модалке
  const mapPickerRef = useRef<HTMLDivElement>(null);
  const mapPickerInstance = useRef<any>(null);
  const placemarkRef = useRef<any>(null);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', role: 'user' });
  const [showUserModal, setShowUserModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { navigate('/'); return; }
    const u = JSON.parse(userStr);
    if (u.role !== 'admin') { navigate('/'); return; }
  }, [navigate]);

  useEffect(() => {
    if (tab === 'complaints') loadComplaints();
    if (tab === 'machines') loadMachines();
    if (tab === 'users') loadUsers();
  }, [tab, statusFilter]);

  // Инициализация карты когда модалка открывается
  useEffect(() => {
    if (!showMachineModal) {
      // Уничтожаем карту при закрытии
      if (mapPickerInstance.current) {
        mapPickerInstance.current.destroy();
        mapPickerInstance.current = null;
        placemarkRef.current = null;
      }
      return;
    }

    // Небольшая задержка чтобы DOM успел отрисоваться
    const timer = setTimeout(() => initMapPicker(), 300);
    return () => clearTimeout(timer);
  }, [showMachineModal]);

  const initMapPicker = () => {
    if (!mapPickerRef.current) return;

    const initMap = () => {
      if (!mapPickerRef.current || mapPickerInstance.current) return;

      const centerLat = machineForm.latitude ? parseFloat(machineForm.latitude) : 51.768;
      const centerLng = machineForm.longitude ? parseFloat(machineForm.longitude) : 55.097;

      mapPickerInstance.current = new window.ymaps.Map(mapPickerRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        controls: ['zoomControl']
      });

      // Если уже есть координаты — ставим метку
      if (machineForm.latitude && machineForm.longitude) {
        placemarkRef.current = new window.ymaps.Placemark([centerLat, centerLng], {
          hintContent: 'Расположение водомата'
        }, { preset: 'islands#blueWaterCircleIcon' });
        mapPickerInstance.current.geoObjects.add(placemarkRef.current);
      }

      // Клик по карте — ставим метку и заполняем координаты
      mapPickerInstance.current.events.add('click', (e: any) => {
        const coords = e.get('coords');
        const lat = coords[0].toFixed(6);
        const lng = coords[1].toFixed(6);

        setMachineForm(prev => ({ ...prev, latitude: lat, longitude: lng }));

        // Обновляем или создаём метку
        if (placemarkRef.current) {
          placemarkRef.current.geometry.setCoordinates(coords);
        } else {
          placemarkRef.current = new window.ymaps.Placemark(coords, {
            hintContent: 'Расположение водомата'
          }, { preset: 'islands#blueWaterCircleIcon' });
          mapPickerInstance.current.geoObjects.add(placemarkRef.current);
        }

        // Геокодируем адрес по координатам
        window.ymaps.geocode(coords).then((res: any) => {
          const firstGeoObject = res.geoObjects.get(0);
          if (firstGeoObject) {
            const addr = firstGeoObject.getAddressLine();
            setMachineForm(prev => ({ ...prev, address: addr }));
          }
        });
      });
    };

    if (window.ymaps) {
      window.ymaps.ready(initMap);
    } else {
      const existing = document.querySelector('script[src*="api-maps.yandex.ru"]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://api-maps.yandex.ru/2.1/?apikey=74d33273-ff0c-43df-a5f5-f2ad8e1848a1&lang=ru_RU';
        script.async = true;
        script.onload = () => window.ymaps.ready(initMap);
        document.body.appendChild(script);
      } else {
        window.ymaps.ready(initMap);
      }
    }
  };

  const loadComplaints = async () => {
    setComplaintsLoading(true);
    try {
      const query = statusFilter ? `?status=${statusFilter}` : '';
      const data = await adminRequest(`/complaints${query}`);
      setComplaints(data.data || []);
    } finally { setComplaintsLoading(false); }
  };

  const loadMachines = async () => {
    setMachinesLoading(true);
    try { setMachines(await machinesApi.getAll()); }
    finally { setMachinesLoading(false); }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await adminRequest('/users');
      setUsers(data.data || []);
    } finally { setUsersLoading(false); }
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint) return;
    await adminRequest(`/complaints/${selectedComplaint.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus || selectedComplaint.status, adminComment }),
    });
    setSelectedComplaint(null);
    loadComplaints();
  };

  const openCreateMachine = () => {
    setSelectedMachine(null);
    setMachineForm({ address: '', latitude: '', longitude: '', workingHours: 'Круглосуточно', status: 'working', phone: '+73532', waterPrice: '5 руб/л', paymentMethods: 'cash,card', lastMaintenance: new Date().toISOString().split('T')[0] });
    setMachineModalMode('create');
    setShowMachineModal(true);
    setMachinePhotoFile(null);
setMachinePhotoPreview(null);
  };

  const openEditMachine = (m: Machine) => {
    setSelectedMachine(m);
    setMachineForm({
      address: m.address, latitude: String(m.latitude), longitude: String(m.longitude),
      workingHours: m.workingHours, status: m.status, phone: m.phone,
      waterPrice: m.waterPrice, paymentMethods: m.paymentMethods.join(','),
      lastMaintenance: m.lastMaintenance?.split('T')[0] || new Date().toISOString().split('T')[0]
    });
    setMachineModalMode('edit');
    setShowMachineModal(true);
    setMachinePhotoFile(null);
    setMachinePhotoPreview(null);
  };

  const handleSaveMachine = async () => {
    const body = {
      address: machineForm.address,
      latitude: parseFloat(machineForm.latitude),
      longitude: parseFloat(machineForm.longitude),
      workingHours: machineForm.workingHours,
      status: machineForm.status,
      phone: machineForm.phone,
      waterPrice: machineForm.waterPrice,
      paymentMethods: machineForm.paymentMethods.split(',').map(s => s.trim()),
      lastMaintenance: new Date(machineForm.lastMaintenance).toISOString(),
    };
    let savedId: string | null = null;
    if (machineModalMode === 'create') {
    const res = await adminRequest('/machines', { method: 'POST', body: JSON.stringify(body) });
    savedId = res.data?.id;
  } else if (selectedMachine) {
    await adminRequest(`/machines/${selectedMachine.id}`, { method: 'PUT', body: JSON.stringify(body) });
    savedId = selectedMachine.id;
  }

  // Загружаем фото если выбрано
  if (machinePhotoFile && savedId) {
    setUploadingMachinePhoto(true);
    try {
      const form = new FormData();
      form.append('file', machinePhotoFile);
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/machines/${savedId}/photo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
    } finally {
      setUploadingMachinePhoto(false);
    }
  }
    setShowMachineModal(false);
    loadMachines();
  };

  const handleDeleteMachine = async (id: string) => {
    if (!confirm('Удалить водомат?')) return;
    await adminRequest(`/machines/${id}`, { method: 'DELETE' });
    loadMachines();
  };

  const openEditUser = (u: User) => {
    setSelectedUser(u);
    setUserForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    await adminRequest(`/users/${selectedUser.id}`, { method: 'PUT', body: JSON.stringify(userForm) });
    setShowUserModal(false);
    loadUsers();
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Удалить пользователя?')) return;
    await adminRequest(`/users/${id}`, { method: 'DELETE' });
    loadUsers();
  };

  const openResetPassword = (u: User) => {
    setResetUser(u); setNewPassword(''); setShowResetModal(true);
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPassword) return;
    await adminRequest(`/users/${resetUser.id}/reset-password`, {
      method: 'POST', body: JSON.stringify({ newPassword }),
    });
    setShowResetModal(false);
    alert('Пароль успешно сброшен');
  };

  const getStatusLabel = (s: string) => ({ new: 'Новая', inProgress: 'В работе', resolved: 'Решена', rejected: 'Отклонена' }[s] || s);
  const getStatusClass = (s: string) => ({ new: styles.statusNew, inProgress: styles.statusInProgress, resolved: styles.statusResolved, rejected: styles.statusRejected }[s] || '');
  const getMachineStatusLabel = (s: string) => ({ working: '✅ Работает', maintenance: '🟡 Обслуживание', problem: '❌ Проблема' }[s] || s);
  const getRoleLabel = (r: string) => ({ admin: 'Администратор', user: 'Пользователь', guest: 'Гость' }[r] || r);

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <h1 className={styles.title}>Панель администратора</h1>

          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'complaints' ? styles.tabActive : ''}`} onClick={() => setTab('complaints')}>📋 Заявки</button>
            <button className={`${styles.tab} ${tab === 'machines' ? styles.tabActive : ''}`} onClick={() => setTab('machines')}>💧 Водоматы</button>
            <button className={`${styles.tab} ${tab === 'users' ? styles.tabActive : ''}`} onClick={() => setTab('users')}>👥 Пользователи</button>
            <button className={`${styles.tab} ${tab === 'chat' ? styles.tabActive : ''}`} onClick={() => setTab('chat')}>💬 Чат</button>
            <button className={`${styles.tab} ${tab === 'stats' ? styles.tabActive : ''}`} onClick={() => setTab('stats')}>📊 Статистика</button>
          </div>

          {tab === 'complaints' && (
            <div className={styles.section}>
              <div className={styles.toolbar}>
                <select className={styles.filter} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">Все статусы</option>
                  <option value="new">Новые</option>
                  <option value="inProgress">В работе</option>
                  <option value="resolved">Решённые</option>
                  <option value="rejected">Отклонённые</option>
                </select>
              </div>
              {complaintsLoading ? <div className={styles.loading}>Загрузка...</div> : (
                <div className={styles.list}>
                  {complaints.length === 0 ? <div className={styles.empty}>Заявок нет</div> : complaints.map(c => (
                    <div key={c.id} className={styles.card} onClick={() => { setSelectedComplaint(c); setAdminComment(c.adminComment || ''); setNewStatus(c.status); }}>
                      <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>{c.typeLabel}</span>
                        <span className={`${styles.badge} ${getStatusClass(c.status)}`}>{getStatusLabel(c.status)}</span>
                      </div>
                      <div className={styles.cardMeta}>📍 {c.machineAddress}</div>
                      <div className={styles.cardMeta}>👤 {c.userName || 'Аноним'} {c.userPhone ? `· ${c.userPhone}` : ''}</div>
                      <div className={styles.cardMeta}>🕐 {new Date(c.createdAt).toLocaleDateString('ru-RU')}</div>
                      {c.comment && <div className={styles.cardComment}>{c.comment}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'machines' && (
            <div className={styles.section}>
              <div className={styles.toolbar}>
                <button className={styles.btnPrimary} onClick={openCreateMachine}>+ Добавить водомат</button>
              </div>
              {machinesLoading ? <div className={styles.loading}>Загрузка...</div> : (
                <div className={styles.list}>
                  {machines.map(m => (
                    <div key={m.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>{m.address}</span>
                        <span className={styles.cardStatus}>{getMachineStatusLabel(m.status)}</span>
                      </div>
                      <div className={styles.cardMeta}>⏰ {m.workingHours} · 💧 {m.waterPrice}</div>
                      <div className={styles.cardMeta}>📞 {m.phone}</div>
                      <div className={styles.cardActions}>
                        <button className={styles.btnEdit} onClick={() => openEditMachine(m)}>✏️ Редактировать</button>
                        <button className={styles.btnDelete} onClick={() => handleDeleteMachine(m.id)}>🗑️ Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'users' && (
            <div className={styles.section}>
              {usersLoading ? <div className={styles.loading}>Загрузка...</div> : (
                <div className={styles.list}>
                  {users.map(u => (
                    <div key={u.id} className={styles.card}>
                      <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>{u.name}</span>
                        <span className={styles.roleBadge}>{getRoleLabel(u.role)}</span>
                      </div>
                      <div className={styles.cardMeta}>✉️ {u.email}</div>
                      {u.phone && <div className={styles.cardMeta}>📞 {u.phone}</div>}
                      <div className={styles.cardMeta}>📅 {new Date(u.createdAt).toLocaleDateString('ru-RU')}</div>
                      <div className={styles.cardActions}>
                        <button className={styles.btnEdit} onClick={() => openEditUser(u)}>✏️ Редактировать</button>
                        <button className={styles.btnReset} onClick={() => openResetPassword(u)}>🔑 Сброс пароля</button>
                        <button className={styles.btnDelete} onClick={() => handleDeleteUser(u.id)}>🗑️ Удалить</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {tab === 'chat' && (
            <div className={styles.section}>
              <AdminChat currentUserId={JSON.parse(localStorage.getItem('currentUser') || '{}').id} />
           </div>
          )}
          {tab === 'stats' && (
            <div className={styles.section}>
              <StatsTab />
            </div>
)}
        </div>
      </div>

      {/* МОДАЛКА ЗАЯВКИ */}
      {selectedComplaint && (
        <div className={styles.overlay} onClick={() => setSelectedComplaint(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Заявка: {selectedComplaint.typeLabel}</h2>
            <div className={styles.modalInfo}><b>Водомат:</b> {selectedComplaint.machineAddress}</div>
            <div className={styles.modalInfo}><b>Заявитель:</b> {selectedComplaint.userName || 'Аноним'}</div>
            {selectedComplaint.userPhone && <div className={styles.modalInfo}><b>Телефон:</b> {selectedComplaint.userPhone}</div>}
            {selectedComplaint.comment && <div className={styles.modalInfo}><b>Комментарий:</b> {selectedComplaint.comment}</div>}
            {selectedComplaint.photoUrl && <img src={`http://localhost:5000${selectedComplaint.photoUrl}`} className={styles.photo} alt="фото" />}
            <div className={styles.formGroup}>
              <label>Статус</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option value="new">Новая</option>
                <option value="inProgress">В работе</option>
                <option value="resolved">Решена</option>
                <option value="rejected">Отклонена</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Комментарий администратора</label>
              <textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} rows={3} placeholder="Введите ответ заявителю..." />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleUpdateComplaint}>💾 Сохранить</button>
              <button className={styles.btnSecondary} onClick={() => setSelectedComplaint(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ВОДОМАТА С КАРТОЙ */}
      {showMachineModal && (
        <div className={styles.overlay} onClick={() => setShowMachineModal(false)}>
          <div className={styles.modalWide} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{machineModalMode === 'create' ? '+ Добавить водомат' : '✏️ Редактировать водомат'}</h2>

            <div className={styles.machineModalBody}>
              {/* Левая часть — форма */}
              <div className={styles.machineForm}>
                <div className={styles.formGroup}>
                  <label>Адрес <span className={styles.hint}>(заполняется автоматически при клике на карту)</span></label>
                  <input type="text" value={machineForm.address} placeholder="г.Оренбург ул.Советская, 48"
                    onChange={e => setMachineForm(prev => ({ ...prev, address: e.target.value }))} />
                </div>
                <div className={styles.coordRow}>
                  <div className={styles.formGroup}>
                    <label>Широта</label>
                    <input type="text" value={machineForm.latitude} placeholder="51.768" readOnly className={styles.readonlyInput} />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Долгота</label>
                    <input type="text" value={machineForm.longitude} placeholder="55.097" readOnly className={styles.readonlyInput} />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label>Часы работы</label>
                  <input type="text" value={machineForm.workingHours}
                    onChange={e => setMachineForm(prev => ({ ...prev, workingHours: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label>Телефон</label>
                  <input type="text" value={machineForm.phone}
                    onChange={e => setMachineForm(prev => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label>Цена воды</label>
                  <input type="text" value={machineForm.waterPrice}
                    onChange={e => setMachineForm(prev => ({ ...prev, waterPrice: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label>Способы оплаты (через запятую)</label>
                  <input type="text" value={machineForm.paymentMethods} placeholder="cash,card,qr"
                    onChange={e => setMachineForm(prev => ({ ...prev, paymentMethods: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label>Статус</label>
                  <select value={machineForm.status} onChange={e => setMachineForm(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="working">Работает</option>
                    <option value="maintenance">На обслуживании</option>
                    <option value="problem">Есть проблема</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Последнее обслуживание</label>
                  <input type="date" value={machineForm.lastMaintenance}
                    onChange={e => setMachineForm(prev => ({ ...prev, lastMaintenance: e.target.value }))} />
                </div>
                <div className={styles.formGroup}>
                  <label>Фото водомата</label>
                  <div
                    onClick={() => machinePhotoInputRef.current?.click()}
                    style={{
                      width: '100%', height: '140px', border: '2px dashed #e2e8f0',
                      borderRadius: '10px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
                      background: '#f8fafc', position: 'relative'
                    }}
                  >
                    {machinePhotoPreview ? (
                      <img src={machinePhotoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '32px' }}>📷</div>
                        <div style={{ fontSize: '13px', marginTop: '8px' }}>Нажмите чтобы выбрать фото</div>
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>JPG, PNG до 5MB</div>
                      </div>
                    )}
                  </div>
                  <input
                    ref={machinePhotoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={handleMachinePhotoChange}
                  />
                </div>

              </div>

              {/* Правая часть — карта */}
              <div className={styles.mapPickerWrap}>
                <div className={styles.mapPickerHint}>📍 Кликните на карту чтобы выбрать место</div>
                <div ref={mapPickerRef} className={styles.mapPicker} />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleSaveMachine}
                disabled={!machineForm.latitude || !machineForm.longitude || uploadingMachinePhoto}>
                {uploadingMachinePhoto ? '⏳ Загрузка фото...' : '💾 Сохранить'}
              </button>
              <button className={styles.btnSecondary} onClick={() => setShowMachineModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА ПОЛЬЗОВАТЕЛЯ */}
      {showUserModal && selectedUser && (
        <div className={styles.overlay} onClick={() => setShowUserModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Редактировать пользователя</h2>
            {[{ label: 'Имя', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Телефон', key: 'phone' }].map(f => (
              <div key={f.key} className={styles.formGroup}>
                <label>{f.label}</label>
                <input type="text" value={(userForm as any)[f.key]}
                  onChange={e => setUserForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
              </div>
            ))}
            <div className={styles.formGroup}>
              <label>Роль</label>
              <select value={userForm.role} onChange={e => setUserForm(prev => ({ ...prev, role: e.target.value }))}>
                <option value="user">Пользователь</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleSaveUser}>💾 Сохранить</button>
              <button className={styles.btnSecondary} onClick={() => setShowUserModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛКА СБРОСА ПАРОЛЯ */}
      {showResetModal && resetUser && (
        <div className={styles.overlay} onClick={() => setShowResetModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Сброс пароля</h2>
            <div className={styles.modalInfo}>Пользователь: <b>{resetUser.name}</b></div>
            <div className={styles.formGroup}>
              <label>Новый пароль</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Минимум 6 символов" />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleResetPassword}>🔑 Сбросить</button>
              <button className={styles.btnSecondary} onClick={() => setShowResetModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminPage;
