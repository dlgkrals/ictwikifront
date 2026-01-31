import apiClient from './client';
import type { Document, DocumentSummary, DocumentCreateRequest, DocumentUpdateRequest } from '../types';

export const documentApi = {
  // 전체 문서 목록 조회
  getAll: async (): Promise<DocumentSummary[]> => {
    const response = await apiClient.get<DocumentSummary[]>('/api/documents');
    return response.data;
  },

  // 단건 조회
  getById: async (id: number): Promise<Document> => {
    const response = await apiClient.get<Document>(`/api/documents/${id}`);
    return response.data;
  },

  // 제목으로 조회
  getByTitle: async (title: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/api/documents/by-title`, {
      params: { title },
    });
    return response.data;
  },

  // 최근 수정된 문서 목록
  getRecentlyUpdated: async (limit: number = 10): Promise<DocumentSummary[]> => {
    const response = await apiClient.get<DocumentSummary[]>('/api/documents/recently-updated', {
      params: { limit },
    });
    return response.data;
  },

  // 검색
  search: async (keyword: string): Promise<DocumentSummary[]> => {
    const response = await apiClient.get<DocumentSummary[]>('/api/documents/search', {
      params: { keyword },
    });
    return response.data;
  },

  // 문서 생성
  create: async (data: DocumentCreateRequest): Promise<Document> => {
    const response = await apiClient.post<Document>('/api/documents', data);
    return response.data;
  },

  // 문서 수정
  update: async (id: number, data: DocumentUpdateRequest): Promise<Document> => {
    const response = await apiClient.put<Document>(`/api/documents/${id}`, data);
    return response.data;
  },

  // 문서 삭제 (soft delete)
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/documents/${id}`);
  },

  // 문서 복구
  restore: async (id: number): Promise<Document> => {
    const response = await apiClient.post<Document>(`/api/documents/${id}/restore`);
    return response.data;
  },

  // 수정 이력 조회
  getHistory: async (id: number): Promise<Document[]> => {
    const response = await apiClient.get<Document[]>(`/api/documents/${id}/history`);
    return response.data;
  },
};
