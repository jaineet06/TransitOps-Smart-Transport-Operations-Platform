import api from './axios';

export const driversApi = {
  list: (params) => api.get('/drivers', { params }),
  listAvailable: (params) => api.get('/drivers/available', { params }),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  remove: (id) => api.delete(`/drivers/${id}`),
};
