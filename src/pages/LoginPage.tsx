import { useState, useMemo, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { useWiki } from '../context/WikiContext';
import { authApi } from '../api';

type Mode = 'login' | 'signup' | 'forgotPassword' | 'signupComplete';

const PASSWORD_RULES = [
  { test: (pw: string) => pw.length >= 8, label: '최소 8자 이상' },
  { test: (pw: string) => /[A-Z]/.test(pw), label: '대문자 1개 이상' },
  { test: (pw: string) => /[a-z]/.test(pw), label: '소문자 1개 이상' },
  { test: (pw: string) => /[0-9]/.test(pw), label: '숫자 1개 이상' },
  { test: (pw: string) => /[^A-Za-z0-9]/.test(pw), label: '특수문자 1개 이상' },
];

const STRENGTH_LEVELS = [
  { label: '매우 약함', color: '#c82333' },
  { label: '매우 약함', color: '#c82333' },
  { label: '약함', color: '#e67e22' },
  { label: '보통', color: '#f1c40f' },
  { label: '강함', color: '#7dc832' },
  { label: '매우 강함', color: '#28a745' },
];

export default function LoginPage() {
  const { login, loading, sessionExpired } = useWiki();
  const [mode, setMode] = useState<Mode>('login');

  // 로그인 state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 회원가입 state
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    name: '',
    phoneNumber: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // 회원가입 완료 - 인증 메일 재전송 state
  const [signupCompleteEmail, setSignupCompleteEmail] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCooldownTimer = useCallback(() => {
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, []);

  useEffect(() => () => clearCooldownTimer(), [clearCooldownTimer]);

  // 다른 탭에서 이메일 인증 완료 시 로그인 화면으로 전환
  useEffect(() => {
    if (mode !== 'signupComplete') return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'email-verified') {
        localStorage.removeItem('email-verified');
        switchMode('login');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [mode]);

  const startCooldown = () => {
    setResendCooldown(60);
    clearCooldownTimer();
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearCooldownTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || resendCount >= 3 || isResending) return;
    setResendMessage('');
    setResendError('');
    setIsResending(true);
    try {
      await authApi.resendVerification(signupCompleteEmail);
      setResendCount((prev) => prev + 1);
      setResendMessage('인증 메일이 재전송되었습니다.');
      startCooldown();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string; message?: string } } };
      setResendError(axiosError.response?.data?.error || axiosError.response?.data?.message || '메일 재전송에 실패했습니다.');
    } finally {
      setIsResending(false);
    }
  };

  // 비밀번호 재설정 state
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // 비밀번호 조건 충족 상태
  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => rule.test(signupData.password)),
    [signupData.password]
  );
  const metCount = passwordChecks.filter(Boolean).length;
  const strength = STRENGTH_LEVELS[metCount];

  const clearMessages = () => {
    setError('');
    setSignupError('');
    setSignupSuccess('');
    setResetError('');
    setResetSuccess('');
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    clearMessages();
    setConfirmPassword('');
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');

    if (!signupData.email.trim() || !signupData.password.trim() || !signupData.name.trim()) {
      setSignupError('이메일, 비밀번호, 이름은 필수 항목입니다.');
      return;
    }

    if (!passwordChecks.every(Boolean)) {
      const failed = PASSWORD_RULES.filter((_, i) => !passwordChecks[i]).map((r) => r.label);
      setSignupError(`비밀번호 조건 미충족: ${failed.join(', ')}`);
      return;
    }

    if (signupData.password !== confirmPassword) {
      setSignupError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSigningUp(true);
    try {
      await authApi.signup(signupData);
      setSignupCompleteEmail(signupData.email);
      setResendCount(0);
      setResendCooldown(0);
      setResendMessage('');
      setResendError('');
      clearCooldownTimer();
      setSignupData({ email: '', password: '', name: '', phoneNumber: '' });
      setConfirmPassword('');
      setMode('signupComplete');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: Record<string, string> } };
      const data = axiosError.response?.data;
      if (data) {
        // {error: "..."} 또는 {fieldName: "메시지", ...} 형태 모두 대응
        const messages = Object.values(data).filter(Boolean);
        setSignupError(messages.join('\n') || '회원가입 중 오류가 발생했습니다.');
      } else {
        setSignupError('회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetEmail.trim()) {
      setResetError('이메일을 입력해주세요.');
      return;
    }

    setIsResetting(true);
    try {
      await authApi.requestPasswordReset(resetEmail);
      setResetSuccess('비밀번호 재설정 메일이 발송되었습니다. 이메일을 확인해주세요.');
      setResetEmail('');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setResetError(axiosError.response?.data?.message || '요청 중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  const formatPhone = (digits: string): string => {
    if (digits.startsWith('02')) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const handleSignupChange = (field: string, value: string) => {
    if (field === 'phoneNumber') {
      value = value.replace(/\D/g, '');
      const maxLen = value.startsWith('02') ? 10 : 11;
      value = value.slice(0, maxLen);
    }
    if (field === 'password') {
      value = value.replace(/[^\x20-\x7E]/g, '');
    }
    setSignupData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value.replace(/[^\x20-\x7E]/g, ''));
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-header">
            <h1>ICT Wiki</h1>
            <p>로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  const headerText: Record<Mode, string> = {
    login: '로그인이 필요합니다',
    signup: '회원가입',
    signupComplete: '회원가입 완료',
    forgotPassword: '비밀번호 재설정',
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>ICT Wiki</h1>
          <p>{headerText[mode]}</p>
        </div>

        {mode === 'signup' && (
          <form className="login-form" onSubmit={handleSignup}>
            {signupError && <div className="login-error">{signupError}</div>}
            {signupSuccess && <div className="login-success">{signupSuccess}</div>}
            <div className="login-group">
              <label htmlFor="signupEmail">이메일 *</label>
              <input
                type="email"
                id="signupEmail"
                value={signupData.email}
                onChange={(e) => handleSignupChange('email', e.target.value)}
                className="login-input"
                placeholder="이메일을 입력하세요"
                disabled={isSigningUp}
              />
            </div>
            <div className="login-group">
              <label htmlFor="signupPassword">비밀번호 *</label>
              <input
                type="password"
                id="signupPassword"
                value={signupData.password}
                onChange={(e) => handleSignupChange('password', e.target.value)}
                className="login-input"
                placeholder="비밀번호를 입력하세요"
                disabled={isSigningUp}
              />
              {signupData.password && (
                <>
                  <div className="password-requirements">
                    {PASSWORD_RULES.map((rule, i) => (
                      <div key={i} className={`requirement-item ${passwordChecks[i] ? 'requirement-met' : 'requirement-unmet'}`}>
                        <span className="requirement-icon">{passwordChecks[i] ? '\u2713' : '\u2717'}</span>
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="password-strength">
                    <div className="password-strength-bar">
                      <div
                        className="password-strength-fill"
                        style={{ width: `${(metCount / 5) * 100}%`, backgroundColor: strength.color }}
                      />
                    </div>
                    <span className="password-strength-label" style={{ color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="login-group">
              <label htmlFor="signupConfirmPassword">비밀번호 확인 *</label>
              <input
                type="password"
                id="signupConfirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value.replace(/[^\x20-\x7E]/g, ''))}
                className="login-input"
                placeholder="비밀번호를 다시 입력하세요"
                disabled={isSigningUp}
              />
              {confirmPassword && signupData.password !== confirmPassword && (
                <div className="password-mismatch">비밀번호가 일치하지 않습니다.</div>
              )}
            </div>
            <div className="login-group">
              <label htmlFor="signupName">이름 *</label>
              <input
                type="text"
                id="signupName"
                value={signupData.name}
                onChange={(e) => handleSignupChange('name', e.target.value)}
                className="login-input"
                placeholder="이름을 입력하세요"
                disabled={isSigningUp}
              />
            </div>
            <div className="login-group">
              <label htmlFor="signupPhone">전화번호</label>
              <input
                type="text"
                id="signupPhone"
                value={formatPhone(signupData.phoneNumber)}
                onChange={(e) => handleSignupChange('phoneNumber', e.target.value)}
                className="login-input"
                placeholder="010-1234-5678"
                disabled={isSigningUp}
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={isSigningUp}>
              {isSigningUp ? '가입 중...' : '회원가입'}
            </button>
            <button type="button" className="btn btn-secondary login-btn" onClick={() => switchMode('login')}>
              로그인으로 돌아가기
            </button>
          </form>
        )}

        {mode === 'signupComplete' && (
          <div className="login-form">
            <div className="login-success">
              회원가입이 완료되었습니다.<br />
              <strong>{signupCompleteEmail}</strong>으로 인증 메일이 발송되었습니다.<br />
              이메일을 확인하여 인증을 완료해주세요.
            </div>
            {resendMessage && <div className="login-success">{resendMessage}</div>}
            {resendError && <div className="login-error">{resendError}</div>}
            <p style={{ fontSize: '13px', color: '#54595d', textAlign: 'center', margin: '12px 0' }}>
              메일이 도착하지 않았나요? 인증 메일을 재전송할 수 있습니다. ({resendCount}/3)
            </p>
            <button
              type="button"
              className="btn btn-primary login-btn"
              disabled={resendCooldown > 0 || resendCount >= 3 || isResending}
              onClick={handleResendVerification}
            >
              {isResending
                ? '재전송 중...'
                : resendCount >= 3
                  ? '재전송 횟수 초과'
                  : resendCooldown > 0
                    ? `재전송 대기 (${resendCooldown}초)`
                    : '인증 메일 재전송'}
            </button>
            <button type="button" className="btn btn-secondary login-btn" onClick={() => switchMode('login')}>
              로그인으로 이동
            </button>
          </div>
        )}

        {mode === 'forgotPassword' && (
          <form className="login-form" onSubmit={handleForgotPassword}>
            {resetError && <div className="login-error">{resetError}</div>}
            {resetSuccess && <div className="login-success">{resetSuccess}</div>}
            <div className="login-group">
              <label htmlFor="resetEmail">이메일</label>
              <input
                type="email"
                id="resetEmail"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="login-input"
                placeholder="이메일을 입력하세요"
                disabled={isResetting}
              />
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={isResetting}>
              {isResetting ? '발송 중...' : '재설정 메일 발송'}
            </button>
            <button type="button" className="btn btn-secondary login-btn" onClick={() => switchMode('login')}>
              로그인으로 돌아가기
            </button>
          </form>
        )}

        {mode === 'login' && (
          <form className="login-form" onSubmit={handleLogin}>
            {sessionExpired && (
              <div className="session-expired-message">세션이 만료되어 로그아웃 되었습니다.</div>
            )}
            {error && <div className="login-error">{error}</div>}
            <div className="login-group">
              <label htmlFor="email">이메일</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="이메일을 입력하세요"
                disabled={isLoggingIn}
              />
            </div>
            <div className="login-group">
              <label htmlFor="password">비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className="login-input"
                placeholder="비밀번호를 입력하세요"
                disabled={isLoggingIn}
              />
            </div>
            <div className="login-links">
              <button type="button" className="link-button" onClick={() => switchMode('forgotPassword')}>
                비밀번호를 잊으셨나요?
              </button>
            </div>
            <button type="submit" className="btn btn-primary login-btn" disabled={isLoggingIn}>
              {isLoggingIn ? '로그인 중...' : '로그인'}
            </button>
            <button type="button" className="btn btn-secondary login-btn" onClick={() => switchMode('signup')}>
              회원가입
            </button>
          </form>
        )}

        <div className="login-footer">
          <p>서일대학교 ICT지원실</p>
        </div>
      </div>
    </div>
  );
}
