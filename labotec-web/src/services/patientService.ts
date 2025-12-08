import api from './api';
import { Appointment, LabResult, PagedResult } from '../types';

export const patientService = {
  // Get logged-in patient's appointments
  getMyAppointments: async (upcoming: boolean = false) => {
    const response = await api.get<PagedResult<Appointment>>('/api/patients/me/appointments', {
      params: { upcoming, sortDir: 'desc', sortBy: 'ScheduledAt' }
    });
    return response.data;
  },

  // Create a new appointment
  createAppointment: async (data: { patientId: string, scheduledAt: string, type: string, notes?: string }) => {
    const response = await api.post<Appointment>('/api/patients/me/appointments', data);
    return response.data;
  },

  // Get logged-in patient's results
  getMyResults: async (page = 1, pageSize = 10) => {
    const response = await api.get<PagedResult<LabResult>>('/api/patients/me/results', {
      params: { page, pageSize, sortDir: 'desc', sortBy: 'ReleasedAt' }
    });
    return response.data;
  },

  // Get PDF URL for a specific result
  getPdfUrl: async (id: string) => {
    const response = await api.get<{ url: string }>(`/api/results/${id}/pdf-url`);
    return response.data.url;
  }
};