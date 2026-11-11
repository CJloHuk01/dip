import { API_URL } from './config';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: string;
  pagination?: Pagination;
}

async function raw<T>(path: string, options: RequestInit = {}): Promise<Envelope<T>> {
  const headers = new Headers(options.headers);

  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  let body: Envelope<T>;
  try {
    body = await response.json();
  } catch {
    throw new ApiError('Сервер вернул некорректный ответ', response.status);
  }

  if (!response.ok || body.success === false) {
    throw new ApiError(body.error || `Ошибка ${response.status}`, response.status);
  }

  return body;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await raw<T>(path, options)).data;
}

async function requestPaged<T>(path: string): Promise<{ data: T[]; pagination: Pagination }> {
  const body = await raw<T[]>(path);
  return {
    data: body.data,
    pagination: body.pagination ?? { page: 1, limit: body.data.length, total: body.data.length, pages: 1 },
  };
}

// === Типы ===

export interface PublicMachine {
  id: string;
  address: string;
  status: string;
  photoUrl?: string | null;
  workingHours: string;
  phone: string;
  waterPrice: string;
}

export interface ComplaintMedia {
  id: string;
  mediaType: 'photo' | 'video';
  contentType: string;
  sizeBytes: number;
  url: string;
}

export interface AdminComplaint {
  id: string;
  machineId: string;
  machineAddress: string;
  machineCode?: string | null;
  reporterName?: string | null;
  contactType: string;
  contactValue: string;
  type: string;
  typeLabel: string;
  comment: string;
  status: string;
  adminComment?: string | null;
  privacyAcceptedAt?: string | null;
  privacyVersion?: string | null;
  createdAt: string;
  updatedAt: string;
  media: ComplaintMedia[];
}

export interface AdminMachine {
  id: string;
  publicCode?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  photoUrl?: string | null;
  workingHours: string;
  phone: string;
  paymentMethods: string[];
  waterPrice: string;
  lastMaintenance: string;
  createdAt: string;
  updatedAt: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
}

export interface StatsData {
  cards: {
    total: number;
    newCount: number;
    inProgress: number;
    resolvedThisMonth: number;
    resolvedPercent: number;
    avgResolutionHours: number;
  };
  byStatus: { name: string; value: number; color: string }[];
  byDay: { date: string; count: number }[];
  topMachines: { address: string; count: number }[];
}

export interface MachinePayload {
  address: string;
  latitude: number;
  longitude: number;
  status: string;
  workingHours: string;
  phone: string;
  paymentMethods: string[];
  waterPrice: string;
  lastMaintenance: string;
}

// === Публичный API ===

export const publicApi = {
  getMachine(code: string) {
    return request<PublicMachine>(`/public/machines/${encodeURIComponent(code)}`);
  },

  createComplaint(formData: FormData) {
    return request<{ id: string; message: string }>('/public/complaints', {
      method: 'POST',
      body: formData,
    });
  },
};

// === Админский API ===

export const adminApi = {
  login(email: string, password: string) {
    return request<Admin>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout() {
    return request<null>('/admin/auth/logout', { method: 'POST' });
  },

  me() {
    return request<Admin>('/admin/auth/me');
  },

  listComplaints(status?: string) {
    const query = status ? `?status=${encodeURIComponent(status)}&limit=100` : '?limit=100';
    return requestPaged<AdminComplaint>(`/admin/complaints${query}`);
  },

  updateComplaint(id: string, status: string, adminComment?: string) {
    return request<AdminComplaint>(`/admin/complaints/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminComment }),
    });
  },

  deleteComplaint(id: string) {
    return request<null>(`/admin/complaints/${id}`, { method: 'DELETE' });
  },

  listMachines() {
    return request<AdminMachine[]>('/admin/machines');
  },

  createMachine(payload: MachinePayload) {
    return request<AdminMachine>('/admin/machines', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateMachine(id: string, payload: MachinePayload) {
    return request<AdminMachine>(`/admin/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteMachine(id: string) {
    return request<null>(`/admin/machines/${id}`, { method: 'DELETE' });
  },

  uploadMachinePhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return request<AdminMachine>(`/admin/machines/${id}/photo`, {
      method: 'POST',
      body: formData,
    });
  },

  regenerateCode(id: string) {
    return request<AdminMachine>(`/admin/machines/${id}/code/regenerate`, { method: 'POST' });
  },

  stats() {
    return request<StatsData>('/admin/stats');
  },
};
