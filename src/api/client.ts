import axios from 'axios';

// const API_BASE_URL = 'https://api.ictwiki.site';

const API_BASE_URL = 'http://localhost:8080';

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
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    if (status === 401) {
      // 로그인 요청의 401은 세션 만료가 아님
      if (!url.includes('/api/auth/login')) {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    } else if (status === 403) {
      // 로그인 요청의 403은 CSRF 오류일 수 있으므로 access-denied 이벤트 제외
      if (!url.includes('/api/auth/login')) {
        window.dispatchEvent(new CustomEvent('access-denied'));
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
