import apiClient from './client';
import type { AdminUser, AdminUserStats, UserRole } from '../types';

export const adminApi = {
  // 전체 회원 목록
  getAllUsers: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>('/api/admin/users');
    return response.data;
  },

  // 승인 대기 회원 목록
  getPendingUsers: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>('/api/admin/users/pending');
    return response.data;
  },

  // 특정 회원 조회
  getUser: async (userId: number): Promise<AdminUser> => {
    const response = await apiClient.get<AdminUser>(`/api/admin/users/${userId}`);
    return response.data;
  },

  // 회원 승인
  approveUser: async (userId: number): Promise<void> => {
    await apiClient.post(`/api/admin/users/${userId}/approve`);
  },

  // 회원 승인 거부
  rejectUser: async (userId: number): Promise<void> => {
    await apiClient.post(`/api/admin/users/${userId}/reject`);
  },

  // 계정 활성화
  activateUser: async (userId: number): Promise<void> => {
    await apiClient.post(`/api/admin/users/${userId}/activate`);
  },

  // 계정 비활성화
  deactivateUser: async (userId: number): Promise<void> => {
    await apiClient.post(`/api/admin/users/${userId}/deactivate`);
  },

  // 비밀번호 강제 변경
  changePassword: async (userId: number, newPassword: string): Promise<void> => {
    await apiClient.put(`/api/admin/users/${userId}/password`, { newPassword });
  },

  // 권한 변경
  changeRole: async (userId: number, role: UserRole): Promise<void> => {
    await apiClient.put(`/api/admin/users/${userId}/role`, null, { params: { role } });
  },

  // 회원 삭제
  deleteUser: async (userId: number): Promise<void> => {
    await apiClient.delete(`/api/admin/users/${userId}`);
  },

  // 회원 통계
  getStats: async (): Promise<AdminUserStats> => {
    const response = await apiClient.get<AdminUserStats>('/api/admin/users/stats');
    return response.data;
  },
};
