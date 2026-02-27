import { useNavigate } from 'react-router-dom';
import styles from './Popup.module.css';
import type { PopupProps } from '../../types';

interface ExtendedPopupProps extends PopupProps {
  onComplaint: (marker: any) => void;
}

function Popup({ marker, onClose, onComplaint }: ExtendedPopupProps) {
  const navigate = useNavigate();

  if (!marker) return null;

  const statusText = {
    working: 'Работает',
    maintenance: 'На обслуживании',
    problem: 'Есть проблема'
  }[marker.status];

  const statusClass = {
    working: styles.statusWorking,
    maintenance: styles.statusMaintenance,
    problem: styles.statusProblem
  }[marker.status];

  const handleDetails = () => {
    navigate(`/machine/${marker.id}`);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.address}>{marker.address}</div>
        <span className={statusClass}>{statusText}</span>
        
        <div className={styles.buttons}>
          <button 
            className={styles.detailsBtn}
            onClick={handleDetails}
          >
            Подробнее
          </button>
          <button 
            className={styles.complaintBtn}
            onClick={() => {
              onComplaint(marker);
              onClose();
            }}
          >
            ⚠️ Сообщить о проблеме
          </button>
        </div>
      </div>
    </div>
  );
}

export default Popup;