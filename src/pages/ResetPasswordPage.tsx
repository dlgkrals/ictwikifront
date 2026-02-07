import { useState, useEffect, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import apiClient from '../api/client';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false);
        setIsValidating(false);
        return;
      }

      try {
        const response = await apiClient.get<{ valid: boolean; message: string }>(
          `/api/auth/reset-password?token=${token}`
        );
        setIsValidToken(response.data.valid);
      } catch {
        setIsValidToken(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handlePasswordChange = (value: string) => {
    setNewPassword(value.replace(/[^\x20-\x7E]/g, ''));
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value.replace(/[^\x20-\x7E]/g, ''));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword.trim()) {
      setError('새 비밀번호를 입력해주세요.');
      return;
    }

    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token!, newPassword);
      setSuccess('비밀번호가 성공적으로 변경되었습니다.');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-header">
            <h1>ICT Wiki</h1>
            <p>토큰 확인 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !isValidToken) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-header">
            <h1>ICT Wiki</h1>
            <p>비밀번호 재설정</p>
          </div>
          <div className="reset-password-error">
            <p>유효하지 않거나 만료된 링크입니다.</p>
            <p>비밀번호 재설정을 다시 요청해주세요.</p>
          </div>
          <button
            className="btn btn-primary reset-password-btn"
            onClick={() => navigate('/')}
          >
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-header">
          <h1>ICT Wiki</h1>
          <p>새 비밀번호 설정</p>
        </div>

        <form className="reset-password-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          <div className="login-group">
            <label htmlFor="newPassword">새 비밀번호</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => handlePasswordChange(e.target.value)}
              className="login-input"
              placeholder="대소문자, 숫자, 특수문자 포함 8자 이상"
              disabled={isSubmitting || !!success}
            />
          </div>

          <div className="login-group">
            <label htmlFor="confirmPassword">비밀번호 확인</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => handleConfirmPasswordChange(e.target.value)}
              className="login-input"
              placeholder="비밀번호를 다시 입력하세요"
              disabled={isSubmitting || !!success}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary reset-password-btn"
            disabled={isSubmitting || !!success}
          >
            {isSubmitting ? '변경 중...' : '비밀번호 변경'}
          </button>

          {success && (
            <button
              type="button"
              className="btn btn-secondary reset-password-btn"
              onClick={() => navigate('/')}
            >
              로그인 화면으로 이동
            </button>
          )}
        </form>

        <div className="reset-password-footer">
          <p>서일대학교 ICT 융합대학 위키</p>
        </div>
      </div>
    </div>
  );
}
