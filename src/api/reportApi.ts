import apiClient from './client';
import type { DailyReportResponse } from '../types';
import { generateDailyReportExcel } from '../utils/dailyReportExcel';

export const reportApi = {
  downloadDailyReport: async (date?: string): Promise<void> => {
    const response = await apiClient.get<DailyReportResponse>('/api/report/daily', {
      params: date ? { date } : undefined,
    });
    await generateDailyReportExcel(response.data);
  },
};
