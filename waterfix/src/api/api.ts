const API_URL = 'http://localhost:5000/api';

// Получить токен из localStorage
const getToken = () => localStorage.getItem('token');

// Базовый fetch с авторизацией
const request = async (path: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!data.success) throw new Error(data.error || 'Ошибка сервера');
  return data;
};

// Для загрузки файлов (без Content-Type чтобы браузер сам поставил boundary)
const uploadFile = async (path: string, file: File) => {
  const token = getToken();
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Ошибка загрузки');
  return data;
};

// ===== AUTH =====
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    // Сохраняем токен и пользователя
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('currentUser', JSON.stringify({ ...data.data.user, isAuth: true }));
    return data.data;
  },

  register: async (name: string, email: string, password: string, phone?: string) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, phone }),
    });
    localStorage.setItem('token', data.data.token);
    localStorage.setItem('currentUser', JSON.stringify({ ...data.data.user, isAuth: true }));
    return data.data;
  },

  me: async () => {
    const data = await request('/auth/me');
    return data.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  },
};

// ===== MACHINES =====
export const machinesApi = {
  getAll: async (params?: { status?: string; lat?: number; lng?: number; radius?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.lat) query.set('lat', String(params.lat));
    if (params?.lng) query.set('lng', String(params.lng));
    if (params?.radius) query.set('radius', String(params.radius));

    const data = await request(`/machines?${query}`);
    return data.data as Machine[];
  },

  getById: async (id: string) => {
    const data = await request(`/machines/${id}`);
    return data.data as Machine;
  },

  uploadPhoto: async (id: string, file: File) => {
    return uploadFile(`/machines/${id}/photo`, file);
  },
};

// ===== COMPLAINTS =====
export const complaintsApi = {
  create: async (complaint: {
    machineId: string;
    type: string;
    typeLabel: string;
    comment: string;
    userName?: string;
    userPhone?: string;
  }) => {
    const data = await request('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaint),
    });
    return data.data;
  },

  uploadPhoto: async (id: string, file: File) => {
    return uploadFile(`/complaints/${id}/photo`, file);
  },

  getMy: async () => {
    const data = await request('/users/complaints');
    return data.data;
  },
  getAll: async () => {
    const data = await request('/complaints');
    return data;
},
};

// ===== USERS =====
export const usersApi = {
  updateProfile: async (name: string, phone?: string) => {
    const data = await request('/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, phone }),
    });
    // Обновляем localStorage
    const current = JSON.parse(localStorage.getItem('currentUser') || '{}');
    localStorage.setItem('currentUser', JSON.stringify({ ...current, name, phone }));
    return data.data;
  },

  uploadAvatar: async (file: File) => {
    return uploadFile('/users/avatar', file);
  },
};

// ===== ТИПЫ =====
export interface Machine {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  status: 'working' | 'maintenance' | 'problem';
  photoUrl?: string;
  workingHours: string;
  phone: string;
  paymentMethods: string[];
  waterPrice: string;
  lastMaintenance: string;
  distance?: number;
}

export interface Complaint {
  id: string;
  machineId: string;
  machineAddress: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  type: string;
  typeLabel: string;
  comment: string;
  photoUrl?: string;
  status: 'new' | 'inProgress' | 'resolved' | 'rejected';
  adminComment?: string;
  createdAt: string;
  updatedAt: string;
}
