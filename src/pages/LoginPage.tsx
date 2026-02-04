import { useState, type FormEvent } from 'react';
import { useWiki } from '../context/WikiContext';
import { authApi } from '../api';

type Mode = 'login' | 'signup' | 'forgotPassword';

export default function LoginPage() {
  const { login, loading } = useWiki();
  const [mode, setMode] = useState<Mode>('login');

  // 로그인 state
  const [emailPrefix, setEmailPrefix] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 회원가입 state
  const [signupData, setSignupData] = useState({
    emailPrefix: '',
    password: '',
    name: '',
    phoneNumber: '',
  });
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // 비밀번호 재설정 state
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetting, setIsResetting] = useState(false);

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
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!emailPrefix.trim() || !password.trim()) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoggingIn(true);
    try {
      const success = await login(emailPrefix, password);
      if (!success) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSignupError('');
    setSignupSuccess('');

    if (!signupData.emailPrefix.trim() || !signupData.password.trim() || !signupData.name.trim()) {
      setSignupError('이메일, 비밀번호, 이름은 필수 항목입니다.');
      return;
    }

    if (signupData.phoneNumber && !/^\d+$/.test(signupData.phoneNumber)) {
      setSignupError('전화번호는 숫자만 입력해주세요.');
      return;
    }

    setIsSigningUp(true);
    try {
      await authApi.signup(signupData);
      setSignupSuccess('회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.');
      setSignupData({ emailPrefix: '', password: '', name: '', phoneNumber: '' });
      setTimeout(() => {
        switchMode('login');
      }, 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setSignupError(axiosError.response?.data?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!resetEmail.trim()) {
      setResetError('이메일 앞자리를 입력해주세요.');
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

  const handleSignupChange = (field: string, value: string) => {
    if (field === 'phoneNumber') {
      value = value.replace(/\D/g, '');
    }
    setSignupData((prev) => ({ ...prev, [field]: value }));
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

  const headerText = {
    login: '로그인이 필요합니다',
    signup: '회원가입',
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
              <label htmlFor="signupEmail">학교 이메일 *</label>
              <div className="email-input-wrapper">
                <input
                  type="text"
                  id="signupEmail"
                  value={signupData.emailPrefix}
                  onChange={(e) => handleSignupChange('emailPrefix', e.target.value)}
                  className="login-input email-prefix"
                  placeholder="이메일 앞자리"
                  disabled={isSigningUp}
                />
                <span className="email-suffix">@g.seoil.ac.kr</span>
              </div>
            </div>
            <div className="login-group">
              <label htmlFor="signupPassword">비밀번호 *</label>
              <input
                type="password"
                id="signupPassword"
                value={signupData.password}
                onChange={(e) => handleSignupChange('password', e.target.value)}
                className="login-input"
                placeholder="대소문자, 숫자, 특수문자 포함 8자 이상"
                disabled={isSigningUp}
              />
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
                value={signupData.phoneNumber}
                onChange={(e) => handleSignupChange('phoneNumber', e.target.value)}
                className="login-input"
                placeholder="01012345678"
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

        {mode === 'forgotPassword' && (
          <form className="login-form" onSubmit={handleForgotPassword}>
            {resetError && <div className="login-error">{resetError}</div>}
            {resetSuccess && <div className="login-success">{resetSuccess}</div>}
            <div className="login-group">
              <label htmlFor="resetEmail">학교 이메일</label>
              <div className="email-input-wrapper">
                <input
                  type="text"
                  id="resetEmail"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="login-input email-prefix"
                  placeholder="이메일 앞자리"
                  disabled={isResetting}
                />
                <span className="email-suffix">@g.seoil.ac.kr</span>
              </div>
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
            {error && <div className="login-error">{error}</div>}
            <div className="login-group">
              <label htmlFor="emailPrefix">학교 이메일</label>
              <div className="email-input-wrapper">
                <input
                  type="text"
                  id="emailPrefix"
                  value={emailPrefix}
                  onChange={(e) => setEmailPrefix(e.target.value)}
                  className="login-input email-prefix"
                  placeholder="이메일 앞자리"
                  disabled={isLoggingIn}
                />
                <span className="email-suffix">@g.seoil.ac.kr</span>
              </div>
            </div>
            <div className="login-group">
              <label htmlFor="password">비밀번호</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          <p>서일대학교 ICT 융합대학 위키</p>
        </div>
      </div>
    </div>
  );
}
