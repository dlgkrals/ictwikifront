import axios from 'axios';

// const API_BASE_URL = 'https://api.ictwiki.site';

const API_BASE_URL = 'http://localhost:8080';

// Axios instance 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 세션 쿠키 포함
  headers: {
    'Content-Type': 'application/json',
  },
});

// CSRF 토큰 저장 (sessionStorage로 새로고침 후에도 유지)
let csrfToken: string | null = sessionStorage.getItem('csrfToken');

export const setCsrfToken = (token: string) => {
  csrfToken = token || null;
  if (token) {
    sessionStorage.setItem('csrfToken', token);
  } else {
    sessionStorage.removeItem('csrfToken');
  }
};

export const getCsrfToken = () => csrfToken;

// Request interceptor - CSRF 토큰 추가
apiClient.interceptors.request.use(
  (config) => {
    if (csrfToken && ['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
      config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // 로그인 요청의 401은 세션 만료가 아님
      if (!url.includes('/api/auth/login')) {
        window.dispatchEvent(new CustomEvent('session-expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
