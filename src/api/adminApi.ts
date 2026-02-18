import apiClient from './client';
import type { AdminUser } from '../types';

export const adminApi = {
  // 전체 회원 목록
  getAllUsers: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>('/api/admin/users');
    return response.data;
  },

  // 회원 승인 (PUT)
  approveUser: async (userId: number): Promise<void> => {
    await apiClient.put(`/api/admin/users/${userId}/approve`);
  },

  // 계정 활성화 (PUT)
  activateUser: async (userId: number): Promise<void> => {
    await apiClient.put(`/api/admin/users/${userId}/activate`);
  },

  // 계정 비활성화 (PUT)
  deactivateUser: async (userId: number): Promise<void> => {
    await apiClient.put(`/api/admin/users/${userId}/deactivate`);
  },

  // 회원 삭제
  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete(`/api/admin/users/${userId}`);
  },
};
