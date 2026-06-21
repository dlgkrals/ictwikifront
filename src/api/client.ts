import axios from 'axios';

export const API_BASE_URL = 'https://api.ictwiki.site';

// 메모리 내 CSRF 토큰 관리 (크로스 오리진에서 쿠키 접근 불가 → 응답 바디로 수신)
let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

// Request interceptor - 변경 요청에 X-XSRF-TOKEN 헤더 추가
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isLoginUrl = url.includes('/api/auth/login');

    if (status === 403 && isLoginUrl && !error.config._csrfRetried) {
      // 로그인 403은 CSRF 토큰 만료일 수 있음 → 토큰 갱신 후 1회 재시도
      error.config._csrfRetried = true;
      try {
        const tokenRes = await apiClient.get<{ csrfToken: string }>('/api/auth/csrf-token');
        if (tokenRes.data.csrfToken) {
          setCsrfToken(tokenRes.data.csrfToken);
          error.config.headers['X-XSRF-TOKEN'] = tokenRes.data.csrfToken;
        }
        return apiClient(error.config);
      } catch {
        // 재시도 실패 시 원래 에러 그대로 전달
      }
    }

    if (status === 401) {
      if (!isLoginUrl) {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    } else if (status === 403) {
        if (!isLoginUrl) {
            const msg = error.response?.data?.message;
            if (typeof msg === 'string' && msg.includes('데모 계정은 읽기 전용')) {
                window.dispatchEvent(new CustomEvent('demo-readonly', { detail: msg }));
            } else {
                window.dispatchEvent(new CustomEvent('access-denied'));
            }
        }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
