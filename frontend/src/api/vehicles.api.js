import api from './axios';

export const vehiclesApi = {
  list: (params) => api.get('/vehicles', { params }),
  listAvailable: (params) => api.get('/vehicles/available', { params }),
  getById: (id) => api.get(`/vehicles/${id}`),
  getTotalCost: (id) => api.get(`/vehicles/${id}/total-cost`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  remove: (id) => api.delete(`/vehicles/${id}`),
};
