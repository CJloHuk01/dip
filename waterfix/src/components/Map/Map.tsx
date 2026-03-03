import { useState, useEffect } from 'react';
import RealMap from '../RealMap/RealMap';
import { useNavigate } from 'react-router-dom';
import Popup from '../Popup/Popup';
import ComplaintModal from '../ComplaintModal/ComplaintModal';
import styles from './Map.module.css';
import type { Marker } from '../../types';
import { machinesApi } from '../../api/api';

function Map() {
  const navigate = useNavigate();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintMachine, setComplaintMachine] = useState<Marker | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    machinesApi.getAll()
      .then(machines => {
        const mapped: Marker[] = machines.map(m => ({
          id: m.id as any,
          address: m.address,
          status: m.status,
          coordinates: [m.latitude, m.longitude],
        }));
        setMarkers(mapped);
      })
      .catch(err => console.error('Ошибка загрузки водоматов:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkerClick = (marker: Marker) => setSelectedMarker(marker);
  const handleClosePopup = () => setSelectedMarker(null);
  const handleDetails = (marker: Marker) => {setSelectedMarker(null);
    navigate(`/machine/${marker.id}`);
  }
  const handleOpenComplaint = (marker: Marker) => {
    setComplaintMachine(marker);
    setIsComplaintModalOpen(true);
  };
  const handleCloseComplaint = () => {
    setIsComplaintModalOpen(false);
    setComplaintMachine(null);
  };

  if (loading) {
    return <div className={styles.map} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
      Загрузка карты...
    </div>;
  }

  return (
    <div className={styles.map}>
      <RealMap markers={markers} onMarkerClick={handleMarkerClick} />

      {selectedMarker && (
        <Popup
          marker={selectedMarker}
          onClose={handleClosePopup}
          onDetails={handleDetails}
          onComplaint={handleOpenComplaint}
        />
      )}

      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={handleCloseComplaint}
        machine={complaintMachine}
      />
    </div>
  );
}

export default Map;
