import apiClient from './client';
import type {
  Inquiry,
  InquiryCreateRequest,
  InquiryUpdateRequest,
  InquiryStatusEnum,
  InquiryTypeEnum,
} from '../types';

interface InquiryStatistics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  onHold: number;
}

export const inquiryApi = {
  // 전체 목록 조회
  getAll: async (): Promise<Inquiry[]> => {
    const response = await apiClient.get<Inquiry[]>('/api/inquiries');
    return response.data;
  },

  // 단건 조회
  getById: async (id: number): Promise<Inquiry> => {
    const response = await apiClient.get<Inquiry>(`/api/inquiries/${id}`);
    return response.data;
  },

  // 최근 민원 목록
  getRecent: async (limit: number = 10): Promise<Inquiry[]> => {
    const response = await apiClient.get<Inquiry[]>('/api/inquiries/recent', {
      params: { limit },
    });
    return response.data;
  },

  // 상태별 조회
  getByStatus: async (status: InquiryStatusEnum): Promise<Inquiry[]> => {
    const response = await apiClient.get<Inquiry[]>('/api/inquiries/by-status', {
      params: { status },
    });
    return response.data;
  },

  // 유형별 조회
  getByType: async (type: InquiryTypeEnum): Promise<Inquiry[]> => {
    const response = await apiClient.get<Inquiry[]>('/api/inquiries/by-type', {
      params: { type },
    });
    return response.data;
  },

  // 내가 담당한 민원 목록
  getMyAssigned: async (): Promise<Inquiry[]> => {
    const response = await apiClient.get<Inquiry[]>('/api/inquiries/my-assigned');
    return response.data;
  },

  // 검색
  search: async (keyword: string): Promise<Inquiry[]> => {
    const response = await apiClient.get<Inquiry[]>('/api/inquiries/search', {
      params: { keyword },
    });
    return response.data;
  },

  // 통계
  getStatistics: async (): Promise<InquiryStatistics> => {
    const response = await apiClient.get<InquiryStatistics>('/api/inquiries/statistics');
    return response.data;
  },

  // 민원 생성
  create: async (data: InquiryCreateRequest): Promise<Inquiry> => {
    const response = await apiClient.post<Inquiry>('/api/inquiries', data);
    return response.data;
  },

  // 민원 수정
  update: async (id: number, data: InquiryUpdateRequest): Promise<Inquiry> => {
    const response = await apiClient.put<Inquiry>(`/api/inquiries/${id}`, data);
    return response.data;
  },

  // 담당자 배정
  assignWorker: async (id: number, workerId: number): Promise<Inquiry> => {
    const response = await apiClient.patch<Inquiry>(`/api/inquiries/${id}/assign`, {
      workerId,
    });
    return response.data;
  },

  // 상태 변경
  updateStatus: async (id: number, status: InquiryStatusEnum): Promise<Inquiry> => {
    const response = await apiClient.patch<Inquiry>(`/api/inquiries/${id}/status`, {
      status,
    });
    return response.data;
  },

  // 민원 완료 처리
  complete: async (id: number, solution: string): Promise<Inquiry> => {
    const response = await apiClient.patch<Inquiry>(`/api/inquiries/${id}/complete`, {
      solution,
    });
    return response.data;
  },

  // 민원 삭제
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/inquiries/${id}`);
  },
};
