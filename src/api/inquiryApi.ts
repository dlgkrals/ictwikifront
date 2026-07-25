import apiClient from './client';
import type {
  Inquiry,
  InquiryCreateRequest,
  InquiryUpdateRequest,
  InquiryStatusEnum,
  InquiryStatusOption,
  InquiryTypeEnum,
} from '../types';

export interface CursorPageResponse<T> {
  content: T[];
  nextCursor: number | null;
  hasNext: boolean;
}

interface InquiryStatistics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  onHold: number;
}

export interface InquiryStatsItem {
  label: string;
  count: number;
  percentage: number;
}

export interface InquiryDashboardStats {
  totalCount: number;
  statusCounts: Record<string, number>;
  typeCounts: InquiryStatsItem[];
  methodCounts: InquiryStatsItem[];
  buildingCounts: InquiryStatsItem[];
  avgDailyCount: number;
  avgWeeklyCount: number | null;    // 당주 모드는 null
  avgMonthlyCount: number | null;   // 연도 모드만
  currentMonthCount: number | null; // 당월/당주 모드
  currentWeekCount: number | null;  // 당주 모드만
}

export const inquiryApi = {
  // 상태 옵션 조회 (COMPLETED 제외)
  getStatusOptions: async (): Promise<InquiryStatusOption[]> => {
    const response = await apiClient.get<InquiryStatusOption[]>('/api/inquiries/status/options');
    return response.data;
  },

  // 커서 기반 페이지 조회 (무한 스크롤용)
  getPage: async (cursor?: number, size: number = 20): Promise<CursorPageResponse<Inquiry>> => {
    const response = await apiClient.get<CursorPageResponse<Inquiry>>('/api/inquiries', {
      params: { cursor, size },
    });
    return response.data;
  },

  // 전체 목록 조회 (첫 페이지)
  getAll: async (): Promise<Inquiry[]> => {
    const response = await apiClient.get<CursorPageResponse<Inquiry>>('/api/inquiries', {
      params: { size: 20 },
    });
    return response.data.content;
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
  complete: async (id: number): Promise<void> => {
    await apiClient.patch(`/api/inquiries/${id}/complete`);
  },

  // 민원 삭제
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/inquiries/${id}`);
  },

  // 대시보드 통계
  getDashboardStats: async (year?: number, month?: number, week?: number): Promise<InquiryDashboardStats> => {
    const response = await apiClient.get<InquiryDashboardStats>('/api/inquiries/stats/dashboard', {
      params: { year, month, week },
    });
    return response.data;
  },

  // 유형별 통계
  getTypeStats: async (year?: number, month?: number, week?: number): Promise<InquiryStatsItem[]> => {
    const response = await apiClient.get<InquiryStatsItem[]>('/api/inquiries/stats/by-type', {
      params: { year, month, week },
    });
    return response.data;
  },

  // 처리방식별 통계
  getMethodStats: async (year?: number, month?: number, week?: number): Promise<InquiryStatsItem[]> => {
    const response = await apiClient.get<InquiryStatsItem[]>('/api/inquiries/stats/by-method', {
      params: { year, month, week },
    });
    return response.data;
  },

  // 건물별 통계
  getBuildingStats: async (year?: number, month?: number, week?: number): Promise<InquiryStatsItem[]> => {
    const response = await apiClient.get<InquiryStatsItem[]>('/api/inquiries/stats/by-building', {
      params: { year, month, week },
    });
    return response.data;
  },

  // 상태별 통계
  getStatusStats: async (year?: number, month?: number, week?: number): Promise<InquiryStatsItem[]> => {
    const response = await apiClient.get<InquiryStatsItem[]>('/api/inquiries/stats/by-status', {
      params: { year, month, week },
    });
    return response.data;
  },

  // 월별 통계 (특정 연도)
  getMonthlyStats: async (year: number): Promise<InquiryStatsItem[]> => {
    const response = await apiClient.get<InquiryStatsItem[]>('/api/inquiries/stats/monthly-in-year', {
      params: { year },
    });
    return response.data;
  },

  // 주별 통계 (특정 연도/월)
  getWeeklyStatsInMonth: async (year: number, month: number): Promise<InquiryStatsItem[]> => {
    const response = await apiClient.get<InquiryStatsItem[]>('/api/inquiries/stats/weekly-in-month', {
      params: { year, month },
    });
    return response.data;
  },
};
