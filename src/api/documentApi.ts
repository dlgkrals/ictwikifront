import apiClient from './client';
import type { Document, DocumentSummary, DocumentCreateRequest, DocumentUpdateRequest, DocumentHistory, DocumentLink } from '../types';

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

  // 삭제된 문서 목록
  getDeletedDocuments: async (): Promise<DocumentSummary[]> => {
    const response = await apiClient.get<DocumentSummary[]>('/api/documents/deleted');
    return response.data;
  },

  // 문서 복구
  restore: async (id: number): Promise<void> => {
    await apiClient.post(`/api/documents/${id}/restore`);
  },

  // 문서 영구 삭제 (ADMIN/TA 전용)
  permanentDelete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/documents/${id}/permanent`);
  },

  // 수정 이력 전체 조회 (최신순)
  getHistories: async (id: number): Promise<DocumentHistory[]> => {
    const response = await apiClient.get<DocumentHistory[]>(`/api/documents/${id}/histories`);
    return response.data;
  },

  // 특정 버전 조회
  getHistoryByVersion: async (id: number, version: number): Promise<DocumentHistory> => {
    const response = await apiClient.get<DocumentHistory>(`/api/documents/${id}/histories/${version}`);
    return response.data;
  },

  // 최근 N개 이력
  getRecentHistories: async (id: number, limit: number = 5): Promise<DocumentHistory[]> => {
    const response = await apiClient.get<DocumentHistory[]>(`/api/documents/${id}/histories/recent`, {
      params: { limit },
    });
    return response.data;
  },

  // 이력 개수
  getHistoryCount: async (id: number): Promise<number> => {
    const response = await apiClient.get<number>(`/api/documents/${id}/histories/count`);
    return response.data;
  },

  // 역참조 (이 문서를 링크하는 문서들)
  getBacklinks: async (id: number): Promise<DocumentLink[]> => {
    const response = await apiClient.get<DocumentLink[]>(`/api/documents/${id}/backlinks`);
    return response.data;
  },

  // 나가는 링크 (이 문서가 링크하는 문서들)
  getOutlinks: async (id: number): Promise<DocumentLink[]> => {
    const response = await apiClient.get<DocumentLink[]>(`/api/documents/${id}/outlinks`);
    return response.data;
  },

  // 역참조 수
  getBacklinkCount: async (id: number): Promise<number> => {
    const response = await apiClient.get<number>(`/api/documents/${id}/backlinks/count`);
    return response.data;
  },

  // 나가는 링크 수
  getOutlinkCount: async (id: number): Promise<number> => {
    const response = await apiClient.get<number>(`/api/documents/${id}/outlinks/count`);
    return response.data;
  },

  // 내가 작성한 문서
  getMyDocuments: async (): Promise<DocumentSummary[]> => {
    const response = await apiClient.get<DocumentSummary[]>('/api/documents/my');
    return response.data;
  },
};
