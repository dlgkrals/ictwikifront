import axios from 'axios';

const API_BASE_URL = 'https://api.ictwiki.site';

// Axios instance 생성
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // 세션 쿠키 포함
  headers: {
    'Content-Type': 'application/json',
  },
});

// CSRF 토큰 저장
let csrfToken: string | null = null;

export const setCsrfToken = (token: string) => {
  csrfToken = token;
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
      // 인증 실패 - 로그인 페이지로 리다이렉트 처리는 컴포넌트에서
      console.error('Authentication failed');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
