import apiClient from './client';
import type { Notice, NoticeSummary, NoticeFormData } from '../types';

export const noticeApi = {
  // 전체 목록 조회
  getAll: async (): Promise<NoticeSummary[]> => {
    const response = await apiClient.get<NoticeSummary[]>('/api/notices');
    return response.data;
  },

  // 단건 조회
  getById: async (id: number): Promise<Notice> => {
    const response = await apiClient.get<Notice>(`/api/notices/${id}`);
    return response.data;
  },

  // 최근 공지사항
  getRecent: async (limit: number = 3): Promise<NoticeSummary[]> => {
    const response = await apiClient.get<NoticeSummary[]>('/api/notices/recent', {
      params: { limit },
    });
    return response.data;
  },

  // 검색
  search: async (keyword: string): Promise<NoticeSummary[]> => {
    const response = await apiClient.get<NoticeSummary[]>('/api/notices/search', {
      params: { keyword },
    });
    return response.data;
  },

  // 공지사항 생성
  create: async (data: NoticeFormData): Promise<Notice> => {
    const response = await apiClient.post<Notice>('/api/notices', data);
    return response.data;
  },

  // 공지사항 수정
  update: async (id: number, data: NoticeFormData): Promise<Notice> => {
    const response = await apiClient.put<Notice>(`/api/notices/${id}`, data);
    return response.data;
  },

  // 공지사항 삭제
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/notices/${id}`);
  },
};
