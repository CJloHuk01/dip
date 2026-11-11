// Базовый адрес API.
// Пустое значение (по умолчанию) означает, что фронтенд и бэкенд
// раздаются с одного домена: запросы идут на /api этого же сайта.
const rawOrigin = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

export const API_ORIGIN = rawOrigin;
export const API_URL = `${API_ORIGIN}/api`;
