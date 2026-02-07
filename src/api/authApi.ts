import apiClient, { setCsrfToken } from './client';
import type { User, LoginResponse, StaffUser } from '../types';

interface LoginRequest {
  email: string;
  password: string;
}

interface AuthResponse {
  user: LoginResponse;
  csrfToken: string;
}

export const authApi = {
  // 로그인
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password,
    } as LoginRequest);

    // CSRF 토큰 저장
    if (response.data.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }

    return response.data;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout');
    setCsrfToken('');
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

  // 비밀번호 재설정 요청
  requestPasswordReset: async (email: string): Promise<void> => {
    await apiClient.post(`/api/auth/forgot-password?email=${encodeURIComponent(email)}`);
  },

  // 비밀번호 재설정
  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/api/auth/reset-password', { token, newPassword });
  },

  // STAFF 목록 조회
  getStaffUsers: async (): Promise<StaffUser[]> => {
    const response = await apiClient.get<StaffUser[]>('/api/users/staff');
    return response.data;
  },
};
