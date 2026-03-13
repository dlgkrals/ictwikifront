import apiClient from './client';
import type { AdminUser, UserRole, RoleOption, BatchEmbedResult } from '../types';

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

  // 비밀번호 강제 변경
  changePassword: async (userId: number, password: string): Promise<void> => {
    await apiClient.put(`/api/admin/users/${userId}/password`, { password });
  },

  // 역할 변경
  changeRole: async (userId: number, role: UserRole): Promise<void> => {
    await apiClient.put(`/api/admin/users/${userId}/role`, { role });
  },

  // 역할 목록 조회
  getRoles: async (): Promise<RoleOption[]> => {
    const response = await apiClient.get<RoleOption[]>('/api/admin/users/roles');
    return response.data;
  },

  // RAG 배치 임베딩
  embedAll: async (): Promise<BatchEmbedResult> => {
    const response = await apiClient.post<BatchEmbedResult>('/api/rag/batch/embed');
    return response.data;
  },
};
