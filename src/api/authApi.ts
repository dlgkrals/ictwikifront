import apiClient, { setCsrfToken } from './client';
import type { User, LoginResponse, StaffUser } from '../types';

interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface AuthResponse {
  user: LoginResponse;
  csrfToken: string;
}

interface CsrfResponse {
  csrfToken: string;
}

export const authApi = {
  // 앱 시작 시 CSRF 토큰 선행 취득 (/api/auth/csrf-token은 인증 없이 접근 가능)
  fetchCsrfToken: async (): Promise<void> => {
    const response = await apiClient.get<CsrfResponse>('/api/auth/csrf-token');
    if (response.data.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }
  },

  // 로그인 - 성공 시 서버가 새 CSRF 토큰 반환
  login: async (email: string, password: string, rememberMe: boolean = false): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password,
      rememberMe,
    } as LoginRequest);

    // 로그인 후 갱신된 CSRF 토큰 저장
    if (response.data.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }

    return response.data;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
    setCsrfToken(null);
    // 로그아웃 후 다음 로그인을 위해 새 CSRF 토큰 취득
    try {
      const response = await apiClient.get<CsrfResponse>('/api/auth/csrf-token');
      if (response.data.csrfToken) {
        setCsrfToken(response.data.csrfToken);
      }
    } catch {
      // CSRF 토큰 갱신 실패 시 무시 (다음 로그인 시 재시도)
    }
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/auth/me');
    return response.data;
  },

  // 회원가입
  signup: async (data: {
    name: string;
    email: string;
    password: string;
    phoneNumber: string;
  }): Promise<void> => {
    await apiClient.post('/api/auth/signup', data);
  },

  // 이메일 인증
  verifyEmail: async (token: string): Promise<void> => {
    await apiClient.get(`/api/auth/verify-email?token=${token}`);
  },

  // 인증 메일 재전송
  resendVerification: async (email: string): Promise<void> => {
    await apiClient.post(`/api/auth/resend-verification?email=${encodeURIComponent(email)}`);
  },

  // 비밀번호 재설정 요청
  requestPasswordReset: async (email: string): Promise<void> => {
    await apiClient.post(`/api/auth/forgot-password?email=${encodeURIComponent(email)}`);
  },

  // 비밀번호 재설정
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/api/auth/reset-password', { token, newPassword });
  },

  // 비밀번호 변경 (로그인 상태)
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.put('/api/auth/change-password', { currentPassword, newPassword });
  },

  // STAFF 목록 조회
  getStaffUsers: async (): Promise<StaffUser[]> => {
    const response = await apiClient.get<StaffUser[]>('/api/users/staff');
    return response.data;
  },
};
