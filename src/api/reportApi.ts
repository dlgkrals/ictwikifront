import apiClient from './client';

export const reportApi = {
  downloadDailyReport: async (date?: string): Promise<void> => {
    const response = await apiClient.get('/api/report/daily', {
      params: date ? { date } : undefined,
      responseType: 'blob',
    });

    const contentDisposition = response.headers['content-disposition'] as string | undefined;
    let filename = '업무일지.xls';
    if (contentDisposition) {
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (utf8Match) {
        filename = decodeURIComponent(utf8Match[1]);
      } else {
        const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (plainMatch) filename = plainMatch[1];
      }
    }

    const url = URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
