import apiClient from './client';
import type { SimilarCaseResult } from '../types';

export const ragApi = {
  getSimilarCases: async (inquiryId: number): Promise<SimilarCaseResult> => {
    const response = await apiClient.get<SimilarCaseResult>(`/api/rag/similar/${inquiryId}`);
    return response.data;
  },
};
