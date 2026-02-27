import styles from './MapMarker.module.css';
import type { MapMarkerProps } from '../../types';  

function MapMarker({ status, onClick }: MapMarkerProps) {
  const statusClass = {
    working: styles.working,
    maintenance: styles.maintenance,
    problem: styles.problem
  }[status] || styles.working;

  return (
    <div 
      className={`${styles.marker} ${statusClass}`}
      onClick={onClick}
    />
  );
}

export default MapMarker;