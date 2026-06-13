import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header/Header';
import ComplaintModal from '../../components/ComplaintModal/ComplaintModal';
import styles from './MachinePage.module.css';
import { machinesApi, type Machine } from '../../api/api';

declare global {
  interface Window { ymaps: any; }
}

function MachinePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [machine, setMachine] = useState<Machine & { complaints?: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    machinesApi.getById(id)
      .then(data => setMachine({ ...data, complaints: [] }))
      .catch(() => setMachine(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !machine) return;
    fetch(`http://localhost:5000/api/complaints?machineId=${id}&limit=10`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setMachine(prev => prev ? { ...prev, complaints: data.data || [] } : prev);
        }
      })
      .catch(() => {});
  }, [id, machine?.id]);

  useEffect(() => {
    if (!machine || mapInstanceRef.current) return;
    if (window.ymaps) { window.ymaps.ready(initMap); return; }
    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=74d33273-ff0c-43df-a5f5-f2ad8e1848a1&lang=ru_RU';
    script.async = true;
    document.body.appendChild(script);
    script.onload = () => window.ymaps.ready(initMap);
    script.onerror = () => setMapError('Не удалось загрузить карту');
    return () => { if (script.parentNode) script.parentNode.removeChild(script); };
  }, [machine]);

  const initMap = () => {
    if (!mapRef.current || !window.ymaps || !machine) return;
    try {
      const coords = [machine.latitude, machine.longitude];
      mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
        center: coords, zoom: 16, controls: ['zoomControl']
      });
      const placemark = new window.ymaps.Placemark(coords, {
        hintContent: machine.address,
        balloonContent: `<div style="padding:8px"><strong>${machine.address}</strong><br>${getStatusText(machine.status)}</div>`
      }, {
        preset: `islands#${machine.status === 'working' ? 'green' : machine.status === 'maintenance' ? 'yellow' : 'red'}Icon`
      });
      mapInstanceRef.current.geoObjects.add(placemark);
    } catch {
      setMapError('Ошибка при создании карты');
    }
  };

  const getStatusText = (s: string) => ({ working: '✅ Работает', maintenance: '🟡 На обслуживании', problem: '❌ Есть проблема' }[s] || s);
  const getStatusClass = (s: string) => ({ working: styles.statusWorking, maintenance: styles.statusMaintenance, problem: styles.statusProblem }[s] || '');
  const getComplaintStatusText = (s: string) => ({ new: 'Новая', inProgress: 'В работе', resolved: 'Решена', rejected: 'Отклонена' }[s] || s);
  const getComplaintStatusClass = (s: string) => ({ new: styles.statusNew, inProgress: styles.statusInProgress, resolved: styles.statusResolved, rejected: styles.statusRejected }[s] || '');
  const isAdmin = JSON.parse(localStorage.getItem('currentUser') || '{}')?.role === 'admin';

  if (loading) return (<><Header /><div className={styles.page}><div className={styles.container}><div className={styles.loading}>Загрузка информации...</div></div></div></>);

  if (!machine) return (
    <><Header /><div className={styles.page}><div className={styles.container}>
      <div className={styles.error}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
        <h2>Водомат не найден</h2>
        <button className={styles.backButton} onClick={() => navigate('/')} style={{ marginTop: '24px' }}>← Вернуться на карту</button>
      </div>
    </div></div></>
  );

  const complaints = machine.complaints || [];

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <button className={styles.backButton} onClick={() => navigate('/')}>← Вернуться на карту</button>

          {/* Новый layout: верх — заголовок + статус, середина — инфо слева + фото справа */}
          <div className={styles.machineCard}>

  <div className={styles.machineHeader}>
    <div>
      <h1 className={styles.machineTitle}>Водомат</h1>
      <div className={styles.machineAddress}>
        <span>📍</span> {machine.address}
      </div>
    </div>

    <div
      className={`${styles.machineStatusBadge} ${getStatusClass(machine.status)}`}
    >
      {getStatusText(machine.status)}
    </div>
  </div>

  <div className={styles.machineBody}>

    {/* Левая часть */}
    <div className={styles.machineInfo}>

      <div className={styles.infoGrid}>

        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>⏰</span>
          <div className={styles.infoContent}>
            <div className={styles.infoLabel}>Часы работы</div>
            <div className={styles.infoValue}>
              {machine.workingHours}
            </div>
          </div>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>📞</span>
          <div className={styles.infoContent}>
            <div className={styles.infoLabel}>
              Телефон поддержки
            </div>
            <div className={styles.infoValue}>
              {machine.phone}
            </div>
          </div>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>💳</span>
          <div className={styles.infoContent}>
            <div className={styles.infoLabel}>
              Способы оплаты
            </div>
            <div className={styles.infoValue}>
              {machine.paymentMethods.join(' • ')}
            </div>
          </div>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.infoIcon}>💧</span>
          <div className={styles.infoContent}>
            <div className={styles.infoLabel}>Цена воды</div>
            <div className={styles.infoValue}>
              {machine.waterPrice}
            </div>
          </div>
        </div>

      </div>

      <div className={styles.sectionTitle}>
        Последние жалобы
        <span>Всего: {complaints.length}</span>
      </div>

      {complaints.length > 0 ? (
        <div className={styles.complaintsList}>
          {complaints.map((complaint: any) => (
            <div
              key={complaint.id}
              className={styles.complaintItem}
            >
              <div className={styles.complaintLeft}>
                <div className={styles.complaintType}>
                  {complaint.typeLabel}
                </div>

                <div className={styles.complaintDate}>
                  {new Date(
                    complaint.createdAt
                  ).toLocaleDateString('ru-RU')}
                </div>
              </div>

              <div className={styles.complaintRight}>
                <span
                  className={`${styles.complaintStatus} ${getComplaintStatusClass(
                    complaint.status
                  )}`}
                >
                  {getComplaintStatusText(
                    complaint.status
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.noComplaints}>
          <div className={styles.noComplaintsIcon}>
            ✅
          </div>
          <div>Жалоб пока нет</div>
        </div>
      )}

    </div>

    {/* Правая часть - Фото */}
    <div className={styles.machinePhotoSection}>
      {machine.photoUrl ? (
        <img
          src={`http://localhost:5000${machine.photoUrl}`}
          alt="Водомат"
          className={styles.machinePhoto}
        />
      ) : (
        <div className={styles.machineNoPhoto}>
          <span style={{ fontSize: '64px' }}>
            💧
          </span>

          <div
            style={{
              marginTop: '12px',
              color: '#94a3b8',
              fontSize: '14px'
            }}
          >
            Фото не добавлено
          </div>
        </div>
      )}
    </div>

  </div>

  {/* Кнопка подать жалобу */}
  {!isAdmin && (
    <button
      className={styles.complaintBtn}
      onClick={() => setIsComplaintModalOpen(true)}
    >
      ⚠️ Сообщить о проблеме
    </button>
  )}

  {/* Карта */}
  <div className={styles.sectionTitle}>
    Расположение
  </div>

  {mapError ? (
    <div className={styles.mapPreview}>
      <span>❌</span>
      <span>{mapError}</span>
    </div>
  ) : (
    <div
      ref={mapRef}
      className={styles.mapPreview}
    >
      {!mapInstanceRef.current && (
        <div style={{ textAlign: 'center' }}>
          <span>🗺️ Загрузка карты...</span>
        </div>
      )}
    </div>
  )}

</div>
        </div>
      </div>

      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        machine={{ id: machine.id as any, address: machine.address, status: machine.status, coordinates: [machine.latitude, machine.longitude] }}
      />
    </>
  );
}
export default MachinePage;