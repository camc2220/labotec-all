import api from './api';
import { Appointment, Invoice, LabOrder, LabTestService, PagedResult, User, CreatePatientDto, CreateLabOrderDto, AppointmentParams, InvoiceParams, LabResult, CreateLabResultDto } from '../types';
import { API_CONFIG } from '../constants';

export const staffService = {
  // --- APPOINTMENTS ---
  getAppointments: async (params: AppointmentParams) => {
    const response = await api.get<PagedResult<Appointment>>(API_CONFIG.endpoints.appointments, { params });
    return response.data;
  },

  checkInPatient: async (appointmentId: string) => {
    // Backend uses generic Update, but lets assume we update status to CheckedIn
    const response = await api.put(`${API_CONFIG.endpoints.appointments}/${appointmentId}`, { 
        status: 'CheckedIn', 
        type: 'Laboratorio', // Required by DTO
        scheduledAt: new Date().toISOString() // Keep existing in real app, simplified here
    });
    return response.data;
  },

  updateAppointmentStatus: async (id: string, status: string, currentData: any) => {
      const response = await api.put(`${API_CONFIG.endpoints.appointments}/${id}`, {
          status,
          type: currentData.type,
          scheduledAt: currentData.scheduledAt,
          notes: currentData.notes
      });
      return response.data;
  },

  // --- PATIENTS ---
  searchPatients: async (query: string) => {
    const response = await api.get<PagedResult<User>>(API_CONFIG.endpoints.patients, {
      params: { q: query } // Backend uses 'q' param
    });
    return response.data;
  },

  registerPatient: async (data: CreatePatientDto) => {
    const response = await api.post(API_CONFIG.endpoints.patients, data);
    return response.data;
  },

  createUserForPatient: async (patientId: string) => {
      // Hits the specific endpoint: POST /api/patients/{id}/create-user
      const response = await api.post(`${API_CONFIG.endpoints.patients}/${patientId}/create-user`);
      return response.data;
  },

  // --- LAB ORDERS (Full CRUD) ---
  getLabOrders: async (patientId?: string, status?: string, page = 1) => {
      const response = await api.get<PagedResult<LabOrder>>(API_CONFIG.endpoints.labOrders, {
          params: { patientId, status, page, sortDir: 'desc', sortBy: 'CreatedAt' }
      });
      return response.data;
  },

  createLabOrder: async (data: CreateLabOrderDto) => {
      const response = await api.post<LabOrder>(API_CONFIG.endpoints.labOrders, data);
      return response.data;
  },

  updateLabOrderStatus: async (id: string, status: string) => {
      await api.put(`${API_CONFIG.endpoints.labOrders}/${id}/status`, { status });
  },

  getActiveTests: async (q?: string) => {
      const response = await api.get<PagedResult<LabTestService>>(API_CONFIG.endpoints.labTests, {
          params: { active: true, q, pageSize: 100 }
      });
      return response.data;
  },

  // --- RESULTS & PDF UPLOAD ---
  getResults: async (params: {patientId?: string, test?: string, from?: string, page?: number, pageSize?: number}) => {
      const response = await api.get<PagedResult<LabResult>>(API_CONFIG.endpoints.results, { params });
      return response.data;
  },

  uploadResultPdf: async (resultId: string, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`${API_CONFIG.endpoints.results}/${resultId}/pdf`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
  },

  createResult: async (data: CreateLabResultDto) => {
      const response = await api.post<LabResult>(API_CONFIG.endpoints.results, data);
      return response.data;
  },

  // --- INVOICING & REPORTS ---
  getInvoices: async (params: InvoiceParams) => {
    const response = await api.get<PagedResult<Invoice>>(API_CONFIG.endpoints.invoices, { params });
    return response.data;
  },

  downloadInvoicesReport: async (params: InvoiceParams) => {
      // Consumes /api/invoices/print endpoint
      const response = await api.get(`${API_CONFIG.endpoints.invoices}/print`, { 
          params, 
          responseType: 'blob' 
      });
      return response.data; // Blob
  },

  createInvoice: async (data: any) => {
    const response = await api.post<Invoice>(API_CONFIG.endpoints.invoices, data);
    return response.data;
  },

  markInvoicePaid: async (invoiceId: string, currentData: Invoice) => {
      // Backend expects full update DTO
      const response = await api.put(`${API_CONFIG.endpoints.invoices}/${invoiceId}`, {
          number: currentData.number,
          amount: currentData.amount,
          issuedAt: currentData.issuedAt,
          paid: true
      });
      return response.data;
  },
};