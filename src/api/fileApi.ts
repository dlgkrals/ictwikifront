import apiClient, { API_BASE_URL } from './client';

export const fileApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    // 반환된 상대 경로에 베이스 URL 붙여 절대 URL로 변환
    return API_BASE_URL + response.data.url;
  },
};
