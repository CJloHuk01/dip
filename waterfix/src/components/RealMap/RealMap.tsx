import { useEffect, useRef } from 'react';
import type { Marker } from '../../types';
import styles from './RealMap.module.css';

declare global {
  interface Window {
    ymaps: any;
  }
}

interface RealMapProps {
  markers: Marker[];
  onMarkerClick: (marker: Marker) => void;  
}

function RealMap({ markers, onMarkerClick }: RealMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const placemarksRef = useRef<any[]>([]);

  useEffect(() => {
    if (window.ymaps) {
      window.ymaps.ready(initMap);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=2ff0fabd-cd5c-4172-98c0-d8194364fa00&lang=ru_RU';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      window.ymaps.ready(initMap);
    };

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const initMap = () => {
    if (!mapRef.current || !window.ymaps) return;
    if (mapInstanceRef.current) return;

    mapInstanceRef.current = new window.ymaps.Map(mapRef.current, {
      center: [51.768, 55.097],
      zoom: 12,
      controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
    });

    updateMarkers();
  };

  const updateMarkers = () => {
    if (!mapInstanceRef.current || !window.ymaps) return;
    placemarksRef.current.forEach(placemark => {
      mapInstanceRef.current.geoObjects.remove(placemark);
    });
    placemarksRef.current = [];
    markers.forEach((marker) => {
      if (!marker.coordinates) return;

      const color = {
        working: 'green',
        maintenance: 'yellow',
        problem: 'red'
      }[marker.status];

      const placemark = new window.ymaps.Placemark(marker.coordinates, {
        hintContent: marker.address,
        balloonContent: `
          <div class="ymaps-balloon">
            <strong>${marker.address}</strong><br>
            <span style="color: ${color === 'green' ? '#4CAF50' : color === 'yellow' ? '#FFC107' : '#F44336'}">
              ${getStatusText(marker.status)}
            </span>
          </div>
        `
      }, {
        preset: `islands#${color}Icon`,
        openBalloonOnClick: false
      });

      placemark.events.add('click', () => {
        onMarkerClick(marker);
      });

      mapInstanceRef.current.geoObjects.add(placemark);
      placemarksRef.current.push(placemark);
    });

    if (placemarksRef.current.length > 0) {
      mapInstanceRef.current.setBounds(
        mapInstanceRef.current.geoObjects.getBounds(),
        { checkZoomRange: true, zoomMargin: 50 }
      );
    }
  };

  const getStatusText = (status: string) => {
    const statusMap = {
      working: '✅ Работает',
      maintenance: '🟡 На обслуживании',
      problem: '❌ Есть проблема'
    };
    return statusMap[status as keyof typeof statusMap] || status;
  };

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers();
    }
  }, [markers]);

  return <div ref={mapRef} className={styles.map} />;
}

export default RealMap;