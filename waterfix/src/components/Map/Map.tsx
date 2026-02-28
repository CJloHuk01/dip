import { useState } from 'react';
import RealMap from '../RealMap/RealMap';
import Popup from '../Popup/Popup';
import ComplaintModal from '../ComplaintModal/ComplaintModal';
import styles from './Map.module.css';
import type { Marker } from '../../types';

const MOCK_MARKERS: Marker[] = [
  { 
    id: 1, 
    address: "ул. Советская, 48 (ост. Драмтеатр)", 
    status: "working",
    coordinates: [51.768, 55.097]
  },
  { 
    id: 2, 
    address: "пр-т Победы, 156 (ТРК Север)", 
    status: "maintenance",
    coordinates: [51.813, 55.137]
  },
  { 
    id: 3, 
    address: "ул. Терешковой, 255 (ост. Телецентр)", 
    status: "problem",
    coordinates: [51.791, 55.115]
  },
  { 
    id: 4, 
    address: "ул. Чкалова, 35 (ост. Магазин Океан)", 
    status: "working",
    coordinates: [51.737, 55.058]
  },
  { 
    id: 5, 
    address: "ул. Брестская, 1 (24 школа)", 
    status: "working",
    coordinates: [51.795, 55.067]
  },
  { 
    id: 6, 
    address: "ул. Салмышская, 43 (ТРК Гулливер)", 
    status: "problem",
    coordinates: [51.824, 55.162]
  },
  { 
    id: 7, 
    address: "ул. Монтажников, 22 (Центральный рынок)", 
    status: "working",
    coordinates: [51.779, 55.108]
  },
  { 
    id: 8, 
    address: "ул. 60 лет Октября, 2Б (Локомотив)", 
    status: "maintenance",
    coordinates: [51.804, 55.122]
  },
  { 
    id: 9, 
    address: "ул. Джангильдина, 20 (ост. 24 микрорайон)", 
    status: "working",
    coordinates: [51.836, 55.155]
  },
  { 
    id: 10, 
    address: "пр-т Парковый, 5 (напротив Водоканала)", 
    status: "working",
    coordinates: [51.786, 55.068]
  },
];

function Map() {
  const [selectedMarker, setSelectedMarker] = useState<Marker | null>(null);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintMachine, setComplaintMachine] = useState<Marker | null>(null);

  const handleMarkerClick = (marker: Marker) => {
    setSelectedMarker(marker);
  };

  const handleClosePopup = () => {
    setSelectedMarker(null);
  };

  const handleDetails = (marker: Marker) => {
    console.log('Переход на страницу водомата:', marker);
    setSelectedMarker(null);
  };

  const handleOpenComplaint = (marker: Marker) => {
    setComplaintMachine(marker);
    setIsComplaintModalOpen(true);
  };

  const handleCloseComplaint = () => {
    setIsComplaintModalOpen(false);
    setComplaintMachine(null);
  };

  return (
    <div className={styles.map}>
      <RealMap 
        markers={MOCK_MARKERS}
        onMarkerClick={handleMarkerClick}
      />

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