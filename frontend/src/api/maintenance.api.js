import api from './axios';

export const maintenanceApi = {
  list: (params) => api.get('/maintenance', { params }),
  getById: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance', data),
  close: (id) => api.patch(`/maintenance/${id}/close`),
};
