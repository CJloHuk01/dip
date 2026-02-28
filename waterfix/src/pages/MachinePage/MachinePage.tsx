import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../../components/Header/Header';
import ComplaintModal from '../../components/ComplaintModal/ComplaintModal';
import styles from './MachinePage.module.css';

declare global {
  interface Window {
    ymaps: any;
  }
}

const MOCK_MACHINES: Record<number, any> = {
  1: {
    id: 1,
    address: "ул. Советская, 48 (ост. Драмтеатр)",
    status: "working",
    coordinates: [51.768, 55.097],
    photo: null,
    workingHours: "Круглосуточно",
    phone: "+7 (3532) 77-77-77",
    paymentMethods: ["Наличные", "Карта", "QR-код"],
    waterPrice: "5 ₽/литр",
    lastMaintenance: "2024-02-15",
    complaints: [
      {
        id: 101,
        type: "money",
        typeLabel: "Зажевало деньги",
        date: "2024-02-20",
        status: "resolved",
        comment: "Вернули деньги через 10 минут"
      },
      {
        id: 102,
        type: "water",
        typeLabel: "Не наливает воду",
        date: "2024-02-18",
        status: "inProgress",
        comment: "Мастер уже в пути"
      }
    ]
  },
  2: {
    id: 2,
    address: "пр-т Победы, 156 (ТРК Север)",
    status: "maintenance",
    coordinates: [51.813, 55.137],
    photo: null,
    workingHours: "08:00 - 23:00",
    phone: "+7 (3532) 88-88-88",
    paymentMethods: ["Карта", "QR-код"],
    waterPrice: "6 ₽/литр",
    lastMaintenance: "2024-02-10",
    complaints: [
      {
        id: 103,
        type: "change",
        typeLabel: "Не даёт сдачу",
        date: "2024-02-19",
        status: "new",
        comment: "Купюры принимает, сдачу не выдаёт"
      }
    ]
  },
  3: {
    id: 3,
    address: "ул. Терешковой, 255 (ост. Телецентр)",
    status: "problem",
    coordinates: [51.791, 55.115],
    photo: null,
    workingHours: "Круглосуточно",
    phone: "+7 (3532) 99-99-99",
    paymentMethods: ["Наличные", "Карта"],
    waterPrice: "5 ₽/литр",
    lastMaintenance: "2024-02-01",
    complaints: [
      {
        id: 104,
        type: "screen",
        typeLabel: "Сломан экран",
        date: "2024-02-21",
        status: "new",
        comment: "Ничего не видно на экране"
      },
      {
        id: 105,
        type: "money",
        typeLabel: "Зажевало деньги",
        date: "2024-02-15",
        status: "rejected",
        comment: "Проверьте купюры"
      }
    ]
  }
};

function MachinePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [machine, setMachine] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      if (id && MOCK_MACHINES[parseInt(id)]) {
        setMachine(MOCK_MACHINES[parseInt(id)]);
      }
      setLoading(false);
    }, 500);
  }, [id]);

  useEffect(() => {
    if (!machine || mapInstanceRef.current) return;

    if (window.ymaps) {
      window.ymaps.ready(initMap);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=74d33273-ff0c-43df-a5f5-f2ad8e1848a1&lang=ru_RU';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.ymaps.ready(initMap);
    };

    script.onerror = () => {
      setMapError('Не удалось загрузить карту');
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [machine]);

  const initMap = () => {
    if (!mapRef.current || !window.ymaps || !machine) return;

    try {
      mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
        center: machine.coordinates,
        zoom: 16,
        controls: ['zoomControl']
      });

      const placemark = new window.ymaps.Placemark(machine.coordinates, {
        hintContent: machine.address,
        balloonContent: `
          <div style="padding: 8px;">
            <strong>${machine.address}</strong><br>
            ${getStatusText(machine.status)}
          </div>
        `
      }, {
        preset: `islands#${machine.status === 'working' ? 'green' : machine.status === 'maintenance' ? 'yellow' : 'red'}Icon`,
        iconColor: machine.status === 'working' ? '#4CAF50' : machine.status === 'maintenance' ? '#FFC107' : '#F44336'
      });

      mapInstanceRef.current.geoObjects.add(placemark);
    } catch (error) {
      console.error('Ошибка при создании карты:', error);
      setMapError('Ошибка при создании карты');
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  const handleOpenComplaint = () => {
    setIsComplaintModalOpen(true);
  };

  const handleCloseComplaint = () => {
    setIsComplaintModalOpen(false);
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      working: '✅ Работает',
      maintenance: '🟡 На обслуживании',
      problem: '❌ Есть проблема'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getStatusClass = (status: string) => {
    const classMap = {
      working: styles.statusWorking,
      maintenance: styles.statusMaintenance,
      problem: styles.statusProblem
    };
    return classMap[status as keyof typeof classMap] || '';
  };

  const getComplaintStatusText = (status: string) => {
    const statusMap = {
      new: 'Новая',
      inProgress: 'В работе',
      resolved: 'Решена',
      rejected: 'Отклонена'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  const getComplaintStatusClass = (status: string) => {
    const classMap = {
      new: styles.statusNew,
      inProgress: styles.statusInProgress,
      resolved: styles.statusResolved,
      rejected: styles.statusRejected
    };
    return classMap[status as keyof typeof classMap] || '';
  };

  const handleMapClick = () => {
    navigate(`/?center=${machine.coordinates[0]},${machine.coordinates[1]}&zoom=17`);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.loading}>Загрузка информации...</div>
          </div>
        </div>
      </>
    );
  }

  if (!machine) {
    return (
      <>
        <Header />
        <div className={styles.page}>
          <div className={styles.container}>
            <div className={styles.error}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>😕</div>
              <h2>Водомат не найден</h2>
              <button 
                className={styles.backButton}
                onClick={handleGoBack}
                style={{ marginTop: '24px' }}
              >
                ← Вернуться на карту
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={styles.page}>
        <div className={styles.container}>
          <button className={styles.backButton} onClick={handleGoBack}>
            ← Вернуться на карту
          </button>

          <div className={styles.machineCard}>
            <div className={styles.machineImage}>
              <span>📷</span>
              <div className={`${styles.machineStatus} ${getStatusClass(machine.status)}`}>
                {getStatusText(machine.status)}
              </div>
            </div>

            <div className={styles.machineInfo}>
              <h1 className={styles.machineTitle}>Водомат</h1>
              <div className={styles.machineAddress}>
                <span>📍</span> {machine.address}
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>⏰</span>
                  <div className={styles.infoContent}>
                    <div className={styles.infoLabel}>Часы работы</div>
                    <div className={styles.infoValue}>{machine.workingHours}</div>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>📞</span>
                  <div className={styles.infoContent}>
                    <div className={styles.infoLabel}>Телефон поддержки</div>
                    <div className={styles.infoValue}>{machine.phone}</div>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>💳</span>
                  <div className={styles.infoContent}>
                    <div className={styles.infoLabel}>Способы оплаты</div>
                    <div className={styles.infoValue}>
                      {machine.paymentMethods.join(' • ')}
                    </div>
                  </div>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>💧</span>
                  <div className={styles.infoContent}>
                    <div className={styles.infoLabel}>Цена воды</div>
                    <div className={styles.infoValue}>{machine.waterPrice}</div>
                  </div>
                </div>
              </div>

              <button 
                className={styles.complaintBtn}
                onClick={handleOpenComplaint}
              >
                ⚠️ Сообщить о проблеме
              </button>

              <div className={styles.sectionTitle}>
                Последние жалобы
                <span>Всего: {machine.complaints.length}</span>
              </div>

              {machine.complaints.length > 0 ? (
                <div className={styles.complaintsList}>
                  {machine.complaints.map((complaint: any) => (
                    <div key={complaint.id} className={styles.complaintItem}>
                      <div className={styles.complaintLeft}>
                        <div className={styles.complaintType}>
                          {complaint.typeLabel}
                        </div>
                        <div className={styles.complaintDate}>
                          {new Date(complaint.date).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <div className={styles.complaintRight}>
                        <span className={`${styles.complaintStatus} ${getComplaintStatusClass(complaint.status)}`}>
                          {getComplaintStatusText(complaint.status)}
                        </span>
                        <span className={styles.complaintArrow}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noComplaints}>
                  <div className={styles.noComplaintsIcon}>✅</div>
                  <div>Жалоб пока нет</div>
                  <div style={{ fontSize: '14px', marginTop: '8px' }}>
                    Будьте первым, кто сообщит о проблеме
                  </div>
                </div>
              )}

              <div className={styles.sectionTitle}>
                Расположение
              </div>
              
              {mapError ? (
                <div className={styles.mapPreview} style={{ flexDirection: 'column', gap: '8px' }}>
                  <span>❌</span>
                  <span>{mapError}</span>
                </div>
              ) : (
                <div 
                  ref={mapRef} 
                  className={styles.mapPreview}
                  onClick={handleMapClick}
                  style={{ cursor: 'pointer' }}
                >
                  {!mapInstanceRef.current && (
                    <div style={{ textAlign: 'center' }}>
                      <span>🗺️ Загрузка карты...</span>
                    </div>
                  )}
                  <div className={styles.mapPreviewText}>
                    {machine.address}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ComplaintModal 
        isOpen={isComplaintModalOpen}
        onClose={handleCloseComplaint}
        machine={{
          id: machine.id,
          address: machine.address,
          status: machine.status,
          coordinates: machine.coordinates
        }}
      />
    </>
  );
}

export default MachinePage;