/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header/Header';
import StatsTab from '../../components/StatsTab/StatsTab';
import styles from './AdminPage.module.css';
import {
  ApiError,
  adminApi,
  type Admin,
  type AdminComplaint,
  type AdminMachine,
  type MachinePayload,
} from '../../api/api';
import { API_ORIGIN } from '../../api/config';
import { toDataURL, toString as qrToString } from 'qrcode';

declare global {
  interface Window {
    ymaps?: any;
  }
}

type Tab = 'complaints' | 'machines' | 'stats';

const STATUS_LABELS: Record<string, string> = {
  new: 'Новая',
  inProgress: 'В работе',
  resolved: 'Решена',
  rejected: 'Отклонена',
};

const MACHINE_STATUS_LABELS: Record<string, string> = {
  working: 'Работает',
  maintenance: 'Обслуживание',
  problem: 'Проблема',
};

const CONTACT_LABELS: Record<string, string> = {
  phone: 'Телефон',
  email: 'Email',
  telegram: 'Telegram',
  vk: 'VK',
  max: 'MAX',
  other: 'Другое',
};

const today = () => new Date().toISOString().split('T')[0];

const emptyMachineForm = () => ({
  address: '',
  latitude: '',
  longitude: '',
  workingHours: 'Круглосуточно',
  status: 'working',
  phone: '+7',
  waterPrice: '5 руб/л',
  paymentMethods: 'cash,card',
  lastMaintenance: today(),
});

function mediaSrc(url: string) {
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
}

function contactHref(type: string, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (type === 'phone') return `tel:${trimmed.replace(/[^\d+]/g, '')}`;
  if (type === 'email') return `mailto:${trimmed}`;
  if (type === 'telegram') {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://t.me/${trimmed.replace(/^@/, '')}`;
  }
  if (type === 'vk') {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://vk.com/${trimmed.replace(/^@/, '')}`;
  }
  if (type === 'max' && /^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

function loadYmaps(apiKey: string): Promise<void> {
  if (window.ymaps) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-ymaps]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Карта не загрузилась')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`;
    script.async = true;
    script.dataset.ymaps = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Карта не загрузилась'));
    document.body.appendChild(script);
  });
}

function AdminPage() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<Tab>('complaints');
  const [notice, setNotice] = useState('');

  const [complaints, setComplaints] = useState<AdminComplaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<AdminComplaint | null>(null);
  const [newStatus, setNewStatus] = useState('new');
  const [adminComment, setAdminComment] = useState('');
  const [savingComplaint, setSavingComplaint] = useState(false);

  const [machines, setMachines] = useState<AdminMachine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [machineMode, setMachineMode] = useState<'create' | 'edit'>('create');
  const [editingMachine, setEditingMachine] = useState<AdminMachine | null>(null);
  const [machineForm, setMachineForm] = useState(emptyMachineForm);
  const [machinePhotoFile, setMachinePhotoFile] = useState<File | null>(null);
  const [machinePhotoPreview, setMachinePhotoPreview] = useState('');
  const [savingMachine, setSavingMachine] = useState(false);
  const [machineError, setMachineError] = useState('');

  const [qrMachine, setQrMachine] = useState<AdminMachine | null>(null);
  const [qrPng, setQrPng] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [regenerating, setRegenerating] = useState(false);

  const mapPickerRef = useRef<HTMLDivElement>(null);
  const mapPickerInstance = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const initialCoordsRef = useRef({ lat: '', lng: '' });

  useEffect(() => {
    let cancelled = false;
    adminApi.me()
      .then(data => { if (!cancelled) setAdmin(data); })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          navigate('/admin/login', { replace: true });
        } else {
          setAuthError('Не удалось проверить сессию. Обновите страницу.');
        }
      })
      .finally(() => { if (!cancelled) setAuthLoading(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadComplaints = async () => {
    setComplaintsLoading(true);
    try {
      const data = await adminApi.listComplaints(statusFilter || undefined);
      setComplaints(data.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/admin/login', { replace: true });
      } else {
        setNotice(err instanceof Error ? err.message : 'Ошибка загрузки заявок');
      }
    } finally {
      setComplaintsLoading(false);
    }
  };

  const loadMachines = async () => {
    setMachinesLoading(true);
    try {
      setMachines(await adminApi.listMachines());
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Ошибка загрузки водоматов');
    } finally {
      setMachinesLoading(false);
    }
  };

  useEffect(() => {
    if (!admin) return;
    if (tab === 'complaints') loadComplaints();
    if (tab === 'machines') loadMachines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, tab, statusFilter]);

  useEffect(() => {
    return () => {
      if (machinePhotoPreview) URL.revokeObjectURL(machinePhotoPreview);
    };
  }, [machinePhotoPreview]);

  // Карта в модалке добавления/редактирования
  useEffect(() => {
    if (!showMachineModal) {
      if (mapPickerInstance.current) {
        mapPickerInstance.current.destroy();
        mapPickerInstance.current = null;
        placemarkRef.current = null;
      }
      return;
    }

    const apiKey = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined;
    if (!apiKey) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      loadYmaps(apiKey)
        .then(() => {
          if (cancelled) return;
          const ymaps = window.ymaps;
          if (!ymaps || !mapPickerRef.current || mapPickerInstance.current) return;

          const init = () => {
            if (!mapPickerRef.current || mapPickerInstance.current) return;
            const startLat = parseFloat(initialCoordsRef.current.lat) || 51.768;
            const startLng = parseFloat(initialCoordsRef.current.lng) || 55.097;

            mapPickerInstance.current = new ymaps.Map(mapPickerRef.current, {
              center: [startLat, startLng],
              zoom: 13,
              controls: ['zoomControl'],
            });

            if (initialCoordsRef.current.lat && initialCoordsRef.current.lng) {
              placemarkRef.current = new ymaps.Placemark([startLat, startLng], {}, {
                preset: 'islands#blueWaterCircleIcon',
              });
              mapPickerInstance.current.geoObjects.add(placemarkRef.current);
            }

            mapPickerInstance.current.events.add('click', (event: any) => {
              const coords = event.get('coords');
              const lat = coords[0].toFixed(6);
              const lng = coords[1].toFixed(6);
              setMachineForm(prev => ({ ...prev, latitude: lat, longitude: lng }));

              if (placemarkRef.current) {
                placemarkRef.current.geometry.setCoordinates(coords);
              } else {
                placemarkRef.current = new ymaps.Placemark(coords, {}, {
                  preset: 'islands#blueWaterCircleIcon',
                });
                mapPickerInstance.current.geoObjects.add(placemarkRef.current);
              }

              ymaps.geocode(coords).then((result: any) => {
                const first = result.geoObjects.get(0);
                if (first) {
                  setMachineForm(prev => ({ ...prev, address: first.getAddressLine() }));
                }
              });
            });
          };

          ymaps.ready(init);
        })
        .catch(() => setMachineError('Не удалось загрузить карту. Укажите координаты вручную.'));
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [showMachineModal]);

  const openComplaint = (complaint: AdminComplaint) => {
    setSelectedComplaint(complaint);
    setNewStatus(complaint.status);
    setAdminComment(complaint.adminComment ?? '');
  };

  const saveComplaint = async () => {
    if (!selectedComplaint) return;
    setSavingComplaint(true);
    try {
      await adminApi.updateComplaint(selectedComplaint.id, newStatus, adminComment);
      setSelectedComplaint(null);
      setNotice('Заявка обновлена');
      loadComplaints();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingComplaint(false);
    }
  };

  const deleteComplaint = async () => {
    if (!selectedComplaint) return;
    if (!window.confirm('Удалить заявку и все её фото/видео? Действие необратимо.')) return;

    try {
      await adminApi.deleteComplaint(selectedComplaint.id);
      setSelectedComplaint(null);
      setNotice('Заявка удалена');
      loadComplaints();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  const openCreateMachine = () => {
    setMachineMode('create');
    setEditingMachine(null);
    setMachineForm(emptyMachineForm());
    initialCoordsRef.current = { lat: '', lng: '' };
    setMachinePhotoFile(null);
    setMachinePhotoPreview('');
    setMachineError('');
    setShowMachineModal(true);
  };

  const openEditMachine = (machine: AdminMachine) => {
    setMachineMode('edit');
    setEditingMachine(machine);
    setMachineForm({
      address: machine.address,
      latitude: String(machine.latitude),
      longitude: String(machine.longitude),
      workingHours: machine.workingHours,
      status: machine.status,
      phone: machine.phone,
      waterPrice: machine.waterPrice,
      paymentMethods: machine.paymentMethods.join(','),
      lastMaintenance: machine.lastMaintenance.split('T')[0],
    });
    initialCoordsRef.current = { lat: String(machine.latitude), lng: String(machine.longitude) };
    setMachinePhotoFile(null);
    setMachinePhotoPreview('');
    setMachineError('');
    setShowMachineModal(true);
  };

  const handleMachinePhoto = (file: File | null) => {
    if (machinePhotoPreview) URL.revokeObjectURL(machinePhotoPreview);
    if (!file) {
      setMachinePhotoFile(null);
      setMachinePhotoPreview('');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setMachineError('Фото водомата должно быть изображением.');
      return;
    }
    setMachinePhotoFile(file);
    setMachinePhotoPreview(URL.createObjectURL(file));
  };

  const saveMachine = async () => {
    setMachineError('');
    const lat = Number(machineForm.latitude.replace(',', '.'));
    const lng = Number(machineForm.longitude.replace(',', '.'));

    if (!machineForm.address.trim()) {
      setMachineError('Укажите адрес водомата.');
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMachineError('Укажите координаты: нажмите на карту или введите широту и долготу.');
      return;
    }
    if (!machineForm.workingHours.trim() || !machineForm.phone.trim() || !machineForm.waterPrice.trim()) {
      setMachineError('Заполните часы работы, телефон и цену.');
      return;
    }

    const payload: MachinePayload = {
      address: machineForm.address.trim(),
      latitude: lat,
      longitude: lng,
      status: machineForm.status,
      workingHours: machineForm.workingHours.trim(),
      phone: machineForm.phone.trim(),
      paymentMethods: machineForm.paymentMethods.split(',').map(item => item.trim()).filter(Boolean),
      waterPrice: machineForm.waterPrice.trim(),
      lastMaintenance: new Date(`${machineForm.lastMaintenance}T00:00:00Z`).toISOString(),
    };

    setSavingMachine(true);
    try {
      const saved = editingMachine
        ? await adminApi.updateMachine(editingMachine.id, payload)
        : await adminApi.createMachine(payload);

      if (machinePhotoFile) {
        await adminApi.uploadMachinePhoto(saved.id, machinePhotoFile);
      }

      setShowMachineModal(false);
      setNotice(editingMachine ? 'Водомат обновлён' : 'Водомат добавлен');
      loadMachines();
    } catch (err) {
      setMachineError(err instanceof Error ? err.message : 'Не удалось сохранить водомат.');
    } finally {
      setSavingMachine(false);
    }
  };

  const deleteMachine = async (machine: AdminMachine) => {
    if (!window.confirm(`Удалить водомат «${machine.address}» вместе с его заявками?`)) return;
    try {
      await adminApi.deleteMachine(machine.id);
      setNotice('Водомат удалён');
      loadMachines();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  useEffect(() => {
    if (!qrMachine?.publicCode) {
      setQrPng('');
      setQrSvg('');
      setQrUrl('');
      return;
    }

    const url = `${window.location.origin}/r/${qrMachine.publicCode}`;
    setQrUrl(url);

    let cancelled = false;
    Promise.all([
      toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M' }),
      qrToString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M' }),
    ])
      .then(([png, svg]) => {
        if (!cancelled) {
          setQrPng(png);
          setQrSvg(svg);
        }
      })
      .catch(() => { if (!cancelled) setNotice('Не удалось сгенерировать QR-код'); });

    return () => { cancelled = true; };
  }, [qrMachine]);

  const regenerateCode = async () => {
    if (!qrMachine) return;
    if (!window.confirm('Старый QR-код перестанет работать. Сгенерировать новый код?')) return;

    setRegenerating(true);
    try {
      const updated = await adminApi.regenerateCode(qrMachine.id);
      setQrMachine(updated);
      setMachines(current => current.map(item => (item.id === updated.id ? updated : item)));
      setNotice('Новый QR-код создан');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Ошибка генерации кода');
    } finally {
      setRegenerating(false);
    }
  };

  const downloadPng = () => {
    if (!qrPng) return;
    const link = document.createElement('a');
    link.href = qrPng;
    link.download = `waterfix-qr-${qrMachine?.publicCode ?? 'code'}.png`;
    link.click();
  };

  const downloadSvg = () => {
    if (!qrSvg) return;
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `waterfix-qr-${qrMachine?.publicCode ?? 'code'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printQr = () => {
    if (!qrPng) return;
    const win = window.open('', '_blank', 'width=600,height=700');
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>QR ${qrMachine?.publicCode ?? ''}</title>`
      + '<style>body{font-family:Arial,sans-serif;text-align:center;padding:32px}'
      + 'img{width:320px;height:320px}h1{font-size:20px}p{color:#555}</style></head><body>'
      + `<h1>WaterFix</h1><p>${(qrMachine?.address ?? '').replace(/</g, '&lt;')}</p>`
      + `<img src="${qrPng}" alt="QR"><p>Отсканируйте, чтобы сообщить о проблеме</p>`
      + '</body></html>',
    );
    win.document.close();
    win.focus();
    win.print();
  };

  const copyQrLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setNotice('Ссылка скопирована');
    } catch {
      setNotice('Не удалось скопировать ссылку');
    }
  };

  const logout = async () => {
    try {
      await adminApi.logout();
    } finally {
      navigate('/admin/login', { replace: true });
    }
  };

  const counts = useMemo(() => ({
    new: complaints.filter(item => item.status === 'new').length,
    inProgress: complaints.filter(item => item.status === 'inProgress').length,
  }), [complaints]);

  if (authLoading) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.loading}>Проверяем доступ…</div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className={styles.page}>
        <Header />
        <div className={styles.loading}>{authError}</div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.container}>
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Админ-панель</h1>
            <p className={styles.subtitle}>{admin.email}</p>
          </div>
          <button type="button" className={styles.logoutBtn} onClick={logout}>Выйти</button>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'complaints' ? styles.tabActive : ''}`}
            onClick={() => setTab('complaints')}
          >
            📋 Заявки {counts.new > 0 && <span className={styles.tabBadge}>{counts.new}</span>}
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'machines' ? styles.tabActive : ''}`}
            onClick={() => setTab('machines')}
          >
            💧 Водоматы
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === 'stats' ? styles.tabActive : ''}`}
            onClick={() => setTab('stats')}
          >
            📊 Статистика
          </button>
        </div>

        {tab === 'complaints' && (
          <section className={styles.section}>
            <div className={styles.toolbar}>
              <select
                className={styles.filter}
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
              >
                <option value="">Все статусы</option>
                <option value="new">Новые</option>
                <option value="inProgress">В работе</option>
                <option value="resolved">Решены</option>
                <option value="rejected">Отклонены</option>
              </select>
              <button type="button" className={styles.btnSecondary} onClick={loadComplaints}>
                Обновить
              </button>
              <span className={styles.toolbarHint}>
                Новых: {counts.new} · В работе: {counts.inProgress}
              </span>
            </div>

            {complaintsLoading ? (
              <div className={styles.loading}>Загрузка заявок…</div>
            ) : complaints.length === 0 ? (
              <div className={styles.empty}>Заявок пока нет.</div>
            ) : (
              <div className={styles.list}>
                {complaints.map(complaint => (
                  <button
                    type="button"
                    key={complaint.id}
                    className={styles.complaintCard}
                    onClick={() => openComplaint(complaint)}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{complaint.typeLabel}</span>
                      <span className={`${styles.badge} ${styles[`status_${complaint.status}`] ?? ''}`}>
                        {STATUS_LABELS[complaint.status] ?? complaint.status}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>
                      💧 {complaint.machineAddress}
                      {complaint.machineCode ? ` · ${complaint.machineCode}` : ''}
                    </div>
                    {complaint.comment && <div className={styles.cardComment}>{complaint.comment}</div>}
                    <div className={styles.cardFooter}>
                      <span>{new Date(complaint.createdAt).toLocaleString('ru-RU')}</span>
                      <span>{complaint.media.length > 0 ? `📎 ${complaint.media.length}` : 'без файлов'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'machines' && (
          <section className={styles.section}>
            <div className={styles.toolbar}>
              <button type="button" className={styles.btnPrimary} onClick={openCreateMachine}>
                + Добавить водомат
              </button>
              <button type="button" className={styles.btnSecondary} onClick={loadMachines}>
                Обновить
              </button>
            </div>

            {machinesLoading ? (
              <div className={styles.loading}>Загрузка водоматов…</div>
            ) : machines.length === 0 ? (
              <div className={styles.empty}>Водоматов пока нет. Добавьте первый.</div>
            ) : (
              <div className={styles.list}>
                {machines.map(machine => (
                  <div key={machine.id} className={styles.machineCard}>
                    <div className={styles.machineMain}>
                      <div className={styles.cardHeader}>
                        <span className={styles.cardTitle}>{machine.address}</span>
                        <span className={`${styles.badge} ${styles[`machine_${machine.status}`] ?? ''}`}>
                          {MACHINE_STATUS_LABELS[machine.status] ?? machine.status}
                        </span>
                      </div>
                      <div className={styles.cardMeta}>
                        {machine.workingHours} · {machine.waterPrice} · {machine.phone}
                      </div>
                      <div className={styles.machineCode}>
                        Код: <code>{machine.publicCode ?? '—'}</code>
                      </div>
                    </div>
                    <div className={styles.machineActions}>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={() => setQrMachine(machine)}
                        disabled={!machine.publicCode}
                      >
                        QR-код
                      </button>
                      <button type="button" className={styles.btnSecondary} onClick={() => openEditMachine(machine)}>
                        Изменить
                      </button>
                      <button type="button" className={styles.btnDanger} onClick={() => deleteMachine(machine)}>
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'stats' && (
          <section className={styles.section}>
            <StatsTab />
          </section>
        )}
      </main>

      {selectedComplaint && (
        <div className={styles.overlay} onClick={() => setSelectedComplaint(null)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedComplaint.typeLabel}</h2>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрыть"
                onClick={() => setSelectedComplaint(null)}
              >
                ×
              </button>
            </div>

            <div className={styles.modalInfo}>
              <div><b>Водомат:</b> {selectedComplaint.machineAddress}</div>
              {selectedComplaint.machineCode && <div><b>Код:</b> {selectedComplaint.machineCode}</div>}
              <div><b>Дата:</b> {new Date(selectedComplaint.createdAt).toLocaleString('ru-RU')}</div>
              {selectedComplaint.reporterName && <div><b>Имя:</b> {selectedComplaint.reporterName}</div>}
              <div>
                <b>{CONTACT_LABELS[selectedComplaint.contactType] ?? 'Контакт'}:</b>{' '}
                {contactHref(selectedComplaint.contactType, selectedComplaint.contactValue) ? (
                  <a
                    href={contactHref(selectedComplaint.contactType, selectedComplaint.contactValue) ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.contactLink}
                  >
                    {selectedComplaint.contactValue}
                  </a>
                ) : (
                  selectedComplaint.contactValue
                )}
              </div>
              {selectedComplaint.comment && <div><b>Комментарий:</b> {selectedComplaint.comment}</div>}
              {selectedComplaint.privacyAcceptedAt && (
                <div className={styles.privacyNote}>
                  Согласие на обработку данных: {new Date(selectedComplaint.privacyAcceptedAt).toLocaleString('ru-RU')}
                  {selectedComplaint.privacyVersion ? ` (версия ${selectedComplaint.privacyVersion})` : ''}
                </div>
              )}
            </div>

            {selectedComplaint.media.length > 0 && (
              <div className={styles.mediaGrid}>
                {selectedComplaint.media.map(media => (
                  media.mediaType === 'video' ? (
                    <video
                      key={media.id}
                      className={styles.mediaVideo}
                      src={mediaSrc(media.url)}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <a
                      key={media.id}
                      href={mediaSrc(media.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mediaItem}
                    >
                      <img src={mediaSrc(media.url)} alt="Вложение к заявке" loading="lazy" />
                    </a>
                  )
                ))}
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="status">Статус</label>
              <select
                id="status"
                className={styles.select}
                value={newStatus}
                onChange={event => setNewStatus(event.target.value)}
              >
                <option value="new">Новая</option>
                <option value="inProgress">В работе</option>
                <option value="resolved">Решена</option>
                <option value="rejected">Отклонена</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="adminComment">Комментарий администратора</label>
              <textarea
                id="adminComment"
                className={styles.textarea}
                rows={3}
                maxLength={2000}
                value={adminComment}
                onChange={event => setAdminComment(event.target.value)}
              />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.btnPrimary} onClick={saveComplaint} disabled={savingComplaint}>
                {savingComplaint ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button type="button" className={styles.btnDanger} onClick={deleteComplaint}>
                Удалить заявку
              </button>
            </div>
          </div>
        </div>
      )}

      {showMachineModal && (
        <div className={styles.overlay} onClick={() => setShowMachineModal(false)}>
          <div className={`${styles.modal} ${styles.modalWide}`} onClick={event => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {machineMode === 'create' ? 'Новый водомат' : 'Редактировать водомат'}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрыть"
                onClick={() => setShowMachineModal(false)}
              >
                ×
              </button>
            </div>

            <div className={styles.machineModalBody}>
              <div className={styles.machineForm}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="address">Адрес</label>
                  <input
                    id="address"
                    className={styles.input}
                    value={machineForm.address}
                    onChange={event => setMachineForm(prev => ({ ...prev, address: event.target.value }))}
                    placeholder="ул. Ленина, 1"
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="lat">Широта</label>
                    <input
                      id="lat"
                      className={styles.input}
                      value={machineForm.latitude}
                      onChange={event => setMachineForm(prev => ({ ...prev, latitude: event.target.value }))}
                      placeholder="51.768000"
                      inputMode="decimal"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="lng">Долгота</label>
                    <input
                      id="lng"
                      className={styles.input}
                      value={machineForm.longitude}
                      onChange={event => setMachineForm(prev => ({ ...prev, longitude: event.target.value }))}
                      placeholder="55.097000"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="hours">Часы работы</label>
                    <input
                      id="hours"
                      className={styles.input}
                      value={machineForm.workingHours}
                      onChange={event => setMachineForm(prev => ({ ...prev, workingHours: event.target.value }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="phone">Телефон</label>
                    <input
                      id="phone"
                      className={styles.input}
                      value={machineForm.phone}
                      onChange={event => setMachineForm(prev => ({ ...prev, phone: event.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="price">Цена</label>
                    <input
                      id="price"
                      className={styles.input}
                      value={machineForm.waterPrice}
                      onChange={event => setMachineForm(prev => ({ ...prev, waterPrice: event.target.value }))}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="payments">Оплата (через запятую)</label>
                    <input
                      id="payments"
                      className={styles.input}
                      value={machineForm.paymentMethods}
                      onChange={event => setMachineForm(prev => ({ ...prev, paymentMethods: event.target.value }))}
                      placeholder="cash,card,qr"
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="machineStatus">Статус</label>
                    <select
                      id="machineStatus"
                      className={styles.select}
                      value={machineForm.status}
                      onChange={event => setMachineForm(prev => ({ ...prev, status: event.target.value }))}
                    >
                      <option value="working">Работает</option>
                      <option value="maintenance">Обслуживание</option>
                      <option value="problem">Проблема</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="maintenance">Последнее обслуживание</label>
                    <input
                      id="maintenance"
                      className={styles.input}
                      type="date"
                      value={machineForm.lastMaintenance}
                      onChange={event => setMachineForm(prev => ({ ...prev, lastMaintenance: event.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <span className={styles.label}>Фото водомата</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={event => handleMachinePhoto(event.target.files?.[0] ?? null)}
                  />
                  {(machinePhotoPreview || editingMachine?.photoUrl) && (
                    <img
                      className={styles.photoPreview}
                      src={machinePhotoPreview || `${API_ORIGIN}${editingMachine?.photoUrl ?? ''}`}
                      alt="Фото водомата"
                    />
                  )}
                </div>

                {machineError && <div className={styles.errorBox}>{machineError}</div>}

                <div className={styles.modalActions}>
                  <button type="button" className={styles.btnPrimary} onClick={saveMachine} disabled={savingMachine}>
                    {savingMachine ? 'Сохраняем…' : 'Сохранить'}
                  </button>
                  <button type="button" className={styles.btnSecondary} onClick={() => setShowMachineModal(false)}>
                    Отмена
                  </button>
                </div>
              </div>

              <div className={styles.mapPickerWrap}>
                <div ref={mapPickerRef} className={styles.mapPicker} />
                <p className={styles.hint}>
                  Нажмите на карту, чтобы выбрать точку — координаты и адрес заполнятся автоматически.
                  Если карта не загрузилась, введите координаты вручную.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {qrMachine && (
        <div className={styles.overlay} onClick={() => setQrMachine(null)}>
          <div className={styles.modal} onClick={event => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>QR-код водомата</h2>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрыть"
                onClick={() => setQrMachine(null)}
              >
                ×
              </button>
            </div>

            <p className={styles.modalInfo}>{qrMachine.address}</p>

            <div className={styles.qrBox}>
              {qrPng ? (
                <img className={styles.qrImage} src={qrPng} alt={`QR-код ${qrMachine.address}`} />
              ) : (
                <div className={styles.loading}>Генерируем QR…</div>
              )}
            </div>

            <div className={styles.qrUrl}>
              <code>{qrUrl}</code>
              <button type="button" className={styles.btnSecondary} onClick={copyQrLink}>Копировать</button>
            </div>

            <div className={styles.qrActions}>
              <button type="button" className={styles.btnPrimary} onClick={downloadPng} disabled={!qrPng}>
                Скачать PNG
              </button>
              <button type="button" className={styles.btnSecondary} onClick={downloadSvg} disabled={!qrSvg}>
                Скачать SVG
              </button>
              <button type="button" className={styles.btnSecondary} onClick={printQr} disabled={!qrPng}>
                Печать
              </button>
            </div>

            <div className={styles.qrDanger}>
              <button type="button" className={styles.btnDanger} onClick={regenerateCode} disabled={regenerating}>
                {regenerating ? 'Генерируем…' : 'Перегенерировать код'}
              </button>
              <span className={styles.hint}>Старый QR-код перестанет работать.</span>
            </div>
          </div>
        </div>
      )}

      {notice && <div className={styles.notice}>{notice}</div>}
    </div>
  );
}

export default AdminPage;
