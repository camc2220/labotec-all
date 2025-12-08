import api from './api';
import { User, LabTestService, PagedResult, CreateUserDto } from '../types';
import { API_CONFIG } from '../constants';

export const adminService = {
  // --- USERS MANAGEMENT ---
  getUsers: async (page = 1, pageSize = 20) => {
    const response = await api.get<PagedResult<User>>(API_CONFIG.endpoints.users, {
      params: { page, pageSize }
    });
    return response.data;
  },

  createUser: async (user: CreateUserDto) => {
    const response = await api.post<User>(API_CONFIG.endpoints.users, user);
    return response.data;
  },

  updateUser: async (id: string, data: Partial<User>) => {
    const response = await api.put<User>(`${API_CONFIG.endpoints.users}/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    await api.delete(`${API_CONFIG.endpoints.users}/${id}`);
  },

  // --- LAB TESTS CATALOG ---
  getLabTests: async () => {
    const response = await api.get<PagedResult<LabTestService>>(API_CONFIG.endpoints.labTests);
    return response.data;
  },

  updateLabTestPrice: async (id: string, price: number) => {
    const response = await api.patch(`${API_CONFIG.endpoints.labTests}/${id}`, { price });
    return response.data;
  },

  createLabTest: async (test: Omit<LabTestService, 'id'>) => {
    const response = await api.post<LabTestService>(API_CONFIG.endpoints.labTests, test);
    return response.data;
  }
};