import api from './axios';

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  // Send {} explicitly so the backend validate middleware receives an object, not undefined.
  // The actual refresh token comes from the httpOnly cookie, not the body.
  logout: () => api.post('/auth/logout'),
  refresh: () => api.post('/auth/refresh', {}),
  me: () => api.get('/auth/me'),
};

