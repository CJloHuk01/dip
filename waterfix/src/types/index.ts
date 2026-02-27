export type MarkerStatus = 'working' | 'maintenance' | 'problem';

export interface Marker {
  id: number;
  address: string;
  status: MarkerStatus;
  coordinates?: [number, number];
}

export interface PopupProps {
  marker: Marker | null;
  onClose: () => void;
  onDetails: (marker: Marker) => void;
}

export interface MapMarkerProps {
  status: MarkerStatus;
  onClick: () => void;
}

export type AuthMode = 'login' | 'register' | 'success';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
}