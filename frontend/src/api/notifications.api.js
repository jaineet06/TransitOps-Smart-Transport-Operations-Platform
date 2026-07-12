import api from './axios';

export const notificationsApi = {
  getNotifications: () => api.get('/notifications'),
  sendLicenseReminders: (data) => api.post('/notifications/license-reminders/send', data),
};
