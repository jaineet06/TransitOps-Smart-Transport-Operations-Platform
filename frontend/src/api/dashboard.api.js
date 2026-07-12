import api from './axios';

export const dashboardApi = {
  getKpis: () => api.get('/dashboard/kpis'),
};
