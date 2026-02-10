import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setError('유효하지 않은 인증 링크입니다.');
        setLoading(false);
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setSuccess(true);
        localStorage.setItem('email-verified', Date.now().toString());
        setTimeout(() => navigate('/'), 5000);
      } catch (err) {
        const axiosError = err as { response?: { data?: { error?: string; message?: string } } };
        setError(axiosError.response?.data?.error || axiosError.response?.data?.message || '이메일 인증에 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-header">
          <h1>ICT Wiki</h1>
          <p>이메일 인증</p>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#54595d' }}>인증 처리 중...</p>}

        {success && (
          <>
            <div className="login-success">이메일 인증이 완료되었습니다. 5초 후 로그인 페이지로 이동합니다.</div>
            <button
              className="btn btn-primary reset-password-btn"
              onClick={() => navigate('/')}
            >
              로그인 페이지로 이동
            </button>
          </>
        )}

        {error && (
          <>
            <div className="reset-password-error">
              <p>{error}</p>
            </div>
            <button
              className="btn btn-primary reset-password-btn"
              onClick={() => navigate('/')}
            >
              로그인 페이지로 이동
            </button>
          </>
        )}

        <div className="reset-password-footer">
          <p>서일대학교 ICT지원실</p>
        </div>
      </div>
    </div>
  );
}
